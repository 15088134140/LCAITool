import uuid
from typing import Optional, Any, Dict, List
from pydantic import BaseModel, Field


# ============ Work Schemas ============

class WorkBase(BaseModel):
    title: str = Field(..., max_length=255, description="标题")
    description: Optional[str] = Field(None, description="描述")
    tool_id: Optional[uuid.UUID] = Field(None, description="工具ID")
    cover_image: Optional[str] = Field(None, max_length=255, description="封面图片URL")
    status: Optional[str] = Field("draft", max_length=20, description="状态：draft published archived")
    is_public: Optional[bool] = Field(False, description="是否公开")


class WorkCreate(WorkBase):
    """创建成果"""
    user_id: uuid.UUID = Field(..., description="用户ID")
    task_id: uuid.UUID = Field(..., description="任务ID")
    parent_id: Optional[uuid.UUID] = Field(None, description="父成果ID，用于迭代版本")
    version: Optional[int] = Field(1, description="版本号")


class WorkUpdate(BaseModel):
    """更新成果"""
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None)
    cover_image: Optional[str] = Field(None, max_length=255)
    status: Optional[str] = Field(None, max_length=20)
    is_public: Optional[bool] = Field(None)


class WorkInDBBase(WorkBase):
    id: uuid.UUID
    user_id: uuid.UUID
    task_id: uuid.UUID
    parent_id: Optional[uuid.UUID]
    version: int
    view_count: int
    like_count: int
    share_count: int
    created_at: int
    updated_at: int

    model_config = {"from_attributes": True}


class Work(WorkInDBBase):
    """成果信息（对外）"""
    pass


class WorkDetail(WorkInDBBase):
    """成果详情（包含关联数据）"""
    files: List["WorkFile"] = Field(default_factory=list, description="文件列表")
    shares: List["WorkShare"] = Field(default_factory=list, description="分享记录列表")
    has_download_permission: Optional[bool] = Field(None, description="当前用户是否有下载权限")


# ============ WorkFile Schemas ============

class WorkFileBase(BaseModel):
    file_type: str = Field("other", max_length=20, description="文件类型：image audio video pdf psd other")
    file_name: str = Field(..., max_length=255, description="文件名")
    file_url: str = Field(..., max_length=255, description="文件URL")
    file_size: Optional[int] = Field(None, description="文件大小（字节）")
    page_number: Optional[int] = Field(None, description="页码")
    mime_type: Optional[str] = Field(None, max_length=100, description="MIME类型")
    duration: Optional[int] = Field(None, description="时长（秒，用于音频视频）")
    is_preview: Optional[bool] = Field(False, description="是否为预览文件")


class WorkFileCreate(WorkFileBase):
    """创建成果文件"""
    work_id: uuid.UUID = Field(..., description="成果ID")


class WorkFileInDBBase(WorkFileBase):
    id: uuid.UUID
    work_id: uuid.UUID
    created_at: int

    model_config = {"from_attributes": True}


class WorkFile(WorkFileInDBBase):
    """成果文件（对外）"""
    pass


# ============ WorkShare Schemas ============

class WorkShareBase(BaseModel):
    share_type: str = Field("public", max_length=20, description="分享类型：public link friends")
    password: Optional[str] = Field(None, max_length=50, description="分享密码")
    expire_days: Optional[int] = Field(None, description="过期天数")


class WorkShareCreate(WorkShareBase):
    """创建分享"""
    work_id: uuid.UUID = Field(..., description="成果ID")


class WorkShareInDBBase(WorkShareBase):
    id: uuid.UUID
    work_id: uuid.UUID
    share_url: Optional[str]
    expire_at: Optional[int]
    view_count: int
    like_count: int
    comment_count: int
    status: str
    reviewed_by: Optional[uuid.UUID]
    reviewed_at: Optional[int]
    created_at: int

    model_config = {"from_attributes": True}


class WorkShare(WorkShareInDBBase):
    """分享记录（对外）"""
    pass


# ============ Work List Query Schemas ============

class WorkListQuery(BaseModel):
    """成果列表查询参数"""
    status: Optional[str] = Field(None, description="状态筛选")
    tool_id: Optional[uuid.UUID] = Field(None, description="工具ID筛选")
    is_public: Optional[bool] = Field(None, description="是否公开筛选")
    skip: int = Field(0, ge=0, description="跳过数量")
    limit: int = Field(20, ge=1, le=100, description="每页数量")


# ============ Iteration Create Schema ============

class IterationCreate(BaseModel):
    """创建迭代版本"""
    parent_work_id: uuid.UUID = Field(..., description="父成果ID")
    title: Optional[str] = Field(None, description="新标题，不填则继承父成果标题 + 版本号")
    description: Optional[str] = Field(None, description="新描述")
    input_params: Optional[Dict[str, Any]] = Field(None, description="输入参数")


# 解决前向引用
WorkDetail.model_rebuild()
