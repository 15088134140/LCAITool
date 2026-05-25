from pydantic import BaseModel, field_validator
from typing import Optional
import uuid


class ApiKeyCreate(BaseModel):
    name: str


class ApiKeyStatusUpdate(BaseModel):
    status: str  # "active" or "disabled"

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ("active", "disabled"):
            raise ValueError(f"status must be 'active' or 'disabled', got '{v}'")
        return v


class ApiKeyResponse(BaseModel):
    id: uuid.UUID
    name: str
    key_prefix: str
    status: str
    last_used_at: Optional[int] = None
    created_at: int

    class Config:
        from_attributes = True


class ApiKeyCreatedResponse(ApiKeyResponse):
    key: str  # 明文密钥，仅创建时返回
    warning: str = "请立即复制密钥，关闭后不再显示"


class ApiKeyRevealResponse(BaseModel):
    id: uuid.UUID
    key: str
