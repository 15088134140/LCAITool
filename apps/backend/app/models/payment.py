import uuid
import enum
from sqlalchemy import (
    Column, String, Integer, ForeignKey, Text, Boolean, Numeric, Index, Enum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.mixins import JSONType


class PaymentProvider(str, enum.Enum):
    """支付提供商枚举"""
    WECHAT = "wechat"
    ALIPAY = "alipay"
    SIMULATED = "simulated"


class OrderStatus(str, enum.Enum):
    """订单状态枚举"""
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"
    EXPIRED = "expired"


class ReconciliationStatus(str, enum.Enum):
    """对账状态枚举"""
    PENDING = "pending"
    MATCHED = "matched"
    MISMATCHED = "mismatched"


class PointTransactionType(str, enum.Enum):
    """积分交易类型枚举"""
    RECHARGE = "recharge"
    CONSUME = "consume"
    REFUND = "refund"
    ADJUST = "adjust"
    FREEZE = "freeze"
    UNFREEZE = "unfreeze"
    REWARD = "reward"


class Order(BaseModel):
    """订单表"""
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="用户ID")
    order_no = Column(String(64), unique=True, index=True, nullable=False, comment="订单号")
    third_party_order_no = Column(String(128), nullable=True, index=True, comment="第三方支付订单号")
    pay_amount = Column(Numeric(10, 2), nullable=False, comment="支付金额(元)")
    base_points = Column(Integer, nullable=False, comment="基础积分")
    bonus_points = Column(Integer, default=0, nullable=False, comment="赠送积分")
    total_points = Column(Integer, nullable=False, comment="总积分(基础+赠送)")
    payment_provider = Column(Enum(PaymentProvider), nullable=False, comment="支付提供商")
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False, index=True, comment="订单状态")
    paid_at = Column(Integer, nullable=True, comment="支付时间")
    expired_at = Column(Integer, nullable=True, comment="过期时间")
    client_ip = Column(String(50), nullable=True, comment="客户端IP")
    device_info = Column(String(255), nullable=True, comment="设备信息")
    callback_raw = Column(JSONType, nullable=True, comment="支付回调原始数据(JSON)")
    reconciliation_status = Column(Enum(ReconciliationStatus), default=ReconciliationStatus.PENDING, nullable=False, comment="对账状态")
    reconciled_at = Column(Integer, nullable=True, comment="对账时间")
    remark = Column(String(500), nullable=True, comment="备注")

    user = relationship("User", backref="orders")
    transactions = relationship("PointTransaction", back_populates="order", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_order_user_id", "user_id"),
        Index("idx_order_status", "status"),
        Index("idx_order_created_at", "created_at"),
    )


class RechargePackage(BaseModel):
    """充值档位配置表"""
    __tablename__ = "recharge_packages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(100), nullable=False, comment="档位名称")
    description = Column(String(255), nullable=True, comment="档位描述")
    original_price = Column(Numeric(10, 2), nullable=False, comment="原价(元)")
    sale_price = Column(Numeric(10, 2), nullable=False, comment="售价(元)")
    base_points = Column(Integer, nullable=False, comment="基础积分")
    bonus_points = Column(Integer, default=0, nullable=False, comment="赠送积分")
    bonus_percentage = Column(Integer, default=0, nullable=False, comment="赠送比例(0-100)")
    is_popular = Column(Boolean, default=False, nullable=False, comment="是否热门推荐")
    sort_order = Column(Integer, default=0, nullable=False, comment="排序顺序，数字越小越靠前")
    is_active = Column(Boolean, default=True, nullable=False, comment="是否启用")

    __table_args__ = (
        Index("idx_package_sort_order", "sort_order"),
        Index("idx_package_is_active", "is_active"),
    )


class PointTransaction(BaseModel):
    """积分交易记录表（完整版本）"""
    __tablename__ = "point_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="用户ID")
    amount = Column(Integer, nullable=False, comment="变更数量（正数增加，负数扣减）")
    type = Column(Enum(PointTransactionType), nullable=False, comment="交易类型")
    reason = Column(String(255), nullable=True, comment="变更原因")
    related_id = Column(String(100), nullable=True, comment="关联ID（订单ID、任务ID等）")
    related_type = Column(String(50), nullable=True, comment="关联类型（order/task等）")
    idempotency_key = Column(String(128), nullable=True, unique=True, index=True, comment="幂等键，用于防止重复交易")
    balance_before = Column(Integer, nullable=False, comment="变更前余额")
    balance_after = Column(Integer, nullable=False, comment="变更后余额")
    operator = Column(String(100), nullable=True, comment="操作者（系统或管理员ID）")
    remark = Column(String(500), nullable=True, comment="备注")
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True, comment="关联订单ID")

    user = relationship("User", back_populates="transactions")
    order = relationship("Order", back_populates="transactions")

    __table_args__ = (
        Index("idx_transaction_user_id", "user_id"),
        Index("idx_transaction_type", "type"),
        Index("idx_transaction_created_at", "created_at"),
        Index("idx_transaction_related", "related_id", "related_type"),
    )
