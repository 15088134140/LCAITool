import uuid
from sqlalchemy import Boolean, Column, String, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel


class User(BaseModel):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False, comment="用户名")
    email = Column(String(100), unique=True, index=True, nullable=True, comment="邮箱")
    phone = Column(String(20), unique=True, index=True, nullable=True, comment="手机号")
    password_hash = Column(String(255), nullable=False, comment="密码哈希")
    avatar_url = Column(String(255), nullable=True, comment="头像URL")
    nickname = Column(String(50), nullable=True, comment="昵称")
    real_name = Column(String(50), nullable=True, comment="真实姓名")
    id_card_number = Column(String(255), nullable=True, comment="身份证号(加密)")
    id_card_verified = Column(Boolean, default=False, nullable=False, comment="是否实名认证")
    points = Column(Integer, default=0, nullable=False, comment="积分余额")
    is_active = Column(Boolean, default=True, nullable=False, comment="是否激活")
    is_admin = Column(Boolean, default=False, nullable=False, comment="是否管理员")
    wechat_openid = Column(String(100), nullable=True, comment="微信OpenID")
    inviter_id = Column(UUID(as_uuid=True), nullable=True, comment="邀请人ID")
    invite_code = Column(String(32), nullable=True, unique=True, comment="我的邀请码")
    language_preference = Column(String(10), default="zh-CN", nullable=False, comment="语言偏好")
    total_checkin_days = Column(Integer, default=0, nullable=False, comment="累计签到天数")
