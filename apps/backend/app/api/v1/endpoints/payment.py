from typing import Any, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.services.payment_service import PaymentService
from app.schemas.payment import (
    CreateOrderRequest,
    CreateOrderResponse,
    RechargePackage,
    Order,
    PointTransaction,
    PaymentResponse,
    CustomRechargeRequest,
    CustomRechargeResponse,
)
from app.models.payment import Order as OrderModel, OrderStatus
from app.core.exceptions import ResourceNotFoundException, BusinessException

router = APIRouter()


# ============== 1. 充值档位查询 API ==============

@router.get("/packages", summary="获取充值档位列表")
async def get_recharge_packages(
    is_active: Optional[bool] = Query(True, description="是否只显示激活的档位"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """获取所有充值档位，包含价格和赠送积分信息"""
    packages = await PaymentService.list_recharge_packages(db, is_active=is_active)

    return {
        "items": [RechargePackage.model_validate(pkg) for pkg in packages],
        "total": len(packages),
    }


# ============== 2. 订单创建 API ==============

@router.post("/orders", summary="创建充值订单")
async def create_order(
    request: CreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    创建充值订单
    - 选择充值档位
    - 选择支付方式
    - 返回订单号和支付参数
    """
    order = await PaymentService.create_order(
        db,
        user_id=current_user.id,
        recharge_package_id=request.recharge_package_id,
        payment_provider=request.payment_provider
    )

    # 获取支付参数（模拟支付）
    provider = PaymentService.get_provider(request.payment_provider)
    payment_params = await provider.create_payment(order)

    return CreateOrderResponse(
        order_id=order.id,
        order_no=order.order_no,
        pay_amount=float(order.base_points),  # 积分与金额1:1（模拟）
        payment_params=payment_params
    )


# ============== 3. 模拟支付接口 ==============

@router.post("/orders/{order_no}/pay", summary="模拟支付（自动成功）")
async def simulate_payment(
    order_no: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    模拟支付接口：
    - 调用即支付成功
    - 自动发放积分到用户账户
    - 返回支付结果详情
    """
    # 根据订单号获取订单
    order = await PaymentService.get_order_by_no(db, order_no)
    if not order:
        raise ResourceNotFoundException(detail="订单不存在")

    # 验证订单归属
    if order.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权操作此订单"
        )

    # 处理模拟支付
    result = await PaymentService.process_simulated_payment(db, order.id)

    return result


# ============== 4. 订单状态查询 API ==============

@router.get("/orders/{order_no}", summary="查询订单状态")
async def get_order_status(
    order_no: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """查询指定订单的状态详情"""
    order = await PaymentService.get_order_by_no(db, order_no)
    if not order:
        raise ResourceNotFoundException(detail="订单不存在")

    # 验证订单归属
    if order.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此订单"
        )

    return Order.model_validate(order)


# ============== 5. 消费记录 API ==============

@router.get("/transactions", summary="获取积分交易记录")
async def get_transactions(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    type: Optional[str] = Query(None, description="交易类型: recharge/consume/refund"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    获取用户积分交易历史
    - 支持按类型筛选：充值(recharge)、消费(consume)、退款(refund)
    """
    skip = (page - 1) * page_size
    transactions, total = await PaymentService.get_transaction_history(
        db,
        user_id=current_user.id,
        transaction_type=type,
        skip=skip,
        limit=page_size
    )

    return {
        "items": [PointTransaction.model_validate(tx) for tx in transactions],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ============== 6. 自定义充值 API ==============

@router.post("/custom-recharge", summary="自定义充值（一步完成）")
async def custom_recharge(
    request: CustomRechargeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    自定义充值：
    - 输入金额(元)，按 1元=10积分 计算
    - 创建订单 → 模拟支付（同一事务）
    - 积分即时到账
    - 返回订单号和充值后余额
    """
    # 计算积分
    total_points = int(request.amount * 10)

    # 创建订单
    order = OrderModel(
        user_id=current_user.id,
        order_no=PaymentService._generate_order_no(),
        pay_amount=float(request.amount),
        base_points=total_points,
        bonus_points=0,
        total_points=total_points,
        payment_provider=request.payment_provider,
        status=OrderStatus.PENDING,
    )
    db.add(order)
    await db.flush()

    # 模拟支付（同一事务）
    result = await PaymentService.process_simulated_payment(db, order.id)

    # 获取更新后的用户余额
    await db.refresh(current_user)

    return CustomRechargeResponse(
        success=True,
        order_no=order.order_no,
        pay_amount=float(request.amount),
        total_points=total_points,
        balance=float(current_user.balance),
        message="充值成功"
    )


# ============== 7. 用户订单列表 API ==============

@router.get("/orders", summary="获取用户订单列表")
async def get_user_orders(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: Optional[str] = Query(None, description="订单状态: pending/paid/failed/refunded"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """获取当前用户的充值订单列表"""
    skip = (page - 1) * page_size
    order_status = None
    if status:
        try:
            order_status = OrderStatus(status)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"无效的订单状态: {status}")

    orders, total = await PaymentService.get_user_orders(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=page_size,
        status=order_status
    )

    return {
        "items": [Order.model_validate(o) for o in orders],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
