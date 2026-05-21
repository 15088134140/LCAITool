import uuid
import time
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from app.models.task import Task, TaskLog
from app.models.user import User
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskLogCreate
)
from app.services.point_service import PointService
from app.core.exceptions import (
    UserNotFoundException,
    InsufficientBalanceException,
    ResourceNotFoundException,
    BusinessException
)


class TaskService:
    """任务执行服务 - 处理任务创建、预冻结、进度更新、结算、取消等"""

    # ============ Task CRUD Methods ============

    @staticmethod
    async def get_by_id(db: AsyncSession, task_id: uuid.UUID) -> Optional[Task]:
        """根据ID获取任务"""
        result = await db.execute(select(Task).where(Task.id == task_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_user_id(
        db: AsyncSession,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Task], int]:
        """获取用户的任务列表"""
        query = select(Task).where(Task.user_id == user_id)

        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        query = query.offset(skip).limit(limit).order_by(Task.created_at.desc())
        result = await db.execute(query)
        tasks = result.scalars().all()

        return tasks, total

    @staticmethod
    async def create_task(db: AsyncSession, task_in: TaskCreate) -> Task:
        """
        创建任务并预冻结积分

        流程：
        1. 验证用户存在
        2. 验证用户余额 >= 预估费用
        3. 预冻结积分
        4. 创建任务记录（status=pending）
        """
        # 验证用户存在
        user_result = await db.execute(select(User).where(User.id == task_in.user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise UserNotFoundException()

        # 验证余额
        estimated_cost = task_in.estimated_cost or 0
        if estimated_cost > 0 and user.balance < estimated_cost:
            raise InsufficientBalanceException()

        # 预冻结积分
        if estimated_cost > 0:
            await PointService.freeze_points(
                db=db,
                user_id=task_in.user_id,
                amount=estimated_cost,
                reason=f"任务预冻结: {task_in.task_type}",
                related_id=str(task_in.user_id)
            )

        # 创建任务
        db_task = Task(
            user_id=task_in.user_id,
            tool_id=task_in.tool_id,
            task_type=task_in.task_type,
            status="pending",
            estimated_cost=estimated_cost,
            input_params=task_in.input_params,
            progress=0
        )
        db.add(db_task)
        await db.commit()
        await db.refresh(db_task)

        return db_task

    @staticmethod
    async def update_task_status(
        db: AsyncSession,
        task_id: uuid.UUID,
        status: Optional[str] = None,
        progress: Optional[int] = None,
        message: Optional[str] = None
    ) -> Task:
        """
        更新任务状态和进度

        如果任务状态变为 running，自动设置 started_at
        """
        task = await TaskService.get_by_id(db, task_id)
        if not task:
            raise ResourceNotFoundException("任务不存在")

        if status is not None:
            task.status = status
            if status == "running" and task.started_at is None:
                task.started_at = int(time.time())

        if progress is not None:
            task.progress = min(max(progress, 0), 100)

        if message is not None:
            task.progress_message = message

        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def complete_task(
        db: AsyncSession,
        task_id: uuid.UUID,
        actual_cost: int
    ) -> Task:
        """
        完成任务并结算

        流程：
        1. 计算差额：冻结金额 - 实际费用
        2. 如果差额 > 0：退还差额到用户余额（解冻）
        3. 如果差额 < 0：从用户余额扣除额外部分
        4. 结算冻结积分
        5. 更新任务状态 = completed
        """
        # 先获取任务信息，在积分操作前保存所有需要的值
        task = await TaskService.get_by_id(db, task_id)
        if not task:
            raise ResourceNotFoundException("任务不存在")

        if task.status in ["completed", "cancelled", "timeout"]:
            raise BusinessException("任务已完成或已取消，无法再次结算")

        # 保存积分操作需要的所有值（PointService会expire所有对象）
        user_id = task.user_id
        task_type = task.task_type
        estimated_cost = task.estimated_cost or 0
        frozen_amount = estimated_cost

        # 计算差额
        difference = frozen_amount - actual_cost

        # 处理结算
        if difference > 0:
            # 实际费用小于预估，先结算实际消费的部分，再解冻差额
            await PointService.settle_frozen_points(
                db=db,
                user_id=user_id,
                amount=actual_cost,
                reason=f"任务结算: {task_type}",
                related_id=str(task_id)
            )
            # 解冻差额
            await PointService.unfreeze_points(
                db=db,
                user_id=user_id,
                amount=difference,
                reason=f"任务结算差额退还: {task_type}",
                related_id=str(task_id)
            )
        elif difference < 0:
            # 实际费用大于预估，需要额外扣除
            extra_amount = abs(difference)
            user_result = await db.execute(select(User).where(User.id == user_id))
            user = user_result.scalar_one_or_none()
            if not user or user.balance < extra_amount:
                raise InsufficientBalanceException()

            # 冻结全部金额（包括额外部分）
            # 先解冻原来冻结的全部金额，再冻结实际费用
            await PointService.unfreeze_points(
                db=db,
                user_id=user_id,
                amount=frozen_amount,
                reason="重新冻结以结算超额费用",
                related_id=str(task_id)
            )
            await PointService.freeze_points(
                db=db,
                user_id=user_id,
                amount=actual_cost,
                reason="冻结实际费用",
                related_id=str(task_id)
            )
            # 结算
            await PointService.settle_frozen_points(
                db=db,
                user_id=user_id,
                amount=actual_cost,
                reason=f"任务结算: {task_type}",
                related_id=str(task_id)
            )
        else:
            # 差额为0，直接结算
            await PointService.settle_frozen_points(
                db=db,
                user_id=user_id,
                amount=actual_cost,
                reason=f"任务结算: {task_type}",
                related_id=str(task_id)
            )

        # 积分操作会过期session中的所有对象，需要重新获取任务
        task = await TaskService.get_by_id(db, task_id)

        # 更新任务状态
        task.complete(actual_cost=actual_cost)
        await db.commit()
        await db.refresh(task)

        return task

    @staticmethod
    async def cancel_task(db: AsyncSession, task_id: uuid.UUID, reason: str) -> Task:
        """
        取消任务并全额解冻积分

        流程：
        1. 更新任务状态 = cancelled
        2. 全额解冻积分
        3. 添加取消日志
        """
        task = await TaskService.get_by_id(db, task_id)
        if not task:
            raise ResourceNotFoundException("任务不存在")

        if task.status in ["completed", "cancelled", "timeout"]:
            raise BusinessException("任务已完成或已取消，无法再次取消")

        # 保存积分操作需要的值
        user_id = task.user_id
        frozen_amount = task.estimated_cost or 0
        task_type = task.task_type

        # 取消任务
        task.cancel()
        await db.commit()

        # 全额解冻积分
        if frozen_amount > 0:
            await PointService.unfreeze_points(
                db=db,
                user_id=user_id,
                amount=frozen_amount,
                reason=f"任务取消，解冻积分: {reason}",
                related_id=str(task_id)
            )

        # 积分操作会过期session中的所有对象，需要重新获取任务
        task = await TaskService.get_by_id(db, task_id)

        # 添加取消日志
        await TaskService.add_task_log(
            db=db,
            task_id=task_id,
            level="info",
            message=f"任务已取消: {reason}",
            details={"reason": reason}
        )

        await db.refresh(task)
        return task

    @staticmethod
    async def fail_task(db: AsyncSession, task_id: uuid.UUID, error_message: str) -> Task:
        """
        任务失败并全额解冻积分
        """
        task = await TaskService.get_by_id(db, task_id)
        if not task:
            raise ResourceNotFoundException("任务不存在")

        if task.status in ["completed", "cancelled", "timeout"]:
            raise BusinessException("任务已完成或已取消，无法标记为失败")

        # 保存积分操作需要的值
        user_id = task.user_id
        frozen_amount = task.estimated_cost or 0

        # 标记任务失败
        task.fail(error_message=error_message)
        await db.commit()

        # 全额解冻积分
        if frozen_amount > 0:
            await PointService.unfreeze_points(
                db=db,
                user_id=user_id,
                amount=frozen_amount,
                reason=f"任务失败，解冻积分",
                related_id=str(task_id)
            )

        # 积分操作会过期session中的所有对象，需要重新获取任务
        task = await TaskService.get_by_id(db, task_id)

        # 添加失败日志
        await TaskService.add_task_log(
            db=db,
            task_id=task_id,
            level="error",
            message=f"任务失败: {error_message}",
            details={"error_message": error_message}
        )

        await db.refresh(task)
        return task

    # ============ Task Log Methods ============

    @staticmethod
    async def add_task_log(
        db: AsyncSession,
        task_id: uuid.UUID,
        level: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ) -> TaskLog:
        """添加任务日志"""
        db_log = TaskLog(
            task_id=task_id,
            level=level,
            message=message,
            details=details,
            timestamp=int(time.time())
        )
        db.add(db_log)
        await db.commit()
        await db.refresh(db_log)
        return db_log

    @staticmethod
    async def get_task_logs(
        db: AsyncSession,
        task_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[TaskLog], int]:
        """获取任务日志列表"""
        query = select(TaskLog).where(TaskLog.task_id == task_id)

        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        query = query.offset(skip).limit(limit).order_by(TaskLog.timestamp.desc())
        result = await db.execute(query)
        logs = result.scalars().all()

        return logs, total

    # ============ Snapshot Methods ============

    @staticmethod
    async def save_snapshot(
        db: AsyncSession,
        task_id: uuid.UUID,
        snapshot_data: Dict[str, Any]
    ) -> Task:
        """
        保存执行快照（用于断点续跑）
        """
        task = await TaskService.get_by_id(db, task_id)
        if not task:
            raise ResourceNotFoundException("任务不存在")

        task.snapshot_data = snapshot_data
        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def get_snapshot(db: AsyncSession, task_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """
        获取执行快照
        """
        task = await TaskService.get_by_id(db, task_id)
        if not task:
            raise ResourceNotFoundException("任务不存在")

        return task.snapshot_data
