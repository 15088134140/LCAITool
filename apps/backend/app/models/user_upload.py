"""
用户上传文件模型
用于动态表单文件字段上传，存储文件元数据供执行器读取。
"""
import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class UserUpload(BaseModel):
    """用户上传文件记录"""
    __tablename__ = "user_uploads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="上传用户ID")
    tool_id = Column(UUID(as_uuid=True), nullable=True, index=True, comment="关联工具ID（可选）")
    field_key = Column(String(100), nullable=True, comment="参数字段key（可选）")
    file_name = Column(String(255), nullable=False, comment="原始文件名")
    file_path = Column(Text, nullable=False, comment="存储路径（相对 STORAGE_DIR）")
    file_size = Column(Integer, nullable=False, comment="文件大小（字节）")
    mime_type = Column(String(100), nullable=True, comment="MIME类型")

    user = relationship("User", backref="uploads")

    __table_args__ = (
        Index("idx_upload_user_id", "user_id"),
        Index("idx_upload_tool_id", "tool_id"),
    )
