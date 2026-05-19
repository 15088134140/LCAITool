from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_admin_user
from app.models.user import User
from app.schemas.user import (
    User as UserSchema,
    UserUpdate,
    Role,
    RoleCreate,
    RoleUpdate,
    UserRoleAssignRequest,
    AdjustBalanceRequest,
    PointTransaction,
)
from app.services.user_service import UserService
from app.services.role_service import RoleService
from app.services.point_service import PointService

router = APIRouter()


# ==================== 用户管理 ====================

@router.get("/users", summary="用户列表（分页、搜索、筛选）")
async def get_users(
    page: int = 1,
    page_size: int = 20,
    search: str = None,
    status: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    skip = (page - 1) * page_size
    users, total = await UserService.get_multi(
        db, skip=skip, limit=page_size, search=search, status=status
    )
    # Convert models to schemas for proper serialization
    user_schemas = [UserSchema.model_validate(user) for user in users]
    return {
        "items": user_schemas,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/users/{user_id}", response_model=UserSchema, summary="用户详情")
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    import uuid
    user = await UserService.get_by_id(db, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user


@router.put("/users/{user_id}", response_model=UserSchema, summary="编辑用户信息")
async def update_user(
    user_id: str,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    import uuid
    user = await UserService.update(db, uuid.UUID(user_id), user_in)
    return user


@router.put("/users/{user_id}/status", response_model=UserSchema, summary="启用/禁用账号")
async def update_user_status(
    user_id: str,
    status: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    import uuid
    user = await UserService.update_status(db, uuid.UUID(user_id), status)
    return user


@router.post("/users/{user_id}/adjust-balance", response_model=UserSchema, summary="调整积分")
async def adjust_user_balance(
    user_id: str,
    request: AdjustBalanceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    import uuid
    user_uuid = uuid.UUID(user_id)

    # 更新用户余额
    user = await UserService.adjust_balance(
        db=db,
        user_id=user_uuid,
        amount=request.amount,
        reason=request.reason,
    )

    # 记录积分流水
    await PointService.create_transaction(
        db=db,
        user_id=user_uuid,
        amount=request.amount,
        transaction_type="adjust" if request.amount >= 0 else "deduct",
        reason=request.reason,
    )

    return user


@router.put("/users/{user_id}/roles", response_model=UserSchema, summary="分配用户角色")
async def assign_user_roles(
    user_id: str,
    request: UserRoleAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    import uuid
    user = await UserService.assign_roles(db, uuid.UUID(user_id), request.role_ids)
    return user


# ==================== 角色管理 ====================

@router.get("/roles", summary="角色列表")
async def get_roles(
    page: int = 1,
    page_size: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    skip = (page - 1) * page_size
    roles, total = await RoleService.get_multi(db, skip=skip, limit=page_size)
    return {
        "items": roles,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/roles", response_model=Role, summary="创建角色")
async def create_role(
    role_in: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    role = await RoleService.create(db, role_in)
    return role


@router.put("/roles/{role_id}", response_model=Role, summary="编辑角色")
async def update_role(
    role_id: str,
    role_in: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    import uuid
    role = await RoleService.update(db, uuid.UUID(role_id), role_in)
    return role


@router.delete("/roles/{role_id}", summary="删除角色")
async def delete_role(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    import uuid
    await RoleService.delete(db, uuid.UUID(role_id))
    return {"message": "删除成功"}


# ==================== 积分管理 ====================

@router.get("/users/{user_id}/points/history", summary="查看用户积分流水")
async def get_user_points_history(
    user_id: str,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    import uuid
    user_uuid = uuid.UUID(user_id)
    skip = (page - 1) * page_size
    transactions, total = await PointService.get_by_user_id(
        db, user_id=user_uuid, skip=skip, limit=page_size
    )
    # Convert models to schemas for proper serialization
    transaction_schemas = [PointTransaction.model_validate(t) for t in transactions]
    return {
        "items": transaction_schemas,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ==================== 实名认证管理 ====================

@router.get("/verifications", summary="获取实名认证申请列表")
async def get_verifications(
    page: int = 1,
    page_size: int = 20,
    status: bool = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    skip = (page - 1) * page_size
    # Get users with verified status filtering
    users, total = await UserService.get_multi(
        db, skip=skip, limit=page_size, status=1
    )
    # Filter by verification status if provided
    if status is not None:
        users = [u for u in users if u.id_card_verified == status]
        total = len(users)
    else:
        # Only show users who have applied (have id_card_name)
        users = [u for u in users if u.id_card_name is not None]
        total = len(users)
    # Return simplified verification info
    verification_list = [
        {
            "user_id": str(u.id),
            "nickname": u.nickname,
            "real_name": u.id_card_name,
            "id_card_verified": u.id_card_verified,
            "phone": u.phone,
        }
        for u in users
    ]
    return {
        "items": verification_list,
        "total": total,
        "page": page,
        "page_size": page_size,
    }
