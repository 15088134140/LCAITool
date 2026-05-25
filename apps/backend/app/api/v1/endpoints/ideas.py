"""
构思工具与投票 API 端点
实现创意提交、列表、投票、取消投票、详情等功能
"""
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.deps import get_db, get_current_active_user, get_optional_current_user
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
    status: Optional[str] = Query(None, description="状态筛选: pending/reviewing/approved/rejected/implemented"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
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
        status=status if status else "approved",
    )

    # 批量查询当前用户的投票状态
    voted_ids = set()
    if current_user:
        voted_ids = await IdeaService.get_user_voted_idea_ids(
            db=db,
            user_id=current_user.id,
            idea_ids=[idea.id for idea in ideas],
        )

    # 批量查询投票用户信息（每人最多取前3位）
    voters_map = await IdeaService.get_idea_voters(db, [idea.id for idea in ideas])

    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": str(idea.id),
                    "user_id": str(idea.user_id),
                    "title": idea.title,
                    "description": idea.description,
                    "category": idea.category,
                    "tags": idea.tags,
                    "vote_count": idea.vote_count,
                    "view_count": idea.view_count,
                    "status": idea.status,
                    "has_voted": idea.id in voted_ids,
                    "voters": voters_map.get(idea.id, []),
                    "reviewed_at": idea.reviewed_at,
                    "created_at": idea.created_at,
                    "updated_at": idea.updated_at,
                }
                for idea in ideas
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
        },
    }


@router.get("/my-votes", summary="获取我投票过的创意")
async def get_my_votes(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> Any:
    """
    获取当前用户投票过的创意列表
    """
    if not current_user:
        return {
            "success": True,
            "data": {
                "items": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
            },
        }

    skip = (page - 1) * page_size

    ideas, total = await IdeaService.get_user_voted_ideas(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=page_size,
    )

    # 批量查询投票用户信息
    voters_map = await IdeaService.get_idea_voters(db, [idea.id for idea in ideas])

    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": str(idea.id),
                    "user_id": str(idea.user_id),
                    "title": idea.title,
                    "description": idea.description,
                    "category": idea.category,
                    "tags": idea.tags,
                    "vote_count": idea.vote_count,
                    "view_count": idea.view_count,
                    "status": idea.status,
                    "has_voted": True,
                    "voters": voters_map.get(idea.id, []),
                    "created_at": idea.created_at,
                    "updated_at": idea.updated_at,
                }
                for idea in ideas
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
        },
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

    # 查询投票用户信息
    voters_map = await IdeaService.get_idea_voters(db, [idea_id])
    voters = voters_map.get(idea_id, [])

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
        "voters": voters,
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
    idea = await IdeaService.cancel_vote(
        db=db,
        user_id=current_user.id,
        idea_id=idea_id,
    )

    return {
        "message": "取消投票成功",
        "idea_id": str(idea_id),
        "vote_count": idea.vote_count,
    }
