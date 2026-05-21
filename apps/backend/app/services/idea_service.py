import uuid
import json
from typing import Optional, List, Tuple, Set, Dict
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from app.models.system import IdeaSubmission, IdeaVote
from app.models.user import User
from app.schemas.idea import IdeaSubmissionCreate, IdeaVoteCreate
from app.core.exceptions import (
    IdeaNotFoundException,
    UserNotVerifiedException,
    AlreadyVotedException,
    UserNotFoundException
)


class IdeaService:
    """构思工具与投票服务"""

    @staticmethod
    async def submit_idea(
        db: AsyncSession,
        user_id: uuid.UUID,
        idea_in: IdeaSubmissionCreate
    ) -> IdeaSubmission:
        """提交创意"""
        # 处理标签为JSON字符串
        tags_json = json.dumps(idea_in.tags) if idea_in.tags else None

        db_obj = IdeaSubmission(
            user_id=user_id,
            title=idea_in.title,
            description=idea_in.description,
            category=idea_in.category,
            tags=tags_json,
            cover_image=idea_in.cover_image,
            contact_info=idea_in.contact_info,
            vote_count=0,
            view_count=0,
            status="pending"
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def get_idea(
        db: AsyncSession,
        idea_id: uuid.UUID,
        increment_view: bool = False
    ) -> Optional[IdeaSubmission]:
        """获取创意详情"""
        result = await db.execute(select(IdeaSubmission).where(IdeaSubmission.id == idea_id))
        idea = result.scalar_one_or_none()

        if idea and increment_view:
            idea.increment_view()
            await db.commit()
            await db.refresh(idea)

        return idea

    @staticmethod
    async def list_ideas(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 20,
        sort_by: str = "votes",
        category: Optional[str] = None,
        status: Optional[str] = "approved"
    ) -> Tuple[List[IdeaSubmission], int]:
        """获取创意列表（分页 + 排序）"""
        query = select(IdeaSubmission)

        # 按分类过滤
        if category:
            query = query.where(IdeaSubmission.category == category)

        # 按状态过滤
        if status:
            query = query.where(IdeaSubmission.status == status)

        # 获取总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # 排序
        if sort_by == "votes":
            query = query.order_by(IdeaSubmission.vote_count.desc(), IdeaSubmission.created_at.desc())
        elif sort_by == "newest":
            query = query.order_by(IdeaSubmission.created_at.desc())
        elif sort_by == "popular":
            query = query.order_by(IdeaSubmission.view_count.desc(), IdeaSubmission.vote_count.desc())
        else:
            query = query.order_by(IdeaSubmission.vote_count.desc(), IdeaSubmission.created_at.desc())

        # 分页
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        ideas = result.scalars().all()

        return ideas, total

    @staticmethod
    async def vote_idea(
        db: AsyncSession,
        user_id: uuid.UUID,
        vote_in: IdeaVoteCreate
    ) -> IdeaVote:
        """投票（仅实名认证用户可投，防重复投票）"""
        # 1. 检查用户是否存在
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise UserNotFoundException()

        # 2. 检查用户是否实名认证
        if not user.id_card_verified:
            raise UserNotVerifiedException()

        # 3. 检查创意是否存在
        idea_result = await db.execute(select(IdeaSubmission).where(IdeaSubmission.id == vote_in.idea_id))
        idea = idea_result.scalar_one_or_none()
        if not idea:
            raise IdeaNotFoundException()

        # 4. 检查是否已经投票过
        existing_vote_result = await db.execute(
            select(IdeaVote).where(
                IdeaVote.idea_id == vote_in.idea_id,
                IdeaVote.user_id == user_id
            )
        )
        existing_vote = existing_vote_result.scalar_one_or_none()
        if existing_vote:
            raise AlreadyVotedException()

        # 5. 创建投票记录
        vote_obj = IdeaVote(
            user_id=user_id,
            idea_id=vote_in.idea_id,
            vote_type=vote_in.vote_type
        )
        db.add(vote_obj)

        # 6. 原子更新投票数
        if vote_in.vote_type == "up":
            idea.increment_vote(1)
        elif vote_in.vote_type == "down":
            idea.increment_vote(-1)

        await db.commit()
        await db.refresh(vote_obj)
        return vote_obj

    @staticmethod
    async def get_user_votes(
        db: AsyncSession,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[IdeaVote], int]:
        """获取用户的投票列表"""
        query = select(IdeaVote).where(IdeaVote.user_id == user_id)

        # 获取总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # 分页
        query = query.offset(skip).limit(limit).order_by(IdeaVote.created_at.desc())
        result = await db.execute(query)
        votes = result.scalars().all()

        return votes, total

    @staticmethod
    async def get_user_voted_idea_ids(
        db: AsyncSession,
        user_id: uuid.UUID,
        idea_ids: List[uuid.UUID],
    ) -> Set[uuid.UUID]:
        """批量查询用户对哪些构思投过票"""
        if not idea_ids:
            return set()
        result = await db.execute(
            select(IdeaVote.idea_id).where(
                IdeaVote.user_id == user_id,
                IdeaVote.idea_id.in_(idea_ids),
            )
        )
        return {row[0] for row in result.fetchall()}

    @staticmethod
    async def get_idea_voters(
        db: AsyncSession,
        idea_ids: List[uuid.UUID],
        limit: int = 3,
    ) -> Dict[uuid.UUID, List[dict]]:
        """批量查询每个构思的最新投票用户信息"""
        if not idea_ids:
            return {}

        from sqlalchemy import text

        # 使用窗口函数为每个构思的投票按时间排序，取前 N 条
        subquery = (
            select(
                IdeaVote.idea_id,
                IdeaVote.user_id,
                func.row_number()
                .over(partition_by=IdeaVote.idea_id, order_by=IdeaVote.created_at.desc())
                .label("rn"),
            )
            .where(IdeaVote.idea_id.in_(idea_ids))
            .subquery()
        )

        query = (
            select(subquery.c.idea_id, subquery.c.user_id, User.nickname, User.avatar)
            .join(User, User.id == subquery.c.user_id)
            .where(subquery.c.rn <= limit)
        )
        result = await db.execute(query)
        rows = result.fetchall()

        voters_map: Dict[uuid.UUID, List[dict]] = {}
        for row in rows:
            idea_id = row.idea_id
            if idea_id not in voters_map:
                voters_map[idea_id] = []
            voters_map[idea_id].append(
                {
                    "user_id": str(row.user_id),
                    "nickname": row.nickname,
                    "avatar": row.avatar,
                }
            )
        return voters_map

    @staticmethod
    async def get_user_voted_ideas(
        db: AsyncSession,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[IdeaSubmission], int]:
        """获取用户投票过的创意列表"""
        # 1. 获取用户投票记录（按投票时间倒序）
        vote_query = (
            select(IdeaVote)
            .where(IdeaVote.user_id == user_id)
            .order_by(IdeaVote.created_at.desc())
        )
        vote_count_query = select(func.count()).select_from(vote_query.subquery())
        total_result = await db.execute(vote_count_query)
        total = total_result.scalar()

        vote_query = vote_query.offset(skip).limit(limit)
        vote_result = await db.execute(vote_query)
        votes = vote_result.scalars().all()

        if not votes:
            return [], total

        # 2. 提取 idea_ids 并按投票顺序保留
        idea_ids = [vote.idea_id for vote in votes]

        # 3. 查询对应的创意
        idea_result = await db.execute(
            select(IdeaSubmission).where(IdeaSubmission.id.in_(idea_ids))
        )
        ideas_map = {idea.id: idea for idea in idea_result.scalars().all()}

        # 4. 按投票时间顺序返回
        ideas = [ideas_map[iid] for iid in idea_ids if iid in ideas_map]

        return ideas, total

    @staticmethod
    async def has_user_voted(
        db: AsyncSession,
        user_id: uuid.UUID,
        idea_id: uuid.UUID
    ) -> bool:
        """检查用户是否已投票"""
        result = await db.execute(
            select(IdeaVote).where(
                IdeaVote.idea_id == idea_id,
                IdeaVote.user_id == user_id
            )
        )
        vote = result.scalar_one_or_none()
        return vote is not None
