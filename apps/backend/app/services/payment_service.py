import uuid
import time
from typing import Optional, List, Tuple
from abc import ABC, abstractmethod
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, and_

from app.models.payment import (
    Order, RechargePackage, PointTransaction,
    PaymentProvider, OrderStatus, PointTransactionType
)
from app.models.user import User
from app.schemas.payment import (
    RechargePackageCreate, RechargePackageUpdate,
    OrderPaymentCallback, PaymentResponse
)
from app.services.point_service import PointService
from app.core.exceptions import (
    BusinessException, ResourceNotFoundException,
    UserNotFoundException
)


# ============ Payment Provider Abstraction ============

class BasePaymentProvider(ABC):
    """支付提供商基类 - 为后续接入微信/支付宝预留接口"""

    @abstractmethod
    async def create_payment(self, order: Order, **kwargs) -> dict:
        """创建支付"""
        pass

    @abstractmethod
    async def verify_callback(self, callback_data: dict) -> Tuple[bool, dict]:
        """验证回调签名"""
        pass

    @abstractmethod
    async def query_order_status(self, order_no: str) -> Tuple[bool, Optional[float]]:
        """查询订单状态"""
        pass


class SimulatedPaymentProvider(BasePaymentProvider):
    """模拟支付提供商 - MVP版本使用"""

    async def create_payment(self, order: Order, **kwargs) -> dict:
        """创建模拟支付 - 直接返回成功参数"""
        return {
            "payment_type": "simulated",
            "is_simulated": True,
            "message": "模拟支付环境，点击支付按钮即可自动完成",
            "auto_complete": True
        }

    async def verify_callback(self, callback_data: dict) -> Tuple[bool, dict]:
        """验证模拟支付回调"""
        return True, callback_data

    async def query_order_status(self, order_no: str) -> Tuple[bool, Optional[float]]:
        """查询模拟支付订单状态 - 始终返回成功"""
        return True, None


# ============ Payment Provider Factory ============

class PaymentProviderFactory:
    """支付提供商工厂"""

    _providers = {
        PaymentProvider.SIMULATED: SimulatedPaymentProvider(),
        # 预留微信、支付宝接入位置
        # PaymentProvider.WECHAT: WechatPaymentProvider(),
        # PaymentProvider.ALIPAY: AlipayPaymentProvider(),
    }

    @classmethod
    def get_provider(cls, provider_type: PaymentProvider) -> BasePaymentProvider:
        """获取支付提供商实例"""
        provider = cls._providers.get(provider_type)
        if not provider:
            raise BusinessException(detail=f"不支持的支付方式: {provider_type}")
        return provider


# ============ Payment Service ============

class PaymentService:
    """支付服务"""

    # ============ Order Management ============

    @staticmethod
    def _generate_order_no() -> str:
        """生成订单号: 时间戳 + 随机字符串"""
        timestamp = str(int(time.time() * 1000))
        random_str = str(uuid.uuid4().hex[:8].upper())
        return f"ORD{timestamp}{random_str}"

    @staticmethod
    async def create_order(
        db: AsyncSession,
        user_id: uuid.UUID,
        recharge_package_id: uuid.UUID,
        payment_provider: PaymentProvider = PaymentProvider.SIMULATED,
        client_ip: Optional[str] = None,
        device_info: Optional[str] = None
    ) -> Order:
        """创建充值订单"""
        # 验证用户存在
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise UserNotFoundException()

        # 验证充值档位存在且激活
        package_result = await db.execute(
            select(RechargePackage).where(
                and_(
                    RechargePackage.id == recharge_package_id,
                    RechargePackage.is_active == True
                )
            )
        )
        package = package_result.scalar_one_or_none()
        if not package:
            raise ResourceNotFoundException(detail="充值档位不存在或已下架")

        # 计算总积分
        total_points = package.base_points + package.bonus_points

        # 创建订单
        order = Order(
            user_id=user_id,
            order_no=PaymentService._generate_order_no(),
            pay_amount=float(package.sale_price),
            base_points=package.base_points,
            bonus_points=package.bonus_points,
            total_points=total_points,
            payment_provider=payment_provider,
            status=OrderStatus.PENDING,
            client_ip=client_ip,
            device_info=device_info
        )
        db.add(order)
        await db.commit()
        await db.refresh(order)

        return order

    @staticmethod
    async def process_simulated_payment(db: AsyncSession, order_id: uuid.UUID) -> PaymentResponse:
        """处理模拟支付 - 核心方法：直接标记支付成功并发放积分（同一事务）"""
        # 获取订单并加行级锁
        order_result = await db.execute(
            select(Order).where(Order.id == order_id).with_for_update()
        )
        order = order_result.scalar_one_or_none()
        if not order:
            raise ResourceNotFoundException(detail="订单不存在")

        # 检查订单状态
        if order.status == OrderStatus.PAID:
            return PaymentResponse(
                success=True,
                order_id=order.id,
                order_no=order.order_no,
                total_points=order.total_points,
                payment_provider=order.payment_provider,
                is_simulated=True,
                message="订单已支付完成"
            )

        if order.status != OrderStatus.PENDING:
            raise BusinessException(detail=f"订单状态不允许支付: {order.status}")

        # === 同一事务中完成：订单更新 + 积分发放 + 流水记录 ===
        now = int(time.time())

        # 1. 更新订单状态为已支付
        order.status = OrderStatus.PAID
        order.paid_at = now
        order.third_party_order_no = f"SIM{int(time.time() * 1000)}"

        # 2. 发放积分到用户账户（使用行级锁）
        user_result = await db.execute(
            select(User).where(User.id == order.user_id).with_for_update()
        )
        user = user_result.scalar_one_or_none()
        if not user:
            raise UserNotFoundException()
        user.balance += order.total_points

        # 3. 记录积分交易流水 - base points
        base_tx = PointTransaction(
            user_id=order.user_id,
            amount=order.base_points,
            type=PointTransactionType.RECHARGE,
            reason="充值基础积分",
            related_id=str(order.id),
            related_type="order",
            balance_before=user.balance - order.total_points,
            balance_after=user.balance,
            operator="system",
            remark=f"订单号: {order.order_no}"
        )
        db.add(base_tx)

        # 4. 记录赠送积分流水（如果有）
        if order.bonus_points > 0:
            bonus_tx = PointTransaction(
                user_id=order.user_id,
                amount=order.bonus_points,
                type=PointTransactionType.REWARD,
                reason="充值赠送积分",
                related_id=str(order.id),
                related_type="order",
                balance_before=user.balance,
                balance_after=user.balance,
                operator="system",
                remark=f"档位活动赠送积分"
            )
            db.add(bonus_tx)

        # 5. 统一提交
        await db.commit()

        # 重新获取订单
        await db.refresh(order)

        return PaymentResponse(
            success=True,
            order_id=order.id,
            order_no=order.order_no,
            total_points=order.total_points,
            payment_provider=order.payment_provider,
            is_simulated=True,
            message="模拟支付环境，支付已自动完成"
        )

    @staticmethod
    async def handle_payment_callback(
        db: AsyncSession,
        order_id: uuid.UUID,
        callback_data: OrderPaymentCallback
    ) -> bool:
        """处理支付回调"""
        # 获取订单
        order_result = await db.execute(
            select(Order).where(Order.id == order_id).with_for_update()
        )
        order = order_result.scalar_one_or_none()
        if not order:
            raise ResourceNotFoundException(detail="订单不存在")

        # 如果已经支付成功，幂等返回
        if order.status == OrderStatus.PAID:
            return True

        # 模拟支付环境下直接标记成功（同一事务）
        if callback_data.payment_success:
            # 1. 更新订单
            now = int(time.time())
            order.status = OrderStatus.PAID
            order.paid_at = now
            order.third_party_order_no = callback_data.third_party_order_no
            order.callback_raw = callback_data.callback_raw

            # 2. 发放积分（使用行级锁）
            user_result = await db.execute(
                select(User).where(User.id == order.user_id).with_for_update()
            )
            user = user_result.scalar_one_or_none()
            if user:
                user.balance += order.total_points

            # 3. 记录交易流水
            base_tx = PointTransaction(
                user_id=order.user_id,
                amount=order.base_points,
                type=PointTransactionType.RECHARGE,
                reason="充值基础积分",
                related_id=str(order.id),
                related_type="order",
                operator="system",
                balance_before=user.balance - order.total_points if user else 0,
                balance_after=user.balance if user else order.total_points,
            )
            db.add(base_tx)

            if order.bonus_points > 0:
                bonus_tx = PointTransaction(
                    user_id=order.user_id,
                    amount=order.bonus_points,
                    type=PointTransactionType.REWARD,
                    reason="充值赠送积分",
                    related_id=str(order.id),
                    related_type="order",
                    operator="system",
                    balance_before=user.balance if user else 0,
                    balance_after=user.balance if user else order.bonus_points,
                )
                db.add(bonus_tx)

            # 统一提交
            await db.commit()
            return True
        else:
            # 支付失败
            order.status = OrderStatus.FAILED
            order.callback_raw = callback_data.callback_raw
            await db.commit()
            return False

    @staticmethod
    async def get_order(db: AsyncSession, order_id: uuid.UUID) -> Optional[Order]:
        """获取订单详情"""
        result = await db.execute(select(Order).where(Order.id == order_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_order_by_no(db: AsyncSession, order_no: str) -> Optional[Order]:
        """根据订单号获取订单"""
        result = await db.execute(select(Order).where(Order.order_no == order_no))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_orders(
        db: AsyncSession,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 20,
        status: Optional[OrderStatus] = None
    ) -> Tuple[List[Order], int]:
        """获取用户订单列表"""
        query = select(Order).where(Order.user_id == user_id)

        if status:
            query = query.where(Order.status == status)

        # 获取总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # 分页查询
        query = query.offset(skip).limit(limit).order_by(Order.created_at.desc())
        result = await db.execute(query)
        orders = result.scalars().all()

        return orders, total

    @staticmethod
    async def sync_order_status(db: AsyncSession, order_id: uuid.UUID) -> OrderStatus:
        """同步订单状态"""
        order = await PaymentService.get_order(db, order_id)
        if not order:
            raise ResourceNotFoundException(detail="订单不存在")

        # 如果已经是终态，直接返回
        if order.status in [OrderStatus.PAID, OrderStatus.FAILED, OrderStatus.REFUNDED, OrderStatus.EXPIRED]:
            return order.status

        # 模拟支付环境下 pending 订单自动转为 paid
        if order.payment_provider == PaymentProvider.SIMULATED and order.status == OrderStatus.PENDING:
            await PaymentService.process_simulated_payment(db, order_id)
            return OrderStatus.PAID

        return order.status

    # ============ Recharge Package Management ============

    @staticmethod
    async def list_recharge_packages(
        db: AsyncSession,
        is_active: Optional[bool] = None
    ) -> List[RechargePackage]:
        """获取充值档位列表"""
        query = select(RechargePackage)

        if is_active is not None:
            query = query.where(RechargePackage.is_active == is_active)

        query = query.order_by(RechargePackage.sort_order.asc(), RechargePackage.created_at.desc())
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_recharge_package(db: AsyncSession, package_id: uuid.UUID) -> Optional[RechargePackage]:
        """获取充值档位详情"""
        result = await db.execute(select(RechargePackage).where(RechargePackage.id == package_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def create_recharge_package(db: AsyncSession, package_in: RechargePackageCreate) -> RechargePackage:
        """创建充值档位"""
        package = RechargePackage(**package_in.model_dump())
        db.add(package)
        await db.commit()
        await db.refresh(package)
        return package

    @staticmethod
    async def update_recharge_package(
        db: AsyncSession,
        package_id: uuid.UUID,
        package_in: RechargePackageUpdate
    ) -> RechargePackage:
        """更新充值档位"""
        result = await db.execute(
            select(RechargePackage).where(RechargePackage.id == package_id)
        )
        package = result.scalar_one_or_none()
        if not package:
            raise ResourceNotFoundException(detail="充值档位不存在")

        update_data = package_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(package, field, value)

        await db.commit()
        await db.refresh(package)
        return package

    @staticmethod
    async def delete_recharge_package(db: AsyncSession, package_id: uuid.UUID) -> bool:
        """删除充值档位（软删除：标记为未激活）"""
        result = await db.execute(
            select(RechargePackage).where(RechargePackage.id == package_id)
        )
        package = result.scalar_one_or_none()
        if not package:
            raise ResourceNotFoundException(detail="充值档位不存在")

        package.is_active = False
        await db.commit()
        return True

    # ============ Transaction History ============

    @staticmethod
    async def get_transaction_history(
        db: AsyncSession,
        user_id: uuid.UUID,
        transaction_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[PointTransaction], int]:
        """获取用户交易历史记录"""
        query = select(PointTransaction).where(PointTransaction.user_id == user_id)

        if transaction_type:
            query = query.where(PointTransaction.type == transaction_type)

        # 获取总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # 分页查询
        query = query.offset(skip).limit(limit).order_by(PointTransaction.created_at.desc())
        result = await db.execute(query)
        transactions = result.scalars().all()

        return transactions, total
