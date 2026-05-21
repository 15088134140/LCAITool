"""
任务管理 API 端点
实现任务创建、查询、取消、日志等功能
"""
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.schemas.task import (
    Task as TaskSchema,
    TaskCreate,
    TaskDetail,
    TaskLog as TaskLogSchema
)
from app.services.task_service import TaskService
from app.workers.tasks import execute_tool_task

router = APIRouter()


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

    # 创建任务（含预冻结积分）
    task = await TaskService.create_task(db=db, task_in=task_in)

    # 提交到Celery队列
    execute_tool_task.delay(
        task_id=str(task.id),
        tool_type=task.task_type,
        input_params=task.input_params or {}
    )

    return task


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

    return task


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

    return await TaskService.cancel_task(db=db, task_id=task_id, reason=reason)


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

    return {
        "items": logs,
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
            "items": filtered_tasks,
            "total": filtered_total,
            "page": page,
            "page_size": page_size,
        }

    return {
        "items": tasks,
        "total": total,
        "page": page,
        "page_size": page_size,
    }
