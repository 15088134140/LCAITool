from typing import Optional
from pydantic import BaseModel


class FeedbackCreate(BaseModel):
    type: str  # feature/bug/consult/other
    title: str
    description: Optional[str] = None
    contact: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: str
    type: str
    title: str
    description: Optional[str] = None
    contact: Optional[str] = None
    status: str
    admin_reply: Optional[str] = None
    reply_points: Optional[int] = None
    created_at: int

    class Config:
        from_attributes = True


class AdminFeedbackUpdate(BaseModel):
    status: Optional[str] = None
    admin_reply: Optional[str] = None
