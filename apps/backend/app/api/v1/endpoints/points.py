"""
积分管理相关API端点
"""
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.payment import PointTransaction
from app.schemas.payment import PointTransaction as PointTransactionSchema
from app.schemas.common import PaginatedResponse
from app.services.user_service import UserService
from app.services.point_service import PointService
from app.core.exceptions import InsufficientBalanceException


router = APIRouter()


@router.get("/balance", summary="获取积分余额")
async def get_point_balance(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """获取当前用户的积分余额"""
    return {
        "balance": current_user.balance,
        "frozen_balance": current_user.frozen_balance
    }


@router.get("/history", summary="获取积分流水列表")
async def get_point_history(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    type: Optional[str] = Query(None, description="交易类型筛选"),
    start_date: Optional[int] = Query(None, description="开始时间戳"),
    end_date: Optional[int] = Query(None, description="结束时间戳"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """获取积分流水列表，支持分页和筛选"""
    skip = (page - 1) * page_size

    # 构建查询
    query = select(PointTransaction).where(PointTransaction.user_id == current_user.id)

    # 类型筛选
    if type:
        query = query.where(PointTransaction.type == type)

    # 时间范围筛选
    if start_date:
        query = query.where(PointTransaction.created_at >= start_date)
    if end_date:
        query = query.where(PointTransaction.created_at <= end_date)

    # 总数查询
    from sqlalchemy import func
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # 分页查询
    query = query.offset(skip).limit(page_size).order_by(PointTransaction.created_at.desc())
    result = await db.execute(query)
    transactions = result.scalars().all()

    return PaginatedResponse[PointTransactionSchema](
        items=transactions,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/recharge", summary="积分充值")
async def point_recharge(
    amount: int = Query(..., gt=0, description="充值金额"),
    payment_method: str = Query("wechat", description="支付方式"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """积分充值（模拟）"""
    # 这里简化处理，直接增加积分，实际场景需要对接支付系统
    await UserService.adjust_balance(db, current_user.id, amount, f"充值-{payment_method}")

    # 创建流水记录
    await PointService.create_transaction(
        db=db,
        user_id=current_user.id,
        amount=amount,
        transaction_type="recharge",
        reason=f"充值-{payment_method}",
    )

    # 重新获取用户信息
    user = await UserService.get_by_id(db, current_user.id)

    return {
        "balance": user.balance,
        "recharge_amount": amount,
        "message": "充值成功"
    }


@router.post("/consume", summary="积分消费")
async def point_consume(
    amount: int = Query(..., gt=0, description="消费金额"),
    reason: str = Query(..., description="消费原因"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """直接消费积分"""
    # 检查余额
    if current_user.balance < amount:
        raise InsufficientBalanceException()

    # 扣减积分
    await UserService.adjust_balance(db, current_user.id, -amount, reason)

    # 创建流水记录
    await PointService.create_transaction(
        db=db,
        user_id=current_user.id,
        amount=-amount,
        transaction_type="consume",
        reason=reason,
    )

    # 重新获取用户信息
    user = await UserService.get_by_id(db, current_user.id)

    return {
        "balance": user.balance,
        "consumed_amount": amount,
        "message": "消费成功"
    }


@router.post("/freeze", summary="冻结积分")
async def point_freeze(
    amount: int = Query(..., gt=0, description="冻结金额"),
    reason: str = Query(..., description="冻结原因"),
    related_id: Optional[str] = Query(None, description="关联ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """冻结用户积分（用于任务预扣款）"""
    user = await PointService.freeze_points(
        db=db,
        user_id=current_user.id,
        amount=amount,
        reason=reason,
        related_id=related_id
    )

    return {
        "balance": user.balance,
        "frozen_balance": user.frozen_balance,
        "frozen_amount": amount,
        "message": "冻结成功"
    }


@router.post("/settle", summary="结算冻结积分")
async def point_settle(
    amount: int = Query(..., gt=0, description="结算金额"),
    reason: str = Query(..., description="结算原因"),
    related_id: Optional[str] = Query(None, description="关联ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """从冻结余额中结算扣除积分"""
    user = await PointService.settle_frozen_points(
        db=db,
        user_id=current_user.id,
        amount=amount,
        reason=reason,
        related_id=related_id
    )

    return {
        "balance": user.balance,
        "frozen_balance": user.frozen_balance,
        "settled_amount": amount,
        "message": "结算成功"
    }


@router.post("/unfreeze", summary="解冻积分")
async def point_unfreeze(
    amount: int = Query(..., gt=0, description="解冻金额"),
    reason: str = Query(..., description="解冻原因"),
    related_id: Optional[str] = Query(None, description="关联ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """将冻结积分转回可用余额"""
    user = await PointService.unfreeze_points(
        db=db,
        user_id=current_user.id,
        amount=amount,
        reason=reason,
        related_id=related_id
    )

    return {
        "balance": user.balance,
        "frozen_balance": user.frozen_balance,
        "unfrozen_amount": amount,
        "message": "解冻成功"
    }
