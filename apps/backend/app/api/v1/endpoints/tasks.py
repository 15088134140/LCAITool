"""
任务管理 API 端点
实现任务创建、查询、取消、日志等功能
"""
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from pydantic import BaseModel, Field

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.tool import Tool
from app.schemas.task import (
    Task as TaskSchema,
    TaskCreate,
    TaskDetail,
    TaskLog as TaskLogSchema
)
from app.schemas.tool import ToolRatingResponse
from app.services.task_service import TaskService
from app.services.tool_service import ToolService as ToolSvc
from app.core.config import settings
from app.workers.tasks import execute_tool_task, publish_task_message

router = APIRouter()


async def _calculate_task_cost(db: AsyncSession, task_in: TaskCreate) -> int:
    """后端计算任务费用：优先 PricingService，回退执行器 estimate_cost"""
    from app.services.pricing_service import PricingService, PricingNotConfiguredError
    from app.executors.registry import get_executor_class

    # 查询工具获取 pricing_schema 和单价字段
    if task_in.tool_id:
        result = await db.execute(select(Tool).where(Tool.id == task_in.tool_id))
        tool = result.scalar_one_or_none()
        if tool:
            try:
                pricing_result = PricingService.estimate_tool_cost(tool, task_in.input_params or {})
                return pricing_result.total
            except PricingNotConfiguredError:
                pass

    # 回退：用前端传入的 estimated_cost
    return task_in.estimated_cost or 0


async def _validate_task_params(db: AsyncSession, task_in: TaskCreate) -> None:
    """创建任务前提前校验参数，避免无效任务进入队列后才报错。

    复用各执行器的 _validate_params（若存在）。校验失败抛出 400，
    由前端 useToolGeneration 的 toast 直接提示用户。
    """
    from fastapi import HTTPException
    from app.executors.registry import get_executor_class

    if not task_in.tool_id:
        return

    result = await db.execute(select(Tool).where(Tool.id == task_in.tool_id))
    tool = result.scalar_one_or_none()
    if not tool:
        return

    executor_key = tool.executor_key or task_in.task_type
    executor_class = get_executor_class(executor_key)
    # 仅当执行器实现了 _validate_params 时校验（目前仅创意视频）
    if not executor_class or not hasattr(executor_class, "_validate_params"):
        return

    # 构造与 worker 一致的工具配置，供 _validate_params 读取（不局限于特定执行器）
    tool_config = {
        "base_fee": tool.base_fee,
        "image_fee": tool.image_fee,
        "audio_fee": tool.audio_fee,
        "token_fee": tool.token_fee,
        "is_mock_enabled": tool.is_mock_enabled,
        "is_prompt_logging_enabled": tool.is_prompt_logging_enabled,
    }
    # _validate_params 是纯参数校验，不依赖 task_id/db；用占位 task_id 实例化
    executor = executor_class(task_id=uuid.uuid4(), db=db, tool=tool_config)
    try:
        executor._validate_params(task_in.input_params or {})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


class ProgressUpdateRequest(BaseModel):
    progress: int = Field(..., ge=0, le=100, description="进度 0-100")
    message: str = Field("", description="进度消息")
    data: Optional[Dict[str, Any]] = Field(None, description="附加数据")
    completed: bool = Field(False, description="是否标记完成")
    actual_cost: Optional[int] = Field(None, description="实际费用")


async def _enrich_task_with_tool(task: Any, db: AsyncSession) -> dict:
    """将任务对象转为 dict 并补充工具名称和封面图"""
    task_dict = TaskSchema.model_validate(task).model_dump()
    if task.tool_id:
        result = await db.execute(select(Tool).where(Tool.id == task.tool_id))
        tool = result.scalar_one_or_none()
        if tool:
            task_dict['tool_name'] = tool.name
            task_dict['tool_cover'] = tool.cover_image.split('|')[0].strip() if tool.cover_image else None
    return task_dict


async def _enrich_tasks_with_tool(tasks: list, db: AsyncSession) -> list:
    """批量补充工具信息"""
    result = []
    for task in tasks:
        result.append(await _enrich_task_with_tool(task, db))
    return result


@router.post("", response_model=TaskSchema, summary="创建任务（开始生成）")
async def create_task(
    task_in: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    创建新任务并提交到Celery队列执行

    - 验证用户积分余额是否充足
    - 预冻结积分
    - 创建任务记录
    - 提交到Celery队列执行
    """
    # 确保使用当前用户ID
    task_in.user_id = current_user.id

    # 后端重新计算费用（不信任前端传入的 estimated_cost）
    estimated_cost = await _calculate_task_cost(db, task_in)

    # 覆盖前端传入的 estimated_cost
    task_in.estimated_cost = estimated_cost

    # 提前校验参数：在创建任务和冻结积分之前，复用执行器校验
    await _validate_task_params(db, task_in)

    # 创建任务（含预冻结积分）
    task = await TaskService.create_task(db=db, task_in=task_in)

    # 提交到Celery队列
    execute_tool_task.delay(
        task_id=str(task.id),
        tool_type=task.task_type,
        input_params=task.input_params or {}
    )

    return await _enrich_task_with_tool(task, db)


@router.get("/{task_id}", response_model=TaskDetail, summary="查询任务状态")
async def get_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    查询指定任务的详细状态信息
    """
    task = await TaskService.get_by_id(db=db, task_id=task_id)

    # 权限检查：仅任务所有者可查看
    if not task or task.user_id != current_user.id:
        from app.core.exceptions import ResourceNotFoundException
        raise ResourceNotFoundException("任务不存在")

    return await _enrich_task_with_tool(task, db)


@router.post("/{task_id}/cancel", response_model=TaskSchema, summary="取消任务")
async def cancel_task(
    task_id: uuid.UUID,
    reason: Optional[str] = Query("用户主动取消", description="取消原因"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    取消正在执行或等待中的任务

    - 解冻预冻结的积分
    - 更新任务状态为 cancelled
    """
    task = await TaskService.get_by_id(db=db, task_id=task_id)

    # 权限检查：仅任务所有者可取消
    if not task or task.user_id != current_user.id:
        from app.core.exceptions import ResourceNotFoundException
        raise ResourceNotFoundException("任务不存在")

    task = await TaskService.cancel_task(db=db, task_id=task_id, reason=reason)
    return await _enrich_task_with_tool(task, db)


@router.get("/{task_id}/my-rating", summary="获取当前用户对任务的评价")
async def get_my_task_rating(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """获取当前用户对指定任务的评价（仅任务所有者可查看）"""
    task = await TaskService.get_by_id(db=db, task_id=task_id)

    if not task or task.user_id != current_user.id:
        from app.core.exceptions import ResourceNotFoundException
        raise ResourceNotFoundException("任务不存在")

    rating = await ToolSvc.get_rating_by_task(db=db, task_id=task_id)
    if not rating:
        return None

    return ToolRatingResponse.model_validate(rating)


@router.get("/{task_id}/logs", summary="查询任务日志列表")
async def get_task_logs(
    task_id: uuid.UUID,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(50, ge=1, le=200, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    分页查询任务执行日志
    """
    task = await TaskService.get_by_id(db=db, task_id=task_id)

    # 权限检查：仅任务所有者可查看
    if not task or task.user_id != current_user.id:
        from app.core.exceptions import ResourceNotFoundException
        raise ResourceNotFoundException("任务不存在")

    skip = (page - 1) * page_size
    logs, total = await TaskService.get_task_logs(
        db=db, task_id=task_id, skip=skip, limit=page_size
    )

    from app.schemas.task import TaskLog as TaskLogSchema
    items = [TaskLogSchema.model_validate(log) for log in logs]
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("", summary="获取用户任务列表")
async def get_user_tasks(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: Optional[str] = Query(None, description="状态筛选: pending, running, completed, failed, cancelled, timeout"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    分页获取当前用户的任务列表
    """
    skip = (page - 1) * page_size
    tasks, total = await TaskService.get_by_user_id(
        db=db, user_id=current_user.id, skip=skip, limit=page_size
    )

    # 按状态筛选（可选）
    if status:
        filtered_tasks = [t for t in tasks if t.status == status]
        filtered_total = len(filtered_tasks)
        return {
            "items": await _enrich_tasks_with_tool(filtered_tasks, db),
            "total": filtered_total,
            "page": page,
            "page_size": page_size,
        }

    return {
        "items": await _enrich_tasks_with_tool(tasks, db),
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/{task_id}/retry", response_model=TaskSchema, summary="重试失败任务")
async def retry_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    重试失败/超时的任务

    - 仅允许重试 status 为 failed/timeout 的任务
    - 重新创建任务（保持相同的 tool_id, task_type, input_params）
    - 重新预冻结积分
    - 提交到 Celery 队列
    """
    task = await TaskService.get_by_id(db=db, task_id=task_id)
    if not task or task.user_id != current_user.id:
        from app.core.exceptions import ResourceNotFoundException
        raise ResourceNotFoundException("任务不存在")

    if task.status not in ["failed", "timeout"]:
        from app.core.exceptions import BusinessException
        raise BusinessException(detail="仅允许重试失败或超时的任务")

    # 使用相同的参数创建新任务
    from app.schemas.task import TaskCreate
    new_task_in = TaskCreate(
        user_id=current_user.id,
        tool_id=task.tool_id,
        task_type=task.task_type,
        input_params=task.input_params,
        estimated_cost=task.estimated_cost
    )
    new_task = await TaskService.create_task(db=db, task_in=new_task_in)

    # 提交到 Celery
    execute_tool_task.delay(
        task_id=str(new_task.id),
        tool_type=new_task.task_type,
        input_params=new_task.input_params or {}
    )

    return await _enrich_task_with_tool(new_task, db)


@router.post("/{task_id}/progress", summary="更新任务进度（HTTP 回调）")
async def update_task_progress(
    task_id: uuid.UUID,
    req: ProgressUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token"),
):
    """
    更新任务进度，支持第三方 HTTP 回调
    """
    # 鉴权验证
    internal_token = settings.INTERNAL_API_TOKEN
    if x_internal_token and internal_token and x_internal_token == internal_token:
        pass  # 内网 token 验证通过
    else:
        # 外网用户验证
        task = await TaskService.get_by_id(db=db, task_id=task_id)
        if not task or task.user_id != current_user.id:
            from app.core.exceptions import ResourceNotFoundException
            raise ResourceNotFoundException("任务不存在")

    # 更新进度
    task = await TaskService.update_task_status(
        db=db,
        task_id=task_id,
        progress=req.progress,
        message=req.message
    )

    # 发布进度消息到 Redis Pub/Sub（触发 SSE）
    publish_task_message(
        task_id=task_id,
        msg_type='progress',
        message=req.message,
        data=req.data or {},
        progress=req.progress
    )

    # 如果 completed=true，触发结算
    if req.completed:
        actual_cost = req.actual_cost or task.estimated_cost or 0
        task = await TaskService.complete_task(
            db=db,
            task_id=task_id,
            actual_cost=actual_cost
        )
        # 发布完成消息
        publish_task_message(
            task_id=task_id,
            msg_type='completed',
            message='任务完成',
            data={'work_id': task.result_preview} if hasattr(task, 'result_preview') else {},
            progress=100
        )

    return {"success": True, "task_id": str(task_id), "progress": req.progress, "completed": req.completed}
