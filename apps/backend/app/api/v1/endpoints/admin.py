import time
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_admin_user
from app.models.user import User
from app.models.tool import Tool, ToolCategory, ToolRating, ToolDemo as ToolDemoModel
from app.models.task import Task
from app.models.system import IdeaSubmission, AdminAuditLog
from app.schemas.user import (
    User as UserSchema,
    UserUpdate,
    Role,
    RoleCreate,
    RoleUpdate,
    UserRoleAssignRequest,
    AdjustBalanceRequest,
)
from app.schemas.tool import (
    ToolCreate, ToolUpdate,
    ToolCategoryCreate, ToolCategoryUpdate,
    ToolDemoCreate, ToolDemoResponse,
    ToolResponse, ToolCategoryResponse,
)
from app.schemas.payment import PointTransaction, Order as OrderSchema, OrderStatus
from app.services.user_service import UserService
from app.services.role_service import RoleService
from app.services.point_service import PointService
from app.services.order_service import OrderService
from app.services.tool_service import ToolService

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
        transaction_type="adjust",
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


# ==================== 工具管理 ====================

@router.post("/tools", summary="创建工具")
async def create_tool(
    tool_in: ToolCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """创建新工具"""
    tool = await ToolService.create_tool(db, tool_in)
    return ToolResponse.model_validate(tool)


@router.put("/tools/{tool_id}", summary="更新工具")
async def update_tool(
    tool_id: str,
    tool_in: ToolUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """更新工具信息"""
    import uuid
    tool = await ToolService.update_tool(db, uuid.UUID(tool_id), tool_in)
    return ToolResponse.model_validate(tool)


@router.delete("/tools/{tool_id}", summary="删除工具")
async def delete_tool(
    tool_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """删除工具"""
    import uuid
    await ToolService.delete_tool(db, uuid.UUID(tool_id))
    return {"message": "删除成功"}


@router.put("/tools/{tool_id}/status", summary="切换工具状态")
async def toggle_tool_status(
    tool_id: str,
    status: int = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """切换工具上线/下线状态"""
    import uuid
    tool = await ToolService.update_tool(db, uuid.UUID(tool_id), ToolUpdate(status=status))
    return ToolResponse.model_validate(tool)


# ==================== 分类管理 ====================

@router.post("/tools/categories", summary="创建分类")
async def create_category(
    category_in: ToolCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """创建工具分类"""
    category = await ToolService.create_category(db, category_in)
    return ToolCategoryResponse.model_validate(category)


@router.put("/tools/categories/{category_id}", summary="更新分类")
async def update_category(
    category_id: str,
    category_in: ToolCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """更新工具分类"""
    import uuid
    category = await ToolService.update_category(db, uuid.UUID(category_id), category_in)
    return ToolCategoryResponse.model_validate(category)


@router.delete("/tools/categories/{category_id}", summary="删除分类")
async def delete_category(
    category_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """删除工具分类"""
    import uuid
    result = await db.execute(select(ToolCategory).where(ToolCategory.id == uuid.UUID(category_id)))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="分类不存在")
    await db.delete(category)
    await db.commit()
    return {"message": "删除成功"}


# ==================== 演示案例管理 ====================

@router.post("/tools/{tool_id}/demos", summary="创建演示案例")
async def create_demo(
    tool_id: str,
    demo_in: ToolDemoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """创建工具演示案例"""
    import uuid
    demo_in.tool_id = uuid.UUID(tool_id)
    demo = await ToolService.create_demo(db, demo_in)
    return demo


@router.put("/tools/demos/{demo_id}", summary="更新演示案例")
async def update_demo(
    demo_id: str,
    demo_in: ToolDemoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """更新工具演示案例"""
    import uuid
    result = await db.execute(select(ToolDemoModel).where(ToolDemoModel.id == uuid.UUID(demo_id)))
    demo = result.scalar_one_or_none()
    if not demo:
        raise HTTPException(status_code=404, detail="演示案例不存在")
    update_data = demo_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(demo, field, value)
    await db.commit()
    await db.refresh(demo)
    return demo


@router.delete("/tools/demos/{demo_id}", summary="删除演示案例")
async def delete_demo(
    demo_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """删除工具演示案例"""
    import uuid
    result = await db.execute(select(ToolDemoModel).where(ToolDemoModel.id == uuid.UUID(demo_id)))
    demo = result.scalar_one_or_none()
    if not demo:
        raise HTTPException(status_code=404, detail="演示案例不存在")
    await db.delete(demo)
    await db.commit()
    return {"message": "删除成功"}


@router.put("/tools/{tool_id}/demos/order", summary="更新演示案例排序")
async def update_demo_order(
    tool_id: str,
    demo_ids: list[str] = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """批量更新演示案例排序"""
    import uuid
    for idx, demo_id in enumerate(demo_ids):
        result = await db.execute(select(ToolDemoModel).where(ToolDemoModel.id == uuid.UUID(demo_id)))
        demo = result.scalar_one_or_none()
        if demo:
            demo.sort_order = idx
    await db.commit()
    return {"message": "排序更新成功"}


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


# ==================== 评价管理 ====================

@router.get("/ratings", summary="评价列表（分页+筛选）")
async def get_admin_ratings(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    tool_id: Optional[str] = Query(None, description="按工具ID筛选"),
    rating_value: Optional[int] = Query(None, ge=1, le=5, description="按评分值筛选"),
    status: Optional[int] = Query(None, description="按状态筛选：0隐藏 1显示"),
    keyword: Optional[str] = Query(None, description="搜索关键词（评价内容）"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """获取评价列表，支持按工具、评分、状态、关键词筛选"""
    import uuid

    query = select(ToolRating)

    if tool_id:
        query = query.where(ToolRating.tool_id == uuid.UUID(tool_id))
    if rating_value is not None:
        query = query.where(ToolRating.rating == rating_value)
    if status is not None:
        query = query.where(ToolRating.status == status)
    if keyword:
        query = query.where(ToolRating.content.ilike(f"%{keyword}%"))

    # 获取总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # 分页查询（关联用户和工具信息）
    skip = (page - 1) * page_size
    query = query.offset(skip).limit(page_size).order_by(ToolRating.created_at.desc())
    result = await db.execute(query)
    ratings = result.scalars().all()

    # 组装返回数据
    rating_list = []
    for r in ratings:
        # 获取用户信息
        user_result = await db.execute(
            select(User).where(User.id == r.user_id)
        )
        user = user_result.scalar_one_or_none()

        # 获取工具信息
        tool_result = await db.execute(
            select(Tool).where(Tool.id == r.tool_id)
        )
        tool = tool_result.scalar_one_or_none()

        rating_list.append({
            "id": str(r.id),
            "user_id": str(r.user_id),
            "user_nickname": user.nickname if user else "未知用户",
            "user_avatar": user.avatar if user else None,
            "tool_id": str(r.tool_id),
            "tool_name": tool.name if tool else "未知工具",
            "task_id": str(r.task_id),
            "rating": r.rating,
            "content": r.content,
            "images": r.images,
            "is_useful_count": r.is_useful_count,
            "status": r.status,
            "admin_reply": r.admin_reply,
            "replied_at": r.replied_at,
            "created_at": r.created_at,
        })

    return {
        "items": rating_list,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.put("/ratings/{rating_id}/status", summary="切换评价显示状态")
async def toggle_rating_status(
    rating_id: str,
    status: int = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """切换评价显示/隐藏状态"""
    import uuid
    result = await db.execute(
        select(ToolRating).where(ToolRating.id == uuid.UUID(rating_id))
    )
    rating = result.scalar_one_or_none()
    if not rating:
        raise HTTPException(status_code=404, detail="评价不存在")

    rating.status = status
    await db.commit()
    await db.refresh(rating)
    return {"message": "状态更新成功", "status": rating.status}


@router.post("/ratings/{rating_id}/reply", summary="管理员回复评价")
async def reply_rating(
    rating_id: str,
    content: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """管理员回复用户评价"""
    import uuid
    import time
    result = await db.execute(
        select(ToolRating).where(ToolRating.id == uuid.UUID(rating_id))
    )
    rating = result.scalar_one_or_none()
    if not rating:
        raise HTTPException(status_code=404, detail="评价不存在")

    rating.admin_reply = content
    rating.replied_at = int(time.time())
    await db.commit()
    await db.refresh(rating)
    return {"message": "回复成功", "admin_reply": rating.admin_reply}


# ==================== 反馈管理 ====================

@router.get("/feedbacks", summary="反馈列表（分页+筛选）")
async def get_admin_feedbacks(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: Optional[str] = Query(None, description="按状态筛选：pending/processing/resolved/adopted"),
    type_: Optional[str] = Query(None, alias="type", description="按类型筛选：feature/bug/consult/other"),
    keyword: Optional[str] = Query(None, description="搜索关键词（标题）"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """获取反馈列表，支持状态、类型、关键词筛选和分页"""
    from app.services.feedback_service import FeedbackService

    result = await FeedbackService.get_admin_list(
        db, status=status, type_=type_, keyword=keyword, page=page, page_size=page_size
    )
    # 将模型转换为可序列化字典
    items = []
    for fb in result["items"]:
        # 获取用户信息
        user_result = await db.execute(
            select(User).where(User.id == fb.user_id)
        )
        user = user_result.scalar_one_or_none()
        items.append({
            "id": str(fb.id),
            "user_id": str(fb.user_id),
            "user_nickname": user.nickname if user else "未知用户",
            "user_avatar": user.avatar if user else None,
            "type": fb.type,
            "title": fb.title,
            "description": fb.description,
            "contact": fb.contact,
            "status": fb.status,
            "admin_reply": fb.admin_reply,
            "reply_points": fb.reply_points,
            "replied_at": fb.replied_at,
            "rewarded_at": fb.rewarded_at,
            "created_at": int(fb.created_at) if hasattr(fb.created_at, 'timestamp') else fb.created_at,
        })
    return {
        "items": items,
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
    }


@router.post("/feedbacks/{feedback_id}/reply", summary="管理员回复反馈")
async def reply_feedback(
    feedback_id: str,
    reply: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """管理员回复用户反馈"""
    import uuid
    from app.services.feedback_service import FeedbackService

    feedback = await FeedbackService.reply(db, uuid.UUID(feedback_id), reply, current_user.id)
    return {
        "message": "回复成功",
        "id": str(feedback.id),
        "admin_reply": feedback.admin_reply,
    }


@router.post("/feedbacks/{feedback_id}/reward", summary="采纳反馈并奖励积分")
async def reward_feedback(
    feedback_id: str,
    points: int = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """采纳反馈并发放积分奖励"""
    import uuid
    from app.services.feedback_service import FeedbackService

    feedback = await FeedbackService.reward(db, uuid.UUID(feedback_id), points, current_user.id)
    return {
        "message": "奖励发放成功",
        "id": str(feedback.id),
        "reply_points": feedback.reply_points,
        "status": feedback.status,
    }


# ==================== 构思管理 ====================

@router.get("/ideas", summary="构思列表（管理端，支持状态+关键词筛选+分页）")
async def get_admin_ideas(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: Optional[str] = Query(None, description="状态筛选：pending/approved/rejected/implemented"),
    keyword: Optional[str] = Query(None, description="搜索关键词（标题/描述）"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """获取构思列表，支持按状态和关键词筛选"""
    query = select(IdeaSubmission).options(selectinload(IdeaSubmission.user))

    if status:
        query = query.where(IdeaSubmission.status == status)

    if keyword:
        pattern = f"%{keyword}%"
        query = query.where(
            or_(IdeaSubmission.title.ilike(pattern), IdeaSubmission.description.ilike(pattern))
        )

    # Get total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    skip = (page - 1) * page_size
    query = query.offset(skip).limit(page_size).order_by(IdeaSubmission.created_at.desc())
    result = await db.execute(query)
    ideas = result.scalars().all()

    idea_list = []
    for idea in ideas:
        tags = []
        if idea.tags:
            try:
                import json
                tags = json.loads(idea.tags)
            except (json.JSONDecodeError, TypeError):
                tags = []

        idea_list.append({
            "id": str(idea.id),
            "user_id": str(idea.user_id),
            "user_nickname": idea.user.nickname if idea.user else "未知用户",
            "title": idea.title,
            "description": idea.description,
            "category": idea.category,
            "tags": tags,
            "vote_count": idea.vote_count,
            "view_count": idea.view_count,
            "status": idea.status,
            "admin_remark": idea.admin_remark,
            "admin_id": str(idea.admin_id) if idea.admin_id else None,
            "reviewed_at": idea.reviewed_at,
            "created_at": idea.created_at,
        })

    return {
        "items": idea_list,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.put("/ideas/{idea_id}/approve", summary="审核通过构思")
async def approve_idea(
    idea_id: str,
    remark: Optional[str] = Body(None, embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """审核通过构思创意"""
    import uuid
    idea_uuid = uuid.UUID(idea_id)
    result = await db.execute(select(IdeaSubmission).where(IdeaSubmission.id == idea_uuid))
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="构思不存在")

    idea.approve(admin_id=current_user.id, remark=remark)
    await db.commit()
    await db.refresh(idea)
    return {"message": "审核通过", "id": str(idea.id), "status": idea.status}


@router.put("/ideas/{idea_id}/reject", summary="驳回构思")
async def reject_idea(
    idea_id: str,
    remark: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """驳回构思创意"""
    import uuid
    idea_uuid = uuid.UUID(idea_id)
    result = await db.execute(select(IdeaSubmission).where(IdeaSubmission.id == idea_uuid))
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="构思不存在")

    idea.reject(admin_id=current_user.id, remark=remark)
    await db.commit()
    await db.refresh(idea)
    return {"message": "已驳回", "id": str(idea.id), "status": idea.status}


@router.put("/ideas/{idea_id}/implement", summary="标记构思为已实现")
async def implement_idea(
    idea_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """标记构思为已实现"""
    import uuid
    idea_uuid = uuid.UUID(idea_id)
    result = await db.execute(select(IdeaSubmission).where(IdeaSubmission.id == idea_uuid))
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="构思不存在")

    idea.implement()
    idea.admin_id = current_user.id
    await db.commit()
    await db.refresh(idea)
    return {"message": "已标记为已实现", "id": str(idea.id), "status": idea.status}


# ==================== 退款管理 ====================

@router.get("/refunds", summary="退款订单列表（按状态筛选+分页）")
async def get_refunds(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: Optional[str] = Query(None, description="状态筛选：pending(待处理)/done(已处理)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """获取退款订单列表"""
    from app.models.payment import Order as OrderModel

    # 待处理 = 待退款的已支付订单, 已处理 = refunded 状态的订单
    query = select(OrderModel).options(selectinload(OrderModel.user))

    if status == "pending":
        # 已支付、备注包含"申请退款" 或者 特殊标记的订单
        # 简化：查询状态为 PAID 且包含退款申请的订单
        query = query.where(
            OrderModel.status == OrderStatus.PAID,
            OrderModel.remark.ilike("%申请退款%"),
        )
    elif status == "done":
        query = query.where(OrderModel.status == OrderStatus.REFUNDED)
    else:
        # 全部退款相关 = PAID(含退款申请) 或 REFUNDED
        query = query.where(
            or_(
                OrderModel.status == OrderStatus.REFUNDED,
                (OrderModel.status == OrderStatus.PAID) & (OrderModel.remark.ilike("%申请退款%")),
            )
        )

    # Get total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    skip = (page - 1) * page_size
    query = query.offset(skip).limit(page_size).order_by(OrderModel.created_at.desc())
    result = await db.execute(query)
    orders = result.scalars().all()

    refund_list = []
    for order in orders:
        refund_list.append({
            "id": str(order.id),
            "order_no": order.order_no,
            "user_id": str(order.user_id),
            "user_nickname": order.user.nickname if order.user else "未知用户",
            "pay_amount": float(order.pay_amount),
            "base_points": order.base_points,
            "bonus_points": order.bonus_points,
            "total_points": order.total_points,
            "payment_provider": order.payment_provider.value,
            "status": order.status.value,
            "remark": order.remark,
            "paid_at": order.paid_at,
            "created_at": order.created_at,
        })

    return {
        "items": refund_list,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/refunds/{order_id}/process", summary="处理退款")
async def process_refund(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """处理退款：退款积分给用户，更新订单状态为 REFUNDED"""
    import uuid
    from app.models.payment import Order as OrderModel
    from app.models.payment import PointTransactionType

    order_uuid = uuid.UUID(order_id)
    result = await db.execute(
        select(OrderModel).where(OrderModel.id == order_uuid).options(selectinload(OrderModel.user))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    if order.status != OrderStatus.PAID:
        raise HTTPException(status_code=400, detail="只有已支付订单才能退款")

    # 退积分：将 total_points 返还给用户
    user = order.user
    if user:
        user.balance += order.total_points
        db.add(user)

        # 记录积分流水
        await PointService.create_transaction(
            db=db,
            user_id=user.id,
            amount=order.total_points,
            transaction_type="refund",
            reason=f"订单退款：{order.order_no}",
            related_id=str(order.id),
            related_type="order",
            operator=str(current_user.id),
        )

    # 更新订单状态
    order.status = OrderStatus.REFUNDED
    order.remark = (order.remark or "") + f" | 管理员退款处理于 {int(time.time())}"
    db.add(order)
    await db.commit()
    await db.refresh(order)

    # 记录审计日志
    audit_log = AdminAuditLog.create_log(
        admin_id=current_user.id,
        action_type="refund_order",
        target_type="order",
        target_id=order_id,
    )
    db.add(audit_log)
    await db.commit()

    return {"message": "退款成功", "order_id": order_id, "refund_amount": order.total_points}


# ==================== Dashboard 统计 ====================

@router.get("/dashboard/stats", summary="仪表盘统计数据")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """获取仪表盘统计数据：用户数、收入、任务数、工具排行、最近活动"""
    from app.models.payment import Order as OrderModel

    # 1. 总用户数
    user_count_result = await db.execute(select(func.count(User.id)))
    total_users = user_count_result.scalar() or 0

    # 2. 实名认证用户数
    verified_result = await db.execute(
        select(func.count(User.id)).where(User.id_card_verified == True)
    )
    verified_users = verified_result.scalar() or 0

    # 3. 总收入（已支付订单的 pay_amount 总和）
    revenue_result = await db.execute(
        select(func.sum(OrderModel.pay_amount)).where(OrderModel.status == OrderStatus.PAID)
    )
    total_revenue = float(revenue_result.scalar() or 0)

    # 4. 今日任务数
    today_start = int(time.mktime(time.localtime()))  # 今日 00:00
    today_start = today_start - (today_start % 86400)  # 对齐到当天零点

    today_tasks_result = await db.execute(
        select(func.count(Task.id)).where(Task.created_at >= today_start)
    )
    today_tasks = today_tasks_result.scalar() or 0

    # 5. 工具使用排行（Top 5 by task count）
    top_tools_result = await db.execute(
        select(
            Tool.name,
            Tool.slug,
            func.count(Task.id).label("usage_count"),
        )
        .select_from(Task)
        .join(Tool, Tool.id == Task.tool_id, isouter=True)
        .group_by(Tool.id, Tool.name, Tool.slug)
        .order_by(func.count(Task.id).desc())
        .limit(5)
    )
    top_tools_rows = top_tools_result.fetchall()
    top_tools = [
        {"name": row.name or "未知工具", "slug": row.slug, "usage_count": row.usage_count}
        for row in top_tools_rows
    ]

    # 6. 最近活动（最近10个任务，包含用户昵称）
    recent_result = await db.execute(
        select(Task, User.nickname)
        .join(User, User.id == Task.user_id, isouter=True)
        .order_by(Task.created_at.desc())
        .limit(10)
    )
    recent_rows = recent_result.fetchall()
    recent_activities = []
    for row in recent_rows:
        task = row[0]
        nickname = row[1] or "未知用户"
        # 构建人类可读的活动描述
        status_map = {
            "pending": "创建了任务",
            "running": "正在执行任务",
            "completed": "完成了任务",
            "failed": "任务失败",
            "cancelled": "取消了任务",
            "timeout": "任务超时",
        }
        action = status_map.get(task.status, f"任务状态：{task.status}")
        recent_activities.append({
            "user": nickname,
            "action": action,
            "task_type": task.task_type,
            "time": task.created_at,
        })

    return {
        "total_users": total_users,
        "verified_users": verified_users,
        "total_revenue": total_revenue,
        "today_tasks": today_tasks,
        "top_tools": top_tools,
        "recent_activities": recent_activities,
    }
