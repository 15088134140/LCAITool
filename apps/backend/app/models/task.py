import uuid
import time
from sqlalchemy import Column, String, Integer, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.mixins import JSONType


class Task(BaseModel):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="用户ID")
    tool_id = Column(UUID(as_uuid=True), nullable=True, index=True, comment="工具ID")
    task_type = Column(String(50), nullable=False, comment="任务类型")
    status = Column(String(20), nullable=False, default="pending", index=True, comment="状态：pending待处理 running运行中 completed已完成 failed失败 cancelled已取消 timeout超时")
    progress = Column(Integer, default=0, nullable=False, comment="进度0-100")
    progress_message = Column(String(255), nullable=True, comment="进度消息")
    snapshot_data = Column(JSONType, nullable=True, comment="快照数据用于断点续跑")
    input_params = Column(JSONType, nullable=True, comment="输入参数")
    result_preview = Column(Text, nullable=True, comment="结果预览")
    error_message = Column(Text, nullable=True, comment="错误信息")
    estimated_cost = Column(Integer, nullable=True, comment="预估费用")
    actual_cost = Column(Integer, nullable=True, comment="实际费用")
    celery_task_id = Column(String(255), nullable=True, index=True, comment="Celery任务ID，用于取消/终止")
    started_at = Column(Integer, nullable=True, comment="开始时间")
    completed_at = Column(Integer, nullable=True, comment="完成时间")

    user = relationship("User", backref="tasks")
    logs = relationship("TaskLog", back_populates="task", cascade="all, delete-orphan")
    work = relationship("Work", back_populates="task", uselist=False, cascade="all, delete-orphan")

    def start(self):
        """开始任务"""
        self.status = "running"
        self.started_at = int(time.time())
        self.progress = 0

    def update_progress(self, progress: int, message: str = None):
        """更新进度"""
        self.progress = min(max(progress, 0), 100)
        if message:
            self.progress_message = message

    def complete(self, actual_cost: int = None):
        """完成任务"""
        self.status = "completed"
        self.progress = 100
        self.completed_at = int(time.time())
        if actual_cost is not None:
            self.actual_cost = actual_cost

    def fail(self, error_message: str):
        """任务失败"""
        self.status = "failed"
        self.error_message = error_message
        self.completed_at = int(time.time())

    def cancel(self):
        """取消任务"""
        self.status = "cancelled"
        self.completed_at = int(time.time())

    def timeout(self):
        """任务超时"""
        self.status = "timeout"
        self.completed_at = int(time.time())


class TaskLog(BaseModel):
    __tablename__ = "task_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True, comment="任务ID")
    level = Column(String(20), nullable=False, default="info", comment="日志级别：debug info warn error")
    message = Column(Text, nullable=False, comment="日志消息")
    details = Column(JSONType, nullable=True, comment="详细信息")
    timestamp = Column(Integer, default=lambda: int(time.time()), nullable=False, comment="时间戳")

    task = relationship("Task", back_populates="logs")


class Work(BaseModel):
    __tablename__ = "works"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="用户ID")
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True, comment="任务ID")
    parent_id = Column(UUID(as_uuid=True), ForeignKey("works.id", ondelete="SET NULL"), nullable=True, index=True, comment="父成果ID，用于迭代版本")
    tool_id = Column(UUID(as_uuid=True), nullable=True, index=True, comment="工具ID")
    title = Column(String(255), nullable=False, comment="标题")
    description = Column(Text, nullable=True, comment="描述")
    version = Column(Integer, default=1, nullable=False, comment="版本号")
    cover_image = Column(String(255), nullable=True, comment="封面图片URL")
    status = Column(String(20), nullable=False, default="draft", comment="状态：draft草稿 published已发布")
    is_public = Column(Boolean, default=False, nullable=False, comment="是否公开")
    view_count = Column(Integer, default=0, nullable=False, comment="查看次数")
    like_count = Column(Integer, default=0, nullable=False, comment="点赞次数")
    share_count = Column(Integer, default=0, nullable=False, comment="分享次数")
    is_deleted = Column(Boolean, default=False, nullable=False, comment="软删除标记")
    deleted_at = Column(Integer, nullable=True, comment="删除时间戳")

    user = relationship("User", backref="works")
    task = relationship("Task", back_populates="work")
    parent = relationship("Work", remote_side=[id], backref="children")
    files = relationship("WorkFile", back_populates="work", cascade="all, delete-orphan")
    shares = relationship("WorkShare", back_populates="work", cascade="all, delete-orphan")

    def increment_view_count(self):
        """增加查看次数"""
        self.view_count += 1

    def increment_like_count(self):
        """增加点赞次数"""
        self.like_count += 1

    def increment_share_count(self):
        """增加分享次数"""
        self.share_count += 1


class WorkFile(BaseModel):
    __tablename__ = "work_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id", ondelete="CASCADE"), nullable=False, index=True, comment="成果ID")
    file_type = Column(String(20), nullable=False, default="other", comment="文件类型：image图片 audio音频 video视频 pdf文档 psd源文件 other其他")
    file_name = Column(String(255), nullable=False, comment="文件名")
    file_url = Column(String(255), nullable=False, comment="文件URL")
    file_size = Column(Integer, nullable=True, comment="文件大小（字节）")
    page_number = Column(Integer, nullable=True, comment="页码")
    mime_type = Column(String(100), nullable=True, comment="MIME类型")
    duration = Column(Integer, nullable=True, comment="时长（秒，用于音频视频）")
    is_preview = Column(Boolean, default=False, nullable=False, comment="是否为预览文件")

    work = relationship("Work", back_populates="files")


class WorkShare(BaseModel):
    __tablename__ = "work_shares"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id", ondelete="CASCADE"), nullable=False, index=True, comment="成果ID")
    share_type = Column(String(20), nullable=False, default="link", comment="分享类型：public公开 link链接 friends好友")
    share_url = Column(String(255), nullable=True, comment="分享链接")
    password = Column(String(50), nullable=True, comment="分享密码")
    expire_at = Column(Integer, nullable=True, comment="过期时间")
    view_count = Column(Integer, default=0, nullable=False, comment="查看次数")
    like_count = Column(Integer, default=0, nullable=False, comment="点赞次数")
    comment_count = Column(Integer, default=0, nullable=False, comment="评论次数")
    status = Column(String(20), nullable=False, default="pending", comment="状态：pending待审核 approved已通过 rejected已拒绝")
    reviewed_by = Column(UUID(as_uuid=True), nullable=True, comment="审核人ID")
    reviewed_at = Column(Integer, nullable=True, comment="审核时间")

    work = relationship("Work", back_populates="shares")

    def increment_view_count(self):
        """增加查看次数"""
        self.view_count += 1

    def increment_like_count(self):
        """增加点赞次数"""
        self.like_count += 1

    def increment_comment_count(self):
        """增加评论次数"""
        self.comment_count += 1

    def approve(self, reviewer_id: uuid.UUID):
        """审核通过"""
        self.status = "approved"
        self.reviewed_by = reviewer_id
        self.reviewed_at = int(time.time())

    def reject(self, reviewer_id: uuid.UUID):
        """审核拒绝"""
        self.status = "rejected"
        self.reviewed_by = reviewer_id
        self.reviewed_at = int(time.time())
