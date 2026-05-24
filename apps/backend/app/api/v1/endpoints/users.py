from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.schemas.user import (
    User as UserSchema,
    UserUpdate,
    UserIdVerifyRequest,
    UserIdVerifyResponse,
    UserBalanceResponse,
    ChangePasswordRequest,
    ChangePhoneRequest,
    SendCodeRequest,
    CheckinStatusResponse,
    CheckinResponse,
    InviteInfoResponse,
    InviteRecord,
)
from app.schemas.stats import UserStatsResponse
from app.schemas.payment import PointTransaction as PointTransactionSchema
from app.services.user_service import UserService
from app.services.point_service import PointService
from app.core.security import verify_password, get_password_hash

router = APIRouter()


@router.get("/me", response_model=UserSchema, summary="获取当前用户信息")
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return current_user


@router.put("/me", response_model=UserSchema, summary="更新当前用户信息")
async def update_current_user(
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    user = await UserService.update(db, current_user.id, user_in)
    return user


@router.post("/verify-id", response_model=UserIdVerifyResponse, summary="实名认证提交")
async def verify_id(
    request: UserIdVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    await UserService.verify_id_card(db, current_user.id, request)

    # 记录积分流水
    await PointService.create_transaction(
        db=db,
        user_id=current_user.id,
        amount=50,
        transaction_type="reward",
        reason="实名认证奖励",
    )

    # 获取脱敏后的认证信息
    return await UserService.get_id_verify_info(db, current_user.id)


@router.get("/balance", response_model=UserBalanceResponse, summary="查询积分余额")
async def get_balance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    balance = await UserService.get_balance(db, current_user.id)
    return {"balance": balance}


@router.get("/transactions", summary="积分流水")
async def get_transactions(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    skip = (page - 1) * page_size
    transactions, total = await PointService.get_by_user_id(
        db, current_user.id, skip=skip, limit=page_size
    )
    return {
        "items": [PointTransactionSchema.model_validate(t) for t in transactions],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/stats", response_model=UserStatsResponse, summary="获取用户统计数据")
async def get_user_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """返回用户统计数据：注册天数、今日次数、作品总数、累计消费、奖励积分"""
    return await UserService.get_user_stats(db, current_user.id)


@router.post("/change-password", summary="修改密码")
async def change_password(
    request: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    if not current_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前用户未设置密码",
        )

    if not verify_password(request.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="原密码错误",
        )

    new_hash = get_password_hash(request.new_password)
    current_user.password_hash = new_hash
    await db.commit()

    return {"message": "密码修改成功"}


@router.post("/send-code", summary="发送手机验证码")
async def send_verification_code(
    request: SendCodeRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    # TODO: 集成短信服务商
    # 开放访问：注册时需要发送验证码，无需登录
    # 开发环境下，验证码固定为 123456
    return {"message": "验证码已发送", "expire_minutes": 5}


@router.post("/change-phone", summary="更换手机号")
async def change_phone(
    request: ChangePhoneRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    # TODO: 验证短信验证码，开发环境下固定为 123456
    if request.code != "123456":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码错误",
        )

    current_user.phone = request.phone
    await db.commit()

    return {"message": "手机号更换成功", "phone": request.phone}


@router.get("/checkin/status", response_model=CheckinStatusResponse, summary="查询签到状态")
async def get_checkin_status(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return await UserService.get_checkin_status(current_user)


@router.post("/checkin", response_model=CheckinResponse, summary="执行签到")
async def do_checkin(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return await UserService.do_checkin(db, current_user)


@router.get("/invite/info", response_model=InviteInfoResponse, summary="我的邀请信息")
async def get_invite_info(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return await UserService.get_invite_info(db, current_user)


@router.get("/invite/list", summary="邀请记录列表")
async def get_invite_list(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return await UserService.get_invite_list(db, current_user)
