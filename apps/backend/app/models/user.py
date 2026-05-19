import uuid
from sqlalchemy import Boolean, Column, String, Integer, ForeignKey, Table, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


user_roles = Table(
    "user_roles",
    BaseModel.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    comment="用户角色关联表"
)


class Role(BaseModel):
    __tablename__ = "roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False, comment="角色名称")
    description = Column(String(255), nullable=True, comment="角色描述")
    permissions = Column(Text, nullable=True, comment="权限列表(JSON格式)")

    users = relationship("User", secondary=user_roles, back_populates="roles")


class User(BaseModel):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    openid = Column(String(100), unique=True, index=True, nullable=True, comment="微信OpenID")
    phone = Column(String(20), unique=True, index=True, nullable=True, comment="手机号")
    email = Column(String(100), unique=True, index=True, nullable=True, comment="邮箱")
    nickname = Column(String(50), nullable=True, comment="昵称")
    avatar = Column(String(255), nullable=True, comment="头像URL")
    password_hash = Column(String(255), nullable=True, comment="密码哈希")
    id_card_name = Column(String(50), nullable=True, comment="身份证姓名")
    id_card_number_encrypted = Column(String(255), nullable=True, comment="身份证号(AES-256加密)")
    id_card_verified = Column(Boolean, default=False, nullable=False, comment="是否实名认证")
    balance = Column(Integer, default=0, nullable=False, comment="积分余额")
    frozen_balance = Column(Integer, default=0, nullable=False, comment="冻结积分")
    status = Column(Integer, default=1, nullable=False, comment="状态：1正常 0禁用")
    version = Column(Integer, default=0, nullable=False, comment="乐观锁版本号")

    roles = relationship("Role", secondary=user_roles, back_populates="users")
    transactions = relationship("PointTransaction", back_populates="user", cascade="all, delete-orphan")


class PointTransaction(BaseModel):
    __tablename__ = "point_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="用户ID")
    amount = Column(Integer, nullable=False, comment="变更数量（正数增加，负数扣减）")
    type = Column(String(20), nullable=False, comment="类型：recharge充值 consume消费 refund退款 adjust调整")
    reason = Column(String(255), nullable=True, comment="变更原因")
    related_id = Column(String(100), nullable=True, comment="关联ID（订单ID、任务ID等）")

    user = relationship("User", back_populates="transactions")
