import uuid
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_admin_user
from app.models.user import User
from app.models.system import AdminAuditLog
from app.schemas.settings import (
    SystemConfigCreate,
    SystemConfigUpdate,
    SystemConfigResponse,
    AiProviderCreate,
    AiProviderUpdate,
    AiProviderResponse,
)
from app.services.settings_service import SettingsService, DEFAULT_CONFIG_VALUES

router = APIRouter()
public_router = APIRouter()


# ==================== 系统设置 ====================


@router.get("/settings", summary="获取系统配置列表")
async def get_settings(
    group: Optional[str] = Query(None, description="按分组筛选: basic/business"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """获取系统配置列表，可选按分组筛选"""
    from app.models.system import SystemConfig as SystemConfigModel
    configs, total = await SettingsService.get_configs(db, group=group)
    # Build response with default values
    config_map = {c.key: c for c in configs}
    all_keys = set(DEFAULT_CONFIG_VALUES.keys())
    # If group is specified, filter to keys matching known prefixes
    if group == "basic":
        all_keys = {k for k in all_keys if k.startswith(("site_", "contact_", "user_", "privacy_"))}
    elif group == "business":
        all_keys = {k for k in all_keys if k.startswith(("checkin_", "invite_", "register_", "verify_", "rating_", "recharge_", "points_"))}

    items = []
    for key in all_keys:
        if key in config_map:
            c = config_map[key]
            item = SystemConfigResponse.model_validate(c)
        else:
            # Synthesize a response for configs not yet in DB
            item = SystemConfigResponse(
                key=key,
                value="",
                group="basic" if key.startswith(("site_", "contact_")) else "business",
                label=key,
                type="number" if DEFAULT_CONFIG_VALUES[key].lstrip("-").isdigit() else "string",
                created_at=0,
                updated_at=0,
            )
        item.default_value = DEFAULT_CONFIG_VALUES.get(key)
        items.append(item)

    # Sort items by key
    items.sort(key=lambda x: x.key)

    return {
        "items": items,
        "total": len(items),
    }


@router.put("/settings", summary="批量更新系统配置")
async def update_settings(
    data: SystemConfigUpdate = Body(..., description="批量更新数据"),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """批量更新系统配置（upsert）"""
    # 记录请求数据用于审计
    request_data = {"settings_keys": list(data.settings.keys())}

    updated = await SettingsService.update_configs(
        db, settings_dict=data.settings, admin_id=current_user.id
    )

    # 记录审计日志
    audit_log = AdminAuditLog.create_log(
        admin_id=current_user.id,
        action_type="update",
        target_type="system_config",
        ip_address=request.client.host if request else None,
        request_data=request_data,
        response_data={"updated_count": len(updated)},
        success=True,
    )
    db.add(audit_log)
    await db.commit()

    items = [SystemConfigResponse.model_validate(c) for c in updated]
    return {
        "items": items,
        "updated_count": len(items),
    }


# ==================== AI Provider 管理 ====================


@router.get("/ai-providers", summary="获取AI提供商列表")
async def get_ai_providers(
    active_only: bool = Query(False, description="仅返回启用中的提供商"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """获取AI提供商列表，api_key自动解密返回"""
    providers, total = await SettingsService.get_ai_providers(db, active_only=active_only)
    items = [AiProviderResponse.model_validate(p) for p in providers]
    return {
        "items": items,
        "total": total,
    }


@router.post("/ai-providers", summary="创建AI提供商")
async def create_ai_provider(
    data: AiProviderCreate = Body(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """创建新的AI提供商配置（api_key自动加密存储）"""
    provider = await SettingsService.create_ai_provider(
        db, data=data.model_dump(), admin_id=current_user.id
    )

    # 记录审计日志
    audit_log = AdminAuditLog.create_log(
        admin_id=current_user.id,
        action_type="create",
        target_type="ai_provider",
        target_id=str(provider.id),
        ip_address=request.client.host if request else None,
        request_data={"slug": data.slug, "name": data.name, "provider_type": data.provider_type},
        success=True,
    )
    db.add(audit_log)
    await db.commit()

    return AiProviderResponse.model_validate(provider)


@router.put("/ai-providers/{provider_id}", summary="更新AI提供商")
async def update_ai_provider(
    provider_id: str,
    data: AiProviderUpdate = Body(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """更新AI提供商配置"""
    provider_uuid = uuid.UUID(provider_id)

    # 检查要更新的字段
    update_data = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if not update_data:
        raise HTTPException(status_code=400, detail="没有提供要更新的字段")

    # 记录请求数据（排除敏感字段）
    audit_request = {k: v for k, v in update_data.items() if k != "config"}

    provider = await SettingsService.update_ai_provider(
        db, provider_id=provider_uuid, data=update_data
    )

    if not provider:
        raise HTTPException(status_code=404, detail="AI提供商不存在")

    # 记录审计日志
    audit_log = AdminAuditLog.create_log(
        admin_id=current_user.id,
        action_type="update",
        target_type="ai_provider",
        target_id=str(provider.id),
        ip_address=request.client.host if request else None,
        request_data=audit_request,
        success=True,
    )
    db.add(audit_log)
    await db.commit()

    return AiProviderResponse.model_validate(provider)


@router.delete("/ai-providers/{provider_id}", summary="删除AI提供商")
async def delete_ai_provider(
    provider_id: str,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> Any:
    """删除AI提供商配置"""
    provider_uuid = uuid.UUID(provider_id)
    deleted = await SettingsService.delete_ai_provider(db, provider_id=provider_uuid)

    if not deleted:
        raise HTTPException(status_code=404, detail="AI提供商不存在")

    # 记录审计日志
    audit_log = AdminAuditLog.create_log(
        admin_id=current_user.id,
        action_type="delete",
        target_type="ai_provider",
        target_id=provider_id,
        ip_address=request.client.host if request else None,
        success=True,
    )
    db.add(audit_log)
    await db.commit()

    return {"message": "删除成功"}


# ==================== 公开配置（用户端使用） ====================


@public_router.get("/public/config", summary="获取公开配置值")
async def get_public_config(
    keys: str = Query(..., description="逗号分隔的配置键列表，如: verify_bonus_points,register_bonus_points"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """获取公开的系统配置值列表（无需登录）"""
    key_list = [k.strip() for k in keys.split(",") if k.strip()]
    result = {}
    for key in key_list:
        value = await SettingsService.get_config_value(db, key)
        result[key] = value
    return result
