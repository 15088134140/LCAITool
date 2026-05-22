"""
Celery 任务定义
实现通用工具执行任务、进度回调、状态更新等
"""
import asyncio
import json
import logging
import os
import time
import uuid
from typing import Dict, Any, Optional
from celery import Task
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker, Session
import redis

from app.core.config import settings

logger = logging.getLogger(__name__)
from app.executors import (
    BaseToolExecutor,
    StorybookExecutor,
    EcommerceExecutor,
    MarketingExecutor,
)
from app.services.task_service import TaskService
from app.workers.celery_app import celery_app

# 延迟创建同步数据库引擎（Celery 是同步执行的）
# 延迟初始化以避免测试导入时的数据库连接问题
_sync_engine = None
_SyncSessionLocal = None
_redis_client = None


def _get_sync_engine():
    global _sync_engine
    if _sync_engine is None:
        db_url = settings.DATABASE_URL
        # SQLite doesn't use asyncpg, so no need to replace
        if "+asyncpg" in db_url:
            db_url = db_url.replace("+asyncpg", "")
        _sync_engine = create_engine(
            db_url,
            echo=settings.DEBUG,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20
        )
    return _sync_engine


def _get_sync_session():
    global _SyncSessionLocal
    if _SyncSessionLocal is None:
        _SyncSessionLocal = sessionmaker(
            bind=_get_sync_engine(),
            expire_on_commit=False,
            class_=Session
        )
    return _SyncSessionLocal()


def _get_redis_client():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(settings.REDIS_URL)
    return _redis_client

# 执行器映射
EXECUTOR_MAP: Dict[str, type[BaseToolExecutor]] = {
    'storybook': StorybookExecutor,
    'ecommerce': EcommerceExecutor,
    'marketing': MarketingExecutor,
}


class AsyncProgressCallback:
    """异步进度回调类，用于在执行器执行过程中更新进度和发布消息"""

    def __init__(self, task_id: uuid.UUID):
        """
        初始化进度回调
        :param task_id: 任务ID
        """
        self.task_id = task_id

    async def __call__(self, percent: int, message: str, data: Optional[Dict[str, Any]] = None) -> None:
        """
        更新进度并发布消息
        :param percent: 进度百分比 0-100
        :param message: 进度消息
        :param data: 附加数据
        """
        # 发布 Redis Pub/Sub 消息（不需要等待数据库更新，因为执行器已经调用了 update_progress）
        self._publish_progress_message(percent, message, data)

    def _publish_progress_message(
        self,
        percent: int,
        message: str,
        data: Optional[Dict[str, Any]] = None
    ) -> None:
        """发布进度消息到 Redis Pub/Sub"""
        channel = f"task:{self.task_id}:status"
        payload = {
            'type': 'progress',
            'task_id': str(self.task_id),
            'progress': percent,
            'message': message,
            'data': data or {},
            'timestamp': int(time.time())
        }
        _get_redis_client().publish(channel, json.dumps(payload, ensure_ascii=False))


class ProgressCallback:
    """同步进度回调类（保留向后兼容）"""

    def __init__(self, task_id: uuid.UUID, sync_session: Session):
        self.task_id = task_id
        self.sync_session = sync_session

    def __call__(self, percent: int, message: str, data: Optional[Dict[str, Any]] = None) -> None:
        asyncio.run(self._async_call(percent, message, data))

    async def _async_call(self, percent: int, message: str, data: Optional[Dict[str, Any]] = None) -> None:
        callback = AsyncProgressCallback(self.task_id)
        await callback(percent, message, data)


def publish_task_message(
    task_id: uuid.UUID,
    msg_type: str,
    message: str = "",
    data: Optional[Dict[str, Any]] = None,
    progress: int = 0
) -> None:
    """
    发布任务状态消息到 Redis Pub/Sub

    :param task_id: 任务ID
    :param msg_type: 消息类型: status, progress, completed, failed, retry
    :param message: 消息内容
    :param data: 附加数据
    :param progress: 进度百分比
    """
    channel = f"task:{task_id}:status"
    payload = {
        'type': msg_type,
        'task_id': str(task_id),
        'progress': progress,
        'message': message,
        'data': data or {},
        'timestamp': int(time.time())
    }
    _get_redis_client().publish(channel, json.dumps(payload, ensure_ascii=False))


class ToolTask(Task):
    """自定义任务基类，用于处理任务的生命周期"""

    def on_success(self, retval, task_id, args, kwargs):
        """任务成功时的回调"""
        pass

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """任务失败时的回调"""
        task_uuid = uuid.UUID(args[0]) if args else None
        if task_uuid:
            publish_task_message(
                task_id=task_uuid,
                msg_type='failed',
                message=f"任务执行失败: {str(exc)}",
                data={'error_type': type(exc).__name__, 'error_trace': str(einfo)}
            )

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """任务重试时的回调"""
        task_uuid = uuid.UUID(args[0]) if args else None
        if task_uuid:
            publish_task_message(
                task_id=task_uuid,
                msg_type='retry',
                message=f"任务重试中... 原因: {str(exc)}",
                data={
                    'retry_count': self.request.retries,
                    'max_retries': self.max_retries,
                    'error_type': type(exc).__name__
                }
            )


@celery_app.task(
    base=ToolTask,
    bind=True,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    queue='medium'
)
def execute_tool_task(
    self,
    task_id: str,
    tool_type: str,
    input_params: Dict[str, Any]
) -> Dict[str, Any]:
    """
    执行工具任务

    :param task_id: 任务ID (UUID字符串)
    :param tool_type: 工具类型 (storybook, ecommerce, etc.)
    :param input_params: 输入参数
    :return: 执行结果
    """
    task_uuid = uuid.UUID(task_id)

    # 发布任务开始消息
    publish_task_message(
        task_id=task_uuid,
        msg_type='status',
        message='任务开始执行',
        progress=0
    )

    try:
        # 更新任务状态为 running
        asyncio.run(_update_task_status_to_running(task_uuid))
        publish_task_message(
            task_id=task_uuid,
            msg_type='status',
            message='任务正在执行',
            progress=0
        )

        # 获取执行器类
        executor_class = EXECUTOR_MAP.get(tool_type)
        if not executor_class:
            raise ValueError(f"不支持的工具类型: {tool_type}")

        # 创建异步数据库会话供执行器使用
        result = asyncio.run(_execute_with_async_session(
            executor_class=executor_class,
            task_uuid=task_uuid,
            input_params=input_params
        ))

        # 发布完成消息
        publish_task_message(
            task_id=task_uuid,
            msg_type='completed',
            message='任务执行完成',
            progress=100,
            data=result
        )

        return {
            'success': True,
            'task_id': task_id,
            'tool_type': tool_type,
            'result': result
        }

    except Exception as exc:
        # 记录失败
        asyncio.run(_mark_task_failed(task_uuid, str(exc)))
        publish_task_message(
            task_id=task_uuid,
            msg_type='failed',
            message=f"任务执行失败: {str(exc)}",
            data={'error_type': type(exc).__name__}
        )
        raise


async def _update_task_status_to_running(task_uuid: uuid.UUID) -> None:
    """更新任务状态为 running"""
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        await TaskService.update_task_status(
            db=db,
            task_id=task_uuid,
            status='running',
            progress=0,
            message='任务开始执行'
        )
        await db.commit()


async def _mark_task_failed(task_uuid: uuid.UUID, error_message: str) -> None:
    """标记任务失败"""
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            await TaskService.fail_task(
                db=db,
                task_id=task_uuid,
                error_message=error_message
            )
        except Exception:
            # 如果已经失败过，忽略
            pass


async def _execute_with_async_session(
    executor_class: type[BaseToolExecutor],
    task_uuid: uuid.UUID,
    input_params: Dict[str, Any]
) -> Dict[str, Any]:
    """使用异步会话执行任务"""
    from app.core.database import AsyncSessionLocal
    from app.services.task_service import TaskService
    from app.models.tool import Tool

    async with AsyncSessionLocal() as db:
        # 获取任务信息，找到对应的 tool_id
        task = await TaskService.get_by_id(db, task_uuid)

        # 从数据库读取工具定价配置
        tool_config = {}
        if task and task.tool_id:
            result = await db.execute(select(Tool).where(Tool.id == task.tool_id))
            tool = result.scalar_one_or_none()
            if tool:
                tool_config = {
                    'base_fee': tool.base_fee,
                    'image_fee': tool.image_fee,
                    'audio_fee': tool.audio_fee,
                }

        # 创建异步进度回调
        progress_callback = AsyncProgressCallback(task_uuid)

        # 创建执行器，传入工具配置
        executor = executor_class(
            task_id=task_uuid,
            db=db,
            tool=tool_config,
            progress_callback=progress_callback
        )

        # 判断是否启用 Mock 执行模式
        if os.getenv("MOCK_AI_EXECUTION") == "true":
            logger.info(f"[Mock Mode] 模拟执行 task {task_uuid}")
            result = await executor._mock_execute()
        else:
            result = await executor.execute(input_params)

            # 结算任务（计算实际费用）
            actual_cost = executor.estimate_cost(input_params)

            # 完成任务并结算
            await TaskService.complete_task(
                db=db,
                task_id=task_uuid,
                actual_cost=actual_cost
            )

        await db.commit()

        return result


@celery_app.task(queue='fast')
def check_timeout_tasks() -> Dict[str, Any]:
    """检查超时任务（每分钟执行一次）

    查找 running 状态且超过 30 分钟未更新的任务，标记为 timeout，
    解冻预冻结的积分，并通过 Redis Pub/Sub 发送超时通知。
    """
    session = _get_sync_session()
    try:
        from app.models.task import Task
        from app.models.user import User
        from app.models.payment import PointTransaction, PointTransactionType

        now = int(time.time())
        timeout_threshold = 1800  # 30 分钟
        timeout_count = 0

        # 查找 running 状态且 started_at 超过阈值的任务
        tasks = session.query(Task).filter(
            Task.status == 'running',
            Task.started_at.isnot(None),
            (now - Task.started_at) > timeout_threshold
        ).all()

        for task in tasks:
            # 标记任务为超时
            task.timeout()
            task.error_message = f'任务执行超时（超过{timeout_threshold // 60}分钟未完成）'

            # 如果有冻结积分，解冻并创建交易流水
            if task.estimated_cost and task.estimated_cost > 0:
                user = session.query(User).with_for_update().filter(
                    User.id == task.user_id
                ).first()
                if user:
                    actual_unfreeze = min(task.estimated_cost, user.frozen_balance)
                    if actual_unfreeze > 0:
                        user.balance += actual_unfreeze
                        user.frozen_balance -= actual_unfreeze
                        user.version += 1

                        # 记录解冻流水
                        session.add(PointTransaction(
                            user_id=task.user_id,
                            amount=actual_unfreeze,
                            type=PointTransactionType.UNFREEZE,
                            reason=f'任务超时自动解冻: {task.id}',
                            related_id=str(task.id),
                            related_type='task_timeout',
                            balance_before=user.balance - actual_unfreeze,
                            balance_after=user.balance,
                            operator='system',
                            remark='超时任务自动解冻预冻结积分',
                        ))

            # 发布超时消息到 Redis Pub/Sub
            try:
                publish_task_message(
                    task_id=task.id,
                    msg_type='failed',
                    message=f'任务已超时（超过{timeout_threshold // 60}分钟未完成）',
                    data={'reason': 'timeout', 'task_status': 'timeout'}
                )
            except Exception:
                pass

            timeout_count += 1

        session.commit()
        return {
            'status': 'ok',
            'message': f'超时任务检查完成，已处理 {timeout_count} 个超时任务',
            'checked_count': timeout_count,
            'timeout_count': timeout_count,
        }
    except Exception as e:
        session.rollback()
        return {'status': 'error', 'message': str(e)}
    finally:
        session.close()


@celery_app.task(queue='fast')
def cleanup_expired_results() -> Dict[str, Any]:
    """清理过期的任务结果（每天凌晨执行）

    查询超过 30 天的已完成/失败/取消/超时任务，
    清理 snapshot_data 和 result_preview 字段以释放存储空间。
    """
    session = _get_sync_session()
    try:
        from app.models.task import Task

        now = int(time.time())
        retention_days = 30
        retention_seconds = retention_days * 86400
        cleanup_count = 0

        # 查找超过保留期的已完成/失败/取消/超时任务
        expired_tasks = session.query(Task).filter(
            Task.status.in_(['completed', 'failed', 'cancelled', 'timeout']),
            Task.completed_at.isnot(None),
            (now - Task.completed_at) > retention_seconds
        ).all()

        for task in expired_tasks:
            # 清理快照数据和结果预览（释放空间，保留记录）
            task.snapshot_data = None
            task.result_preview = None
            cleanup_count += 1

        session.commit()
        return {
            'status': 'ok',
            'message': f'过期结果清理完成，已清理 {cleanup_count} 条记录',
            'cleaned_count': cleanup_count,
        }
    except Exception as e:
        session.rollback()
        return {'status': 'error', 'message': str(e)}
    finally:
        session.close()


def get_executor_for_tool(tool_type: str) -> Optional[type[BaseToolExecutor]]:
    """
    根据工具类型获取对应的执行器类

    :param tool_type: 工具类型
    :return: 执行器类，如果不支持返回 None
    """
    return EXECUTOR_MAP.get(tool_type)


def register_executor(tool_type: str, executor_class: type[BaseToolExecutor]) -> None:
    """
    注册新的工具执行器

    :param tool_type: 工具类型
    :param executor_class: 执行器类
    """
    EXECUTOR_MAP[tool_type] = executor_class
