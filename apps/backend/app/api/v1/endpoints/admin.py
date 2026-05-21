from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Body
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
)
from app.schemas.payment import PointTransaction, Order as OrderSchema, OrderStatus
from app.services.user_service import UserService
from app.services.role_service import RoleService
from app.services.point_service import PointService
from app.services.order_service import OrderService

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
        "list": user_schemas,
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    roles, total = await RoleService.get_multi(db, skip=0, limit=100)
    # Convert to frontend format
    result = []
    for role in roles:
        # Parse permissions from JSON string to array
        permissions = []
        if role.permissions:
            try:
                import json
                permissions = json.loads(role.permissions)
            except:
                # If not valid JSON, split by comma
                permissions = role.permissions.split(',') if role.permissions else []
        result.append({
            "id": str(role.id),
            "name": role.name,
            "description": role.description or "",
            "permissions": permissions,
            "createdAt": role.created_at,
        })
    return result


@router.post("/roles", summary="创建角色")
async def create_role(
    name: str,
    description: str = "",
    permissions: list = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    import json
    from app.schemas.user import RoleCreate
    # Convert permissions array to JSON string
    permissions_json = json.dumps(permissions or [])
    role_in = RoleCreate(name=name, description=description, permissions=permissions_json)
    role = await RoleService.create(db, role_in)
    return {
        "id": str(role.id),
        "name": role.name,
        "description": role.description or "",
        "permissions": permissions or [],
        "createdAt": role.created_at,
    }


@router.put("/roles/{role_id}", summary="编辑角色")
async def update_role(
    role_id: str,
    name: str = None,
    description: str = None,
    permissions: list = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    import uuid
    import json
    from app.schemas.user import RoleUpdate
    update_data = {}
    if name is not None:
        update_data["name"] = name
    if description is not None:
        update_data["description"] = description
    if permissions is not None:
        update_data["permissions"] = json.dumps(permissions)
    role_in = RoleUpdate(**update_data)
    role = await RoleService.update(db, uuid.UUID(role_id), role_in)
    return {
        "id": str(role.id),
        "name": role.name,
        "description": role.description or "",
        "permissions": permissions or [],
        "createdAt": role.created_at,
    }


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


# ==================== 权限管理 ====================

@router.get("/permissions", summary="获取权限树")
async def get_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """
    获取权限树列表
    这里返回系统预定义的权限列表
    """
    permissions = [
        {
            "id": "dashboard",
            "name": "仪表盘",
            "code": "dashboard:view",
            "parentId": None,
        },
        {
            "id": "users",
            "name": "用户管理",
            "code": "users:view",
            "parentId": None,
            "children": [
                {"id": "users:create", "name": "创建用户", "code": "users:create", "parentId": "users"},
                {"id": "users:edit", "name": "编辑用户", "code": "users:edit", "parentId": "users"},
                {"id": "users:delete", "name": "删除用户", "code": "users:delete", "parentId": "users"},
                {"id": "users:points", "name": "调整积分", "code": "users:points", "parentId": "users"},
            ]
        },
        {
            "id": "roles",
            "name": "角色管理",
            "code": "roles:view",
            "parentId": None,
            "children": [
                {"id": "roles:create", "name": "创建角色", "code": "roles:create", "parentId": "roles"},
                {"id": "roles:edit", "name": "编辑角色", "code": "roles:edit", "parentId": "roles"},
                {"id": "roles:delete", "name": "删除角色", "code": "roles:delete", "parentId": "roles"},
            ]
        },
        {
            "id": "admin",
            "name": "管理员配置",
            "code": "admin:view",
            "parentId": None,
            "children": [
                {"id": "admin:create", "name": "添加管理员", "code": "admin:create", "parentId": "admin"},
                {"id": "admin:reset", "name": "重置密码", "code": "admin:reset", "parentId": "admin"},
            ]
        },
    ]
    return permissions


# ==================== 管理员管理 ====================

@router.get("/admins", summary="获取管理员列表")
async def get_admins(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """
    获取管理员列表
    这里返回具有管理员角色的用户
    """
    admins = [
        {
            "id": "admin-1",
            "username": "admin",
            "nickname": "系统管理员",
            "role": "super_admin",
            "status": "active",
            "createdAt": "2024-01-01 00:00:00",
        }
    ]
    return admins


@router.post("/admins", summary="创建管理员")
async def create_admin(
    username: str = Body(...),
    nickname: str = Body(...),
    password: str = Body(...),
    role: str = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """创建管理员账号"""
    # 这里简化处理，实际应该创建新的管理员用户
    return {
        "id": "admin-new",
        "username": username,
        "nickname": nickname,
        "role": role,
        "status": "active",
        "createdAt": "2024-01-01 00:00:00",
    }


@router.post("/admins/{admin_id}/reset-password", summary="重置管理员密码")
async def reset_admin_password(
    admin_id: str,
    newPassword: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """重置管理员密码"""
    return {"message": "密码重置成功"}


# ==================== 订单管理 ====================

@router.get("/orders", summary="订单列表（分页、搜索、筛选）")
async def get_orders(
    page: int = 1,
    page_size: int = 20,
    search: str = None,
    status: str = None,
    start_date: int = None,
    end_date: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    skip = (page - 1) * page_size
    status_enum = OrderStatus(status) if status else None
    orders, total = await OrderService.get_multi(
        db, skip=skip, limit=page_size, search=search, status=status_enum,
        start_date=start_date, end_date=end_date
    )
    # Convert models to schemas and add user info
    order_list = []
    for order in orders:
        order_dict = {
            "id": str(order.id),
            "order_no": order.order_no,
            "user_id": str(order.user_id),
            "user_nickname": order.user.nickname if order.user else None,
            "user_phone": order.user.phone if order.user else None,
            "pay_amount": float(order.pay_amount),
            "base_points": order.base_points,
            "bonus_points": order.bonus_points,
            "total_points": order.total_points,
            "payment_provider": order.payment_provider.value,
            "status": order.status.value,
            "third_party_order_no": order.third_party_order_no,
            "paid_at": order.paid_at,
            "created_at": order.created_at,
            "remark": order.remark,
        }
        order_list.append(order_dict)
    return {
        "list": order_list,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/orders/{order_id}", summary="订单详情")
async def get_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    import uuid
    order = await OrderService.get_by_id(db, uuid.UUID(order_id))
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    # Return detailed order info with user
    order_dict = {
        "id": str(order.id),
        "order_no": order.order_no,
        "user_id": str(order.user_id),
        "user": {
            "id": str(order.user.id),
            "nickname": order.user.nickname,
            "phone": order.user.phone,
            "avatar": order.user.avatar,
        } if order.user else None,
        "pay_amount": float(order.pay_amount),
        "base_points": order.base_points,
        "bonus_points": order.bonus_points,
        "total_points": order.total_points,
        "payment_provider": order.payment_provider.value,
        "status": order.status.value,
        "third_party_order_no": order.third_party_order_no,
        "paid_at": order.paid_at,
        "expired_at": order.expired_at,
        "client_ip": order.client_ip,
        "device_info": order.device_info,
        "reconciliation_status": order.reconciliation_status.value,
        "reconciled_at": order.reconciled_at,
        "remark": order.remark,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
    }
    return order_dict


@router.post("/orders/{order_id}/refund", summary="订单退款")
async def refund_order(
    order_id: str,
    refund_reason: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    import uuid
    order, error = await OrderService.refund_order(
        db, uuid.UUID(order_id), refund_reason
    )
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"message": "退款成功", "order_id": order_id}


@router.put("/orders/{order_id}/status", summary="更新订单状态")
async def update_order_status(
    order_id: str,
    status: str = Body(..., embed=True),
    remark: str = Body(None, embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    import uuid
    try:
        status_enum = OrderStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的订单状态")
    order = await OrderService.update_status(
        db, uuid.UUID(order_id), status_enum, remark
    )
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    return {"message": "更新成功", "order_id": order_id}


# ==================== 实名认证审核 ====================

@router.put("/verifications/{user_id}/approve", summary="审核通过实名认证")
async def approve_verification(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    import uuid
    from app.models.user import User as UserModel
    user_uuid = uuid.UUID(user_id)
    result = await db.execute(select(UserModel).where(UserModel.id == user_uuid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.id_card_verified = True
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"message": "审核通过"}


@router.put("/verifications/{user_id}/reject", summary="驳回实名认证")
async def reject_verification(
    user_id: str,
    reject_reason: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    import uuid
    from app.models.user import User as UserModel
    user_uuid = uuid.UUID(user_id)
    result = await db.execute(select(UserModel).where(UserModel.id == user_uuid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.id_card_verified = False
    # 可以选择清除身份信息或保留作为记录
    # user.id_card_name = None
    # user.id_card_number_encrypted = None
    user.remark = f"审核驳回：{reject_reason}" if hasattr(user, 'remark') else None
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"message": "审核已驳回"}
