import uuid
from typing import Optional, Any, Dict, List
from pydantic import BaseModel, Field


# ============ Task Schemas ============

class TaskBase(BaseModel):
    task_type: str = Field(..., max_length=50, description="任务类型")
    tool_id: Optional[uuid.UUID] = Field(None, description="工具ID")
    estimated_cost: Optional[int] = Field(None, description="预估费用")
    input_params: Optional[Dict[str, Any]] = Field(None, description="输入参数")


class TaskCreate(TaskBase):
    """创建任务"""
    user_id: Optional[uuid.UUID] = Field(None, description="用户ID（不传则使用当前用户）")


class TaskUpdate(BaseModel):
    """更新任务"""
    status: Optional[str] = Field(None, max_length=20, description="状态")
    progress: Optional[int] = Field(None, description="进度0-100")
    progress_message: Optional[str] = Field(None, max_length=255, description="进度消息")
    actual_cost: Optional[int] = Field(None, description="实际费用")
    result_preview: Optional[str] = Field(None, description="结果预览")
    error_message: Optional[str] = Field(None, description="错误信息")


class TaskInDBBase(TaskBase):
    id: uuid.UUID
    user_id: uuid.UUID
    status: str
    progress: int
    progress_message: Optional[str]
    result_preview: Optional[str]
    error_message: Optional[str]
    actual_cost: Optional[int]
    started_at: Optional[int]
    completed_at: Optional[int]
    created_at: int
    updated_at: int

    model_config = {"from_attributes": True}


class Task(TaskInDBBase):
    """任务信息（对外）"""
    pass


class TaskDetail(TaskInDBBase):
    """任务详情（包含快照数据）"""
    snapshot_data: Optional[Dict[str, Any]]


# ============ TaskLog Schemas ============

class TaskLogBase(BaseModel):
    level: str = Field("info", max_length=20, description="日志级别：debug info warn error")
    message: str = Field(..., description="日志消息")
    details: Optional[Dict[str, Any]] = Field(None, description="详细信息")


class TaskLogCreate(TaskLogBase):
    """创建任务日志"""
    task_id: uuid.UUID = Field(..., description="任务ID")


class TaskLogInDBBase(TaskLogBase):
    id: uuid.UUID
    task_id: uuid.UUID
    timestamp: int

    model_config = {"from_attributes": True}


class TaskLog(TaskLogInDBBase):
    """任务日志（对外）"""
    pass


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
    pass


# ============ WorkFile Schemas ============

class WorkFileBase(BaseModel):
    file_type: str = Field("other", max_length=20, description="文件类型：image audio video pdf psd other")
    file_name: str = Field(..., max_length=255, description="文件名")
    file_url: str = Field(..., max_length=255, description="文件路径（相对路径如 images/page_1.png，或绝对路径）")
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


# ============ Snapshot Schemas ============

class SnapshotUpdate(BaseModel):
    """更新快照数据"""
    snapshot_data: Dict[str, Any] = Field(..., description="快照数据")
