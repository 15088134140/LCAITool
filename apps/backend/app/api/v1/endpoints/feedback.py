from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.services.feedback_service import FeedbackService

router = APIRouter()


@router.post("", response_model=FeedbackResponse, summary="提交反馈")
async def create_feedback(
    data: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return await FeedbackService.create(db, current_user.id, data)


@router.get("/my", summary="我的反馈列表")
async def get_my_feedbacks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    feedbacks = await FeedbackService.get_user_feedbacks(db, current_user.id)
    return [FeedbackResponse.model_validate(fb) for fb in feedbacks]
