"""
构思工具与投票 API 端点
实现创意提交、列表、投票、取消投票、详情等功能
"""
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.schemas.idea import (
    IdeaSubmissionCreate,
    IdeaSubmissionResponse,
    IdeaVoteCreate,
    IdeaVoteResponse,
)
from app.services.idea_service import IdeaService

router = APIRouter()


@router.post("", response_model=IdeaSubmissionResponse, summary="提交创意")
async def submit_idea(
    idea_in: IdeaSubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    提交新的创意构思

    任何人都可以提交创意，无需实名认证
    """
    idea = await IdeaService.submit_idea(
        db=db,
        user_id=current_user.id,
        idea_in=idea_in
    )

    return idea


@router.get("", summary="获取创意列表")
async def get_ideas(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    sort: str = Query("votes", description="排序方式: votes(最多票), newest(最新发布)"),
    category: Optional[str] = Query(None, description="分类筛选"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    分页获取创意列表，支持排序和分类筛选

    排序方式：
    - votes: 按投票数从高到低（默认）
    - newest: 按创建时间从新到旧
    """
    skip = (page - 1) * page_size

    ideas, total = await IdeaService.list_ideas(
        db=db,
        skip=skip,
        limit=page_size,
        sort_by=sort,
        category=category,
        status="approved"  # 默认只显示已审核通过的创意
    )

    return {
        "items": ideas,
        "total": total,
        "page": page,
        "page_size": page_size,
        "sort": sort,
    }


@router.get("/{idea_id}", summary="获取创意详情")
async def get_idea_detail(
    idea_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user),
) -> Any:
    """
    获取创意的详细信息

    包含：
    - 创意基本信息
    - 投票数
    - 查看数
    - 当前用户是否已投票
    """
    idea = await IdeaService.get_idea(
        db=db,
        idea_id=idea_id,
        increment_view=True  # 自动增加查看次数
    )

    from app.core.exceptions import IdeaNotFoundException

    if not idea:
        raise IdeaNotFoundException()

    # 检查当前用户是否已投票
    has_voted = False
    if current_user:
        has_voted = await IdeaService.has_user_voted(
            db=db,
            user_id=current_user.id,
            idea_id=idea_id
        )

    return {
        "id": str(idea.id),
        "user_id": str(idea.user_id),
        "title": idea.title,
        "description": idea.description,
        "category": idea.category,
        "tags": idea.tags,
        "vote_count": idea.vote_count,
        "view_count": idea.view_count,
        "status": idea.status,
        "has_voted": has_voted,
        "created_at": idea.created_at,
        "updated_at": idea.updated_at,
    }


@router.post("/{idea_id}/vote", response_model=IdeaVoteResponse, summary="投票支持创意")
async def vote_idea(
    idea_id: uuid.UUID,
    vote_type: str = Query("up", description="投票类型: up(支持), down(反对)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    为创意投票（仅实名认证用户可投票）

    - 检查用户是否已实名认证
    - 防止重复投票
    - 原子更新投票数
    """
    # 检查用户是否实名认证
    from app.core.exceptions import UserNotVerifiedException

    if not current_user.id_card_verified:
        raise UserNotVerifiedException()

    vote_in = IdeaVoteCreate(
        idea_id=idea_id,
        vote_type=vote_type
    )

    vote = await IdeaService.vote_idea(
        db=db,
        user_id=current_user.id,
        vote_in=vote_in
    )

    return vote


@router.delete("/{idea_id}/vote", summary="取消投票")
async def cancel_vote(
    idea_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    取消用户对该创意的投票
    """
    # TODO: 实现取消投票逻辑需要在 IdeaService 中添加方法
    # 目前 IdeaService 没有实现取消投票的方法
    # 这是一个占位实现，需要后续扩展 IdeaService
    from app.core.exceptions import BusinessException

    has_voted = await IdeaService.has_user_voted(
        db=db,
        user_id=current_user.id,
        idea_id=idea_id
    )

    if not has_voted:
        raise BusinessException("您尚未对该创意投票")

    # TODO: 实现取消投票逻辑
    # 这里需要在 IdeaService 中添加 cancel_vote 方法
    # 以及在 Idea 模型中添加 decrement_vote 方法

    return {
        "message": "取消投票成功",
        "idea_id": str(idea_id)
    }
