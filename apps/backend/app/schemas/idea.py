import uuid
from typing import Optional, List
from pydantic import BaseModel, Field


class IdeaSubmissionCreate(BaseModel):
    """创意提交请求"""
    title: str = Field(..., min_length=2, max_length=200, description="创意标题")
    description: Optional[str] = Field(None, description="创意描述")
    category: Optional[str] = Field(None, max_length=50, description="分类")
    tags: Optional[List[str]] = Field(None, description="标签列表")
    contact_info: Optional[str] = Field(None, max_length=200, description="联系方式")


class IdeaSubmissionResponse(BaseModel):
    """创意提交响应"""
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: Optional[str]
    category: Optional[str]
    tags: Optional[List[str]]
    vote_count: int
    view_count: int
    status: str
    created_at: int
    updated_at: int

    model_config = {"from_attributes": True}


class IdeaSubmissionListResponse(BaseModel):
    """创意列表响应"""
    items: List[IdeaSubmissionResponse]
    total: int
    skip: int
    limit: int


class IdeaVoteCreate(BaseModel):
    """投票请求"""
    idea_id: uuid.UUID
    vote_type: str = Field("up", description="投票类型：up支持 down反对")


class IdeaVoteResponse(BaseModel):
    """投票响应"""
    id: uuid.UUID
    idea_id: uuid.UUID
    user_id: uuid.UUID
    vote_type: str
    created_at: int

    model_config = {"from_attributes": True}
