import uuid
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class PaymentProvider(str, Enum):
    """支付提供商"""
    WECHAT = "wechat"
    ALIPAY = "alipay"
    SIMULATED = "simulated"


class OrderStatus(str, Enum):
    """订单状态"""
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"
    EXPIRED = "expired"


class ReconciliationStatus(str, Enum):
    """对账状态"""
    PENDING = "pending"
    MATCHED = "matched"
    MISMATCHED = "mismatched"


class PointTransactionType(str, Enum):
    """积分交易类型"""
    RECHARGE = "recharge"
    CONSUME = "consume"
    REFUND = "refund"
    ADJUST = "adjust"
    FREEZE = "freeze"
    UNFREEZE = "unfreeze"
    REWARD = "reward"


# ========== Recharge Package Schemas ==========

class RechargePackageBase(BaseModel):
    name: str = Field(..., max_length=100, description="档位名称")
    description: Optional[str] = Field(None, max_length=255, description="档位描述")
    original_price: float = Field(..., description="原价(元)")
    sale_price: float = Field(..., description="售价(元)")
    base_points: int = Field(..., description="基础积分")
    bonus_points: int = Field(0, description="赠送积分")
    bonus_percentage: int = Field(0, description="赠送比例(0-100)")
    is_popular: bool = Field(False, description="是否热门推荐")
    sort_order: int = Field(0, description="排序顺序")
    is_active: bool = Field(True, description="是否启用")


class RechargePackageCreate(RechargePackageBase):
    pass


class RechargePackageUpdate(RechargePackageBase):
    name: Optional[str] = Field(None, max_length=100)
    original_price: Optional[float] = None
    sale_price: Optional[float] = None
    base_points: Optional[int] = None
    is_active: Optional[bool] = None


class RechargePackage(RechargePackageBase):
    id: uuid.UUID
    created_at: int
    updated_at: int

    model_config = {"from_attributes": True}


# ========== Order Schemas ==========

class OrderBase(BaseModel):
    user_id: uuid.UUID = Field(..., description="用户ID")
    order_no: str = Field(..., max_length=64, description="订单号")
    pay_amount: float = Field(..., description="支付金额(元)")
    base_points: int = Field(..., description="基础积分")
    bonus_points: int = Field(0, description="赠送积分")
    total_points: int = Field(..., description="总积分")
    payment_provider: PaymentProvider = Field(..., description="支付提供商")
    status: OrderStatus = Field(OrderStatus.PENDING, description="订单状态")
    remark: Optional[str] = Field(None, max_length=500, description="备注")


class OrderCreate(BaseModel):
    recharge_package_id: uuid.UUID = Field(..., description="充值档位ID")
    payment_provider: PaymentProvider = Field(..., description="支付提供商")


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    third_party_order_no: Optional[str] = Field(None, max_length=128)
    paid_at: Optional[int] = None
    remark: Optional[str] = Field(None, max_length=500)


class Order(OrderBase):
    id: uuid.UUID
    third_party_order_no: Optional[str] = Field(None, max_length=128)
    paid_at: Optional[int] = None
    expired_at: Optional[int] = None
    client_ip: Optional[str] = Field(None, max_length=50)
    device_info: Optional[str] = Field(None, max_length=255)
    reconciliation_status: ReconciliationStatus = Field(ReconciliationStatus.PENDING)
    reconciled_at: Optional[int] = None
    created_at: int
    updated_at: int

    model_config = {"from_attributes": True}


# ========== Point Transaction Schemas (Complete) ==========

class PointTransactionBase(BaseModel):
    user_id: uuid.UUID = Field(..., description="用户ID")
    amount: int = Field(..., description="变更数量（正数增加，负数扣减）")
    type: PointTransactionType = Field(..., description="交易类型")
    reason: Optional[str] = Field(None, max_length=255, description="变更原因")
    related_id: Optional[str] = Field(None, max_length=100, description="关联ID")
    related_type: Optional[str] = Field(None, max_length=50, description="关联类型")
    idempotency_key: Optional[str] = Field(None, max_length=128, description="幂等键")
    balance_before: int = Field(..., description="变更前余额")
    balance_after: int = Field(..., description="变更后余额")
    operator: Optional[str] = Field(None, max_length=100, description="操作者")
    remark: Optional[str] = Field(None, max_length=500, description="备注")
    order_id: Optional[uuid.UUID] = Field(None, description="关联订单ID")


class PointTransactionCreate(BaseModel):
    user_id: uuid.UUID
    amount: int
    type: str
    reason: Optional[str] = None
    related_id: Optional[str] = None
    related_type: Optional[str] = None
    idempotency_key: Optional[str] = None
    operator: Optional[str] = None
    remark: Optional[str] = None


class PointTransaction(PointTransactionBase):
    id: uuid.UUID
    created_at: int
    updated_at: int

    model_config = {"from_attributes": True}


# ========== Request/Response Schemas ==========

class CreateOrderRequest(BaseModel):
    """创建订单请求"""
    recharge_package_id: uuid.UUID
    payment_provider: PaymentProvider


class CreateOrderResponse(BaseModel):
    """创建订单响应"""
    order_id: uuid.UUID
    order_no: str
    pay_amount: float
    payment_params: dict = Field(default_factory=dict, description="支付参数（前端用于唤起支付）")


class OrderPaymentCallback(BaseModel):
    """支付回调数据"""
    order_no: str
    third_party_order_no: str
    payment_success: bool
    payment_amount: Optional[float] = None
    callback_raw: Optional[dict] = None


class RechargePackageListResponse(BaseModel):
    """充值档位列表响应"""
    packages: list[RechargePackage]
    total: int


class PaymentRequest(BaseModel):
    """发起支付请求"""
    order_id: uuid.UUID


class PaymentResponse(BaseModel):
    """支付响应（前端接收）"""
    success: bool
    order_id: uuid.UUID
    order_no: str
    total_points: int
    payment_provider: str
    is_simulated: bool = True
    message: str = "模拟支付环境，支付已自动完成"


class TransactionHistoryResponse(BaseModel):
    """交易历史记录响应"""
    transactions: list[PointTransaction]
    total: int


class OrderListResponse(BaseModel):
    """订单列表响应"""
    orders: list[Order]
    total: int


class CustomRechargeRequest(BaseModel):
    """自定义充值请求"""
    amount: float = Field(..., ge=1, le=100000, description="充值金额(元)，最小1，最大100000")
    payment_provider: PaymentProvider = Field(PaymentProvider.SIMULATED, description="支付方式")


class CustomRechargeResponse(BaseModel):
    """自定义充值响应"""
    success: bool
    order_no: str
    pay_amount: float
    total_points: int
    balance: float
    message: str = "充值成功"
