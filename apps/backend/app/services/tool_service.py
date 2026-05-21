import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.models.tool import Tool, ToolCategory, ToolFavorite, ToolRating, ToolDemo
from app.schemas.tool import (
    ToolCreate, ToolUpdate,
    ToolCategoryCreate, ToolCategoryUpdate,
    ToolRatingCreate,
    ToolDemoCreate
)
from app.core.exceptions import ToolNotFoundException, ToolCategoryNotFoundException


class ToolService:
    """工具管理服务"""

    # ============== Tool CRUD Methods ==============

    @staticmethod
    async def get_tool_by_id(db: AsyncSession, tool_id: uuid.UUID) -> Optional[Tool]:
        """根据ID获取工具"""
        result = await db.execute(select(Tool).where(Tool.id == tool_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_tool_by_slug(db: AsyncSession, slug: str) -> Optional[Tool]:
        """根据标识获取工具"""
        result = await db.execute(select(Tool).where(Tool.slug == slug))
        return result.scalar_one_or_none()

    @staticmethod
    async def list_tools(
        db: AsyncSession,
        category_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        sort_by: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Tool], int]:
        """获取工具列表，支持分类筛选、搜索和排序

        Args:
            sort_by: 排序方式 - popularity(热度), newest(最新), price_asc(价格升序), price_desc(价格降序)
        """
        query = select(Tool).where(Tool.status == 1)  # 只返回已上线工具

        # 分类筛选
        if category_id:
            query = query.where(Tool.category_id == category_id)

        # 搜索（按名称或描述）
        if search:
            query = query.where(
                or_(
                    Tool.name.ilike(f"%{search}%"),
                    Tool.description.ilike(f"%{search}%")
                )
            )

        # 获取总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # 排序逻辑
        if sort_by == "popularity":
            query = query.order_by(Tool.use_count.desc(), Tool.favorite_count.desc())
        elif sort_by == "newest":
            query = query.order_by(Tool.created_at.desc())
        elif sort_by == "price_asc":
            query = query.order_by(Tool.base_fee.asc())
        elif sort_by == "price_desc":
            query = query.order_by(Tool.base_fee.desc())
        else:
            # 默认排序：最新优先
            query = query.order_by(Tool.created_at.desc())

        # 分页查询
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        tools = result.scalars().all()

        return tools, total

    @staticmethod
    async def create_tool(db: AsyncSession, tool_in: ToolCreate) -> Tool:
        """创建工具（自动校验 slug 唯一性）"""
        # 校验 slug 唯一性
        existing = await ToolService.get_tool_by_slug(db, tool_in.slug)
        if existing:
            from app.core.exceptions import BusinessException
            raise BusinessException(detail=f"工具标识 '{tool_in.slug}' 已存在")

        db_obj = Tool(**tool_in.model_dump())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def update_tool(db: AsyncSession, tool_id: uuid.UUID, tool_in: ToolUpdate) -> Tool:
        """更新工具"""
        tool = await ToolService.get_tool_by_id(db, tool_id)
        if not tool:
            raise ToolNotFoundException()

        update_data = tool_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(tool, field, value)

        await db.commit()
        await db.refresh(tool)
        return tool

    @staticmethod
    async def delete_tool(db: AsyncSession, tool_id: uuid.UUID) -> None:
        """删除工具"""
        tool = await ToolService.get_tool_by_id(db, tool_id)
        if not tool:
            raise ToolNotFoundException()

        await db.delete(tool)
        await db.commit()

    # ============== Favorite Methods ==============

    @staticmethod
    async def toggle_favorite(db: AsyncSession, user_id: uuid.UUID, tool_id: uuid.UUID) -> bool:
        """收藏/取消收藏（原子操作）
        返回值：True表示已收藏，False表示已取消收藏
        """
        # 检查是否已收藏
        result = await db.execute(
            select(ToolFavorite).where(
                ToolFavorite.user_id == user_id,
                ToolFavorite.tool_id == tool_id
            )
        )
        existing = result.scalar_one_or_none()

        # 先对工具行加锁，确保原子操作
        tool_result = await db.execute(
            select(Tool).where(Tool.id == tool_id).with_for_update()
        )
        tool = tool_result.scalar_one_or_none()
        if not tool:
            raise ToolNotFoundException()

        if existing:
            # 已收藏 -> 取消收藏
            await db.delete(existing)
            if tool.favorite_count > 0:
                tool.favorite_count -= 1
            await db.commit()
            return False
        else:
            # 未收藏 -> 添加收藏
            favorite = ToolFavorite(user_id=user_id, tool_id=tool_id)
            db.add(favorite)
            tool.favorite_count += 1
            await db.commit()
            return True

    @staticmethod
    async def get_user_favorites(
        db: AsyncSession,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Tool], int]:
        """获取用户收藏的工具列表"""
        # 查询用户收藏的工具ID
        subquery = (
            select(ToolFavorite.tool_id)
            .where(ToolFavorite.user_id == user_id)
            .subquery()
        )

        # 获取总数
        count_query = select(func.count()).select_from(subquery)
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # 分页查询工具详情（需要join来按收藏时间排序）
        query = (
            select(Tool)
            .join(ToolFavorite, Tool.id == ToolFavorite.tool_id)
            .where(ToolFavorite.user_id == user_id)
            .offset(skip)
            .limit(limit)
            .order_by(ToolFavorite.created_at.desc())
        )
        result = await db.execute(query)
        tools = result.scalars().all()

        return tools, total

    # ============== Rating Methods ==============

    @staticmethod
    async def create_rating(db: AsyncSession, user_id: uuid.UUID, rating_in: ToolRatingCreate) -> ToolRating:
        """创建工具评价"""
        # 验证评分范围 1-5
        if not 1 <= rating_in.rating <= 5:
            from app.core.exceptions import BusinessException
            raise BusinessException(detail="评分必须在 1-5 之间")

        # 验证 task_id 唯一性（模型层有唯一索引，提前检查避免500）
        existing = await db.execute(
            select(ToolRating).where(ToolRating.task_id == rating_in.task_id)
        )
        if existing.scalar_one_or_none():
            from app.core.exceptions import BusinessException
            raise BusinessException(detail="该任务已评价，不可重复评价")

        db_obj = ToolRating(
            user_id=user_id,
            **rating_in.model_dump()
        )
        db.add(db_obj)

        # 更新工具的评分统计
        tool_result = await db.execute(select(Tool).where(Tool.id == rating_in.tool_id))
        tool = tool_result.scalar_one_or_none()
        if tool:
            old_total = tool.rating_avg * tool.rating_count
            tool.rating_count += 1
            tool.rating_avg = (old_total + rating_in.rating) / tool.rating_count

        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def get_tool_ratings(
        db: AsyncSession,
        tool_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[ToolRating], int]:
        """获取工具的评价列表"""
        query = select(ToolRating).where(ToolRating.tool_id == tool_id)

        # 获取总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # 分页查询
        query = query.offset(skip).limit(limit).order_by(ToolRating.created_at.desc())
        result = await db.execute(query)
        ratings = result.scalars().all()

        return ratings, total

    # ============== Category Methods ==============

    @staticmethod
    async def list_categories(db: AsyncSession) -> List[ToolCategory]:
        """获取所有分类"""
        result = await db.execute(
            select(ToolCategory)
            .where(ToolCategory.is_active == True)
            .order_by(ToolCategory.sort_order.asc())
        )
        return result.scalars().all()

    @staticmethod
    async def create_category(db: AsyncSession, category_in: ToolCategoryCreate) -> ToolCategory:
        """创建分类"""
        db_obj = ToolCategory(**category_in.model_dump())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def update_category(db: AsyncSession, category_id: uuid.UUID, category_in: ToolCategoryUpdate) -> ToolCategory:
        """更新分类"""
        result = await db.execute(select(ToolCategory).where(ToolCategory.id == category_id))
        category = result.scalar_one_or_none()
        if not category:
            raise ToolCategoryNotFoundException()

        update_data = category_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(category, field, value)

        await db.commit()
        await db.refresh(category)
        return category

    # ============== Demo Methods ==============

    @staticmethod
    async def list_demos(
        db: AsyncSession,
        tool_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[ToolDemo], int]:
        """获取工具的演示案例列表（支持分页）"""
        query = select(ToolDemo).where(
            ToolDemo.tool_id == tool_id,
            ToolDemo.is_active == True
        )

        # 获取总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # 分页查询
        query = query.offset(skip).limit(limit).order_by(ToolDemo.sort_order.asc())
        result = await db.execute(query)
        demos = result.scalars().all()

        return demos, total

    @staticmethod
    async def create_demo(db: AsyncSession, demo_in: ToolDemoCreate) -> ToolDemo:
        """创建演示案例"""
        db_obj = ToolDemo(**demo_in.model_dump())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
