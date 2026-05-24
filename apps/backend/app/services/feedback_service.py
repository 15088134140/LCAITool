from typing import Any, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import time
from app.models.system import Feedback
from app.models.payment import PointTransaction, PointTransactionType
from app.models.user import User
from fastapi import HTTPException


class FeedbackService:
    @staticmethod
    async def create(db: AsyncSession, user_id: uuid.UUID, data: Any) -> Feedback:
        feedback = Feedback(
            user_id=user_id,
            type=data.type,
            title=data.title,
            description=data.description,
            contact=data.contact,
        )
        db.add(feedback)
        await db.commit()
        await db.refresh(feedback)
        return feedback

    @staticmethod
    async def get_user_feedbacks(db: AsyncSession, user_id: uuid.UUID) -> list[Feedback]:
        result = await db.execute(
            select(Feedback).where(Feedback.user_id == user_id)
            .order_by(Feedback.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_admin_list(
        db: AsyncSession,
        status: Optional[str] = None,
        type_: Optional[str] = None,
        keyword: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        query = select(Feedback)
        if status:
            query = query.where(Feedback.status == status)
        if type_:
            query = query.where(Feedback.type == type_)
        if keyword:
            query = query.where(Feedback.title.ilike(f"%{keyword}%"))
        query = query.order_by(Feedback.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        items = result.scalars().all()

        count_query = select(func.count(Feedback.id))
        if status:
            count_query = count_query.where(Feedback.status == status)
        if type_:
            count_query = count_query.where(Feedback.type == type_)
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        return {"items": items, "total": total, "page": page, "page_size": page_size}

    @staticmethod
    async def reply(db: AsyncSession, feedback_id: uuid.UUID, reply: str, admin_id: uuid.UUID) -> Feedback:
        feedback = await db.get(Feedback, feedback_id)
        if not feedback:
            raise HTTPException(status_code=404, detail="反馈不存在")
        feedback.admin_reply = reply
        feedback.replied_by = admin_id
        feedback.replied_at = int(time.time())
        await db.commit()
        await db.refresh(feedback)
        return feedback

    @staticmethod
    async def reward(db: AsyncSession, feedback_id: uuid.UUID, points: int, admin_id: uuid.UUID) -> Feedback:
        feedback = await db.get(Feedback, feedback_id)
        if not feedback:
            raise HTTPException(status_code=404, detail="反馈不存在")

        # 发放积分
        user = await db.get(User, feedback.user_id)
        if user:
            user.balance += points
            db.add(PointTransaction(
                user_id=user.id,
                amount=points,
                type=PointTransactionType.REWARD,
                reason=f"反馈被采纳奖励(反馈: {feedback.title})",
                balance_before=user.balance - points,
                balance_after=user.balance,
            ))

        feedback.status = "adopted"
        feedback.reply_points = points
        feedback.rewarded_at = int(time.time())
        feedback.replied_by = admin_id

        await db.commit()
        await db.refresh(feedback)
        return feedback
