import hashlib
import secrets
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.models.api_key import ApiKey
from app.models.user import User
from app.schemas.api_key import (
    ApiKeyCreate,
    ApiKeyCreatedResponse,
    ApiKeyResponse,
    ApiKeyRevealResponse,
    ApiKeyStatusUpdate,
)
from app.schemas.payment import PointTransaction as PointTransactionSchema
from app.schemas.stats import UserStatsResponse
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
from app.services.user_service import UserService
from app.services.point_service import PointService
from app.core.security import verify_password, get_password_hash, mask_id_card_encrypted, aes_encrypt, aes_decrypt

router = APIRouter()


@router.get("/me", response_model=UserSchema, summary="获取当前用户信息")
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    # 脱敏身份证号后返回
    if current_user.id_card_number_encrypted:
        current_user.id_card_number = mask_id_card_encrypted(current_user.id_card_number_encrypted)
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


# ==================== API Key 管理 ====================


@router.get("/api-keys", response_model=list[ApiKeyResponse], summary="获取API Key列表")
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """获取当前用户的所有 API Key，按创建时间倒序排列"""
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.user_id == current_user.id)
        .order_by(ApiKey.created_at.desc())
    )
    keys = result.scalars().all()
    return [ApiKeyResponse.model_validate(k) for k in keys]


@router.post(
    "/api-keys",
    response_model=ApiKeyCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建API Key",
)
async def create_api_key(
    body: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """创建新的 API Key，返回明文密钥（仅创建时返回一次）"""
    raw_key = "lcai_" + secrets.token_hex(20)
    prefix = raw_key[:10]
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_encrypted = aes_encrypt(raw_key)

    api_key = ApiKey(
        user_id=current_user.id,
        name=body.name,
        key_prefix=prefix,
        key_hash=key_hash,
        key_encrypted=key_encrypted,
        status="active",
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    response = ApiKeyCreatedResponse(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        status=api_key.status,
        last_used_at=api_key.last_used_at,
        created_at=api_key.created_at,
        key=raw_key,
    )
    return response


@router.get(
    "/api-keys/{key_id}/reveal",
    response_model=ApiKeyRevealResponse,
    summary="查看API Key明文",
)
async def reveal_api_key(
    key_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """查看 API Key 明文（通过 AES 解密还原）"""
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.user_id == current_user.id,
        )
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API Key not found")

    plain_key = aes_decrypt(api_key.key_encrypted)
    return ApiKeyRevealResponse(id=api_key.id, key=plain_key)


@router.put(
    "/api-keys/{key_id}/status",
    response_model=ApiKeyResponse,
    summary="启用/禁用API Key",
)
async def update_api_key_status(
    key_id: UUID,
    body: ApiKeyStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """启用或禁用指定的 API Key"""
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.user_id == current_user.id,
        )
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API Key not found")

    api_key.status = body.status
    await db.commit()
    await db.refresh(api_key)
    return ApiKeyResponse.model_validate(api_key)


@router.delete(
    "/api-keys/{key_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除API Key",
)
async def delete_api_key(
    key_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """删除指定的 API Key"""
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.user_id == current_user.id,
        )
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API Key not found")

    await db.delete(api_key)
    await db.commit()
