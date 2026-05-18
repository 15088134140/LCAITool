import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserBase(BaseModel):
    username: Optional[str] = Field(None, max_length=50, description="用户名")
    email: Optional[EmailStr] = Field(None, max_length=100, description="邮箱")
    phone: Optional[str] = Field(None, max_length=20, description="手机号")
    nickname: Optional[str] = Field(None, max_length=50, description="昵称")
    avatar_url: Optional[str] = Field(None, max_length=255, description="头像URL")


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    password: str = Field(..., min_length=6, max_length=100, description="密码")
    email: Optional[EmailStr] = Field(None, max_length=100, description="邮箱")


class UserLogin(BaseModel):
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")


class UserUpdate(UserBase):
    pass


class UserInDBBase(UserBase):
    id: uuid.UUID
    is_active: bool
    is_admin: bool
    id_card_verified: bool
    points: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class User(UserInDBBase):
    pass


class UserInDB(UserInDBBase):
    password_hash: str
