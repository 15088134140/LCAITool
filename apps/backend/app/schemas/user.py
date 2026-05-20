import uuid
from typing import Optional, Any
from pydantic import BaseModel, EmailStr, Field, model_validator


class UserBase(BaseModel):
    phone: Optional[str] = Field(None, max_length=20, description="手机号")
    email: Optional[EmailStr] = Field(None, max_length=100, description="邮箱")
    nickname: Optional[str] = Field(None, max_length=50, description="昵称")
    avatar: Optional[str] = Field(None, max_length=255, description="头像URL")


class UserCreate(BaseModel):
    """用户注册 - 支持用户名密码或手机号验证码"""
    username: Optional[str] = Field(None, max_length=50, description="用户名")
    nickname: Optional[str] = Field(None, max_length=50, description="昵称")
    password: str = Field(..., min_length=6, max_length=100, description="密码")
    phone: Optional[str] = Field(None, max_length=11, description="手机号")
    code: Optional[str] = Field(None, max_length=6, description="验证码")
    email: Optional[EmailStr] = Field(None, max_length=100, description="邮箱")

    @model_validator(mode="after")
    def check_username_or_phone(self) -> "UserCreate":
        if not self.username and not self.phone:
            raise ValueError("注册需要提供用户名或手机号")

        if self.username and len(self.username) < 3:
            raise ValueError("用户名长度至少3个字符")

        if self.phone:
            if len(self.phone) != 11:
                raise ValueError("手机号长度必须为11位")
            if not self.code:
                raise ValueError("手机号注册需要提供验证码")
            if self.code and len(self.code) < 4:
                raise ValueError("验证码长度至少4位")

        if self.nickname and len(self.nickname) < 2:
            raise ValueError("昵称长度至少2个字符")

        return self


class UserLogin(BaseModel):
    """用户登录"""
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")


class WechatLoginRequest(BaseModel):
    """微信登录请求"""
    code: str = Field(..., description="微信授权码")


class UserUpdate(UserBase):
    """更新用户信息"""
    pass


class UserIdVerifyRequest(BaseModel):
    """实名认证请求"""
    real_name: str = Field(..., min_length=2, max_length=50, description="真实姓名")
    id_card_number: str = Field(..., min_length=15, max_length=18, description="身份证号")


class UserIdVerifyResponse(BaseModel):
    """实名认证响应"""
    id_card_verified: bool = Field(..., description="是否已实名认证")
    real_name: Optional[str] = Field(None, description="真实姓名（脱敏）")
    id_card_number: Optional[str] = Field(None, description="身份证号（脱敏）")


class UserBalanceResponse(BaseModel):
    """积分余额响应"""
    balance: int = Field(..., description="积分余额")


class UserInDBBase(UserBase):
    id: uuid.UUID
    id_card_verified: bool
    balance: int
    status: int
    created_at: int
    updated_at: int

    model_config = {"from_attributes": True}


class User(UserInDBBase):
    """用户信息（对外）"""
    pass


class UserInDB(UserInDBBase):
    """用户信息（数据库）"""
    password_hash: str
    id_card_name: Optional[str]
    id_card_number_encrypted: Optional[str]


class RoleBase(BaseModel):
    name: str = Field(..., max_length=50, description="角色名称")
    description: Optional[str] = Field(None, max_length=255, description="角色描述")
    permissions: Optional[str] = Field(None, description="权限列表(JSON)")


class RoleCreate(RoleBase):
    pass


class RoleUpdate(RoleBase):
    pass


class Role(RoleBase):
    id: uuid.UUID
    created_at: int
    updated_at: int

    model_config = {"from_attributes": True}


class UserRoleAssignRequest(BaseModel):
    """分配用户角色"""
    role_ids: list[uuid.UUID] = Field(..., description="角色ID列表")


class AdjustBalanceRequest(BaseModel):
    """调整积分"""
    amount: int = Field(..., description="变更数量（正数增加，负数扣减）")
    reason: str = Field(..., max_length=255, description="变更原因")


class ChangePasswordRequest(BaseModel):
    """修改密码请求"""
    old_password: str = Field(..., min_length=6, max_length=100, description="原密码")
    new_password: str = Field(..., min_length=6, max_length=100, description="新密码")


class SendCodeRequest(BaseModel):
    """发送验证码请求"""
    phone: str = Field(..., max_length=20, description="手机号")


class ChangePhoneRequest(BaseModel):
    """更换手机号请求"""
    phone: str = Field(..., max_length=20, description="新手机号")
    code: str = Field(..., max_length=10, description="验证码")
