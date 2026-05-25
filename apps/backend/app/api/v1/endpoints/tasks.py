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


class ProgressUpdateRequest(BaseModel):
    progress: int = Field(..., ge=0, le=100, description="进度 0-100")
    message: str = Field("", description="进度消息")
    data: Optional[Dict[str, Any]] = Field(None, description="附加数据")
    completed: bool = Field(False, description="是否标记完成")
    actual_cost: Optional[int] = Field(None, description="实际费用")
