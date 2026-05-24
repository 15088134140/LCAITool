from typing import Any, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.services.tool_service import ToolService
from app.schemas.tool import (
    ToolResponse,
    ToolCategoryResponse,
    ToolRatingCreate,
    ToolRatingResponse,
    ToolDemoResponse,
    ToolRecentResponse,
)
from app.core.exceptions import ToolNotFoundException

router = APIRouter()


# ============== 1. 工具列表 API ==============

@router.get("", summary="获取工具列表（分页+筛选+搜索）")
async def get_tools(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    category: Optional[uuid.UUID] = Query(None, description="分类ID"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    sort_by: Optional[str] = Query(None, description="排序方式: popularity/newest/price_asc/price_desc"),
    is_featured: Optional[bool] = Query(None, description="是否只返回推荐工具"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    获取工具列表，支持：
    - 分页
    - 分类筛选
    - 关键词搜索
    - 多种排序方式
    """
    skip = (page - 1) * page_size
    tools, total = await ToolService.list_tools(
        db,
        category_id=category,
        search=search,
        sort_by=sort_by,
        is_featured=is_featured,
        skip=skip,
        limit=page_size
    )

    return {
        "items": [ToolResponse.model_validate(tool) for tool in tools],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ============== 2. 最近使用工具 API ==============

@router.get("/recent", response_model=list[ToolRecentResponse], summary="获取最近使用的工具")
async def get_recent_tools(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """返回当前用户最近使用的工具列表（去重，最多3条）"""
    return await ToolService.get_recent_tools(db, current_user.id)


# ============== 3. 工具详情 API ==============

@router.get("/{tool_identifier}", summary="获取工具详情")
async def get_tool_detail(
    tool_identifier: str,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    获取工具详情，包括：
    - 工具基本信息
    - 评分统计
    - 使用计数
    - 收藏计数
    支持通过UUID或slug查询
    """
    # 先尝试UUID解析，失败则按slug查询
    try:
        tool_id = uuid.UUID(tool_identifier)
        tool = await ToolService.get_tool_by_id(db, tool_id)
    except ValueError:
        tool = await ToolService.get_tool_by_slug(db, tool_identifier)

    if not tool:
        raise ToolNotFoundException()

    return ToolResponse.model_validate(tool)


# ============== 3. 工具收藏/取消收藏 ==============

@router.post("/{tool_id}/favorite", summary="收藏工具")
async def favorite_tool(
    tool_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """收藏指定工具"""
    is_favorited = await ToolService.toggle_favorite(db, current_user.id, tool_id)

    return {
        "is_favorited": is_favorited,
        "message": "收藏成功" if is_favorited else "取消收藏成功"
    }


@router.delete("/{tool_id}/favorite", summary="取消收藏工具")
async def unfavorite_tool(
    tool_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """取消收藏指定工具"""
    is_favorited = await ToolService.toggle_favorite(db, current_user.id, tool_id)

    return {
        "is_favorited": is_favorited,
        "message": "取消收藏成功"
    }


# ============== 4. 用户收藏列表 API ==============

@router.get("/favorites/list", summary="获取用户收藏的工具列表")
async def get_user_favorites(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """获取当前用户收藏的工具列表"""
    skip = (page - 1) * page_size
    tools, total = await ToolService.get_user_favorites(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=page_size
    )

    return {
        "items": [ToolResponse.model_validate(tool) for tool in tools],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ============== 5. 工具评价 API ==============

@router.post("/{tool_id}/ratings", summary="创建工具评价")
async def create_tool_rating(
    tool_id: uuid.UUID,
    rating_in: ToolRatingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """为工具创建评分和评价"""
    # 确保评分的 tool_id 与路径一致
    rating_in.tool_id = tool_id

    rating = await ToolService.create_rating(db, current_user.id, rating_in)
    return ToolRatingResponse.model_validate(rating)


@router.get("/{tool_id}/ratings", summary="获取工具评价列表")
async def get_tool_ratings(
    tool_id: uuid.UUID,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """获取工具的评价列表"""
    skip = (page - 1) * page_size
    ratings, total = await ToolService.get_tool_ratings(
        db,
        tool_id=tool_id,
        skip=skip,
        limit=page_size
    )

    return {
        "items": [ToolRatingResponse.model_validate(rating) for rating in ratings],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{tool_id}/ratings/stats", summary="获取工具评分统计")
async def get_tool_rating_stats(
    tool_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """获取工具的评分统计：平均分、总数、星级分布"""
    stats = await ToolService.get_rating_stats(db, tool_id)
    return stats


@router.post("/ratings/{rating_id}/useful", summary="标记评价有用")
async def mark_rating_useful(
    rating_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """标记评价为有用"""
    rating = await ToolService.mark_rating_useful(db, rating_id, current_user.id)
    if not rating:
        raise HTTPException(status_code=404, detail="评价不存在")
    return {
        "is_useful_count": rating.is_useful_count,
        "message": "标记成功",
    }


# ============== 6. 工具分类列表 API ==============

@router.get("/categories/list", summary="获取工具分类列表")
async def get_categories(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """获取所有启用的工具分类"""
    categories = await ToolService.list_categories(db)

    return {
        "items": [ToolCategoryResponse.model_validate(cat) for cat in categories],
        "total": len(categories),
    }


# ============== 7. 演示案例列表 API ==============

@router.get("/{tool_id}/demos", summary="获取工具演示案例列表")
async def get_tool_demos(
    tool_id: uuid.UUID,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """获取工具的演示案例列表"""
    skip = (page - 1) * page_size
    demos, total = await ToolService.list_demos(
        db,
        tool_id=tool_id,
        skip=skip,
        limit=page_size
    )

    return {
        "items": [ToolDemoResponse.model_validate(demo) for demo in demos],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
