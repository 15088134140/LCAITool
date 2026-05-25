import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel


class ApiKey(BaseModel):
    __tablename__ = "api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False, comment="密钥名称")
    key_prefix = Column(String(10), nullable=False, comment="密钥前缀，用于列表脱敏显示")
    key_hash = Column(String(128), nullable=False, comment="SHA-256哈希")
    key_encrypted = Column(Text, nullable=False, comment="AES-256加密的密钥明文")
    status = Column(String(10), nullable=False, default="active", comment="active/disabled")
    last_used_at = Column(Integer, nullable=True, comment="最后使用时间戳")
