from typing import Optional, Any
from pydantic import BaseModel, field_validator


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

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v: Any) -> str:
        return str(v) if not isinstance(v, str) else v

    class Config:
        from_attributes = True


class AdminFeedbackUpdate(BaseModel):
    status: Optional[str] = None
    admin_reply: Optional[str] = None
