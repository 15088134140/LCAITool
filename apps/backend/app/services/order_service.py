import uuid
from typing import Optional, List, Tuple
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from app.models.payment import Order, OrderStatus
from app.models.user import User


class OrderService:
    @staticmethod
    async def get_by_id(db: AsyncSession, order_id: uuid.UUID) -> Optional[Order]:
        result = await db.execute(
            select(Order)
            .where(Order.id == order_id)
            .options(selectinload(Order.user))
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_order_no(db: AsyncSession, order_no: str) -> Optional[Order]:
        result = await db.execute(
            select(Order)
            .where(Order.order_no == order_no)
            .options(selectinload(Order.user))
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_multi(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        status: Optional[OrderStatus] = None,
        user_id: Optional[uuid.UUID] = None,
        start_date: Optional[int] = None,
        end_date: Optional[int] = None,
    ) -> Tuple[List[Order], int]:
        query = select(Order).options(selectinload(Order.user))

        if search:
            search_pattern = f"%{search}%"
            query = query.join(User).where(
                or_(
                    Order.order_no.ilike(search_pattern),
                    User.nickname.ilike(search_pattern),
                    User.phone.ilike(search_pattern),
                )
            )
        else:
            query = query.options(selectinload(Order.user))

        if status:
            query = query.where(Order.status == status)

        if user_id:
            query = query.where(Order.user_id == user_id)

        if start_date:
            query = query.where(Order.created_at >= start_date)

        if end_date:
            query = query.where(Order.created_at <= end_date)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Get paginated results
        query = query.offset(skip).limit(limit).order_by(Order.created_at.desc())
        result = await db.execute(query)
        orders = result.scalars().all()

        return orders, total

    @staticmethod
    async def update_status(
        db: AsyncSession,
        order_id: uuid.UUID,
        status: OrderStatus,
        remark: Optional[str] = None,
    ) -> Optional[Order]:
        order = await OrderService.get_by_id(db, order_id)
        if not order:
            return None

        order.status = status
        if remark:
            order.remark = remark

        db.add(order)
        await db.commit()
        await db.refresh(order)
        return order

    @staticmethod
    async def refund_order(
        db: AsyncSession,
        order_id: uuid.UUID,
        refund_reason: str,
    ) -> Tuple[Optional[Order], Optional[str]]:
        """
        订单退款
        返回：(订单对象, 错误信息)
        """
        order = await OrderService.get_by_id(db, order_id)
        if not order:
            return None, "订单不存在"

        if order.status != OrderStatus.PAID:
            return None, "只有已支付订单才能退款"

        # 更新订单状态
        order.status = OrderStatus.REFUNDED
        order.remark = f"退款原因：{refund_reason}"

        # 这里可以添加第三方支付退款逻辑
        # await payment_provider.refund(order)

        db.add(order)
        await db.commit()
        await db.refresh(order)

        return order, None
