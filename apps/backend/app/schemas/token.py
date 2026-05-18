from pydantic import BaseModel, Field
from typing import Optional


class Token(BaseModel):
    access_token: str = Field(..., description="访问令牌")
    refresh_token: str = Field(..., description="刷新令牌")
    token_type: str = Field(default="bearer", description="令牌类型")


class TokenPayload(BaseModel):
    sub: Optional[str] = Field(None, description="用户ID")
    type: Optional[str] = Field(None, description="令牌类型")


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="刷新令牌")
