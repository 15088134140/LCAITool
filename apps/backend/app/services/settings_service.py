import uuid
import copy
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.system import SystemConfig, AiProvider
from app.core.security import aes_encrypt, aes_decrypt


class SettingsService:
    """系统设置与AI提供商管理服务"""

    # ============== SystemConfig Methods ==============

    @staticmethod
    async def get_configs(
        db: AsyncSession,
        group: Optional[str] = None,
    ) -> Tuple[List[SystemConfig], int]:
        """获取系统配置列表，可选按分组筛选"""
        query = select(SystemConfig)
        if group:
            query = query.where(SystemConfig.group == group)
        query = query.order_by(SystemConfig.group, SystemConfig.key)
        result = await db.execute(query)
        configs = list(result.scalars().all())
        return configs, len(configs)

    @staticmethod
    async def update_configs(
        db: AsyncSession,
        settings_dict: dict[str, str],
        admin_id: uuid.UUID,
    ) -> List[SystemConfig]:
        """批量更新系统配置（upsert）

        Args:
            settings_dict: {key: value} 格式的配置键值对
            admin_id: 操作管理员ID

        Returns:
            更新后的配置列表
        """
        updated_configs = []
        for key, value in settings_dict.items():
            # 查询现有配置
            result = await db.execute(
                select(SystemConfig).where(SystemConfig.key == key)
            )
            config = result.scalar_one_or_none()

            if config:
                # 更新现有配置
                config.value = value
                config.updated_by = admin_id
            else:
                # 如果配置不存在，创建一个默认配置（需要label和group）
                # 这里只更新值，不创建新配置；跳过不存在的key
                continue

            updated_configs.append(config)

        await db.commit()

        # 重新查询以获取完整数据
        if updated_configs:
            keys = [c.key for c in updated_configs]
            result = await db.execute(
                select(SystemConfig).where(SystemConfig.key.in_(keys))
            )
            return list(result.scalars().all())
        return []

    # ============== AiProvider Methods ==============

    @staticmethod
    async def get_ai_providers(
        db: AsyncSession,
        active_only: bool = False,
    ) -> Tuple[List[AiProvider], int]:
        """获取AI提供商列表，解密敏感字段"""
        query = select(AiProvider)
        if active_only:
            query = query.where(AiProvider.is_active.is_(True))
        query = query.order_by(AiProvider.sort_order, AiProvider.slug)
        result = await db.execute(query)
        providers = list(result.scalars().all())

        # 解密每个provider的config中的api_key
        for provider in providers:
            if provider.config and "api_key" in provider.config:
                try:
                    encrypted_key = provider.config["api_key"]
                    provider.config["api_key"] = aes_decrypt(encrypted_key)
                except Exception:
                    # 解密失败时保留原始值
                    pass

        return providers, len(providers)

    @staticmethod
    async def create_ai_provider(
        db: AsyncSession,
        data: dict,
        admin_id: uuid.UUID,
    ) -> AiProvider:
        """创建AI提供商，加密api_key敏感字段"""
        config = copy.deepcopy(data.get("config")) if data.get("config") else {}

        # 加密api_key
        if config and "api_key" in config and config["api_key"]:
            config["api_key"] = aes_encrypt(config["api_key"])

        provider = AiProvider(
            id=uuid.uuid4(),
            slug=data["slug"],
            name=data["name"],
            provider_type=data["provider_type"],
            config=config if config else None,
            is_active=data.get("is_active", True),
            sort_order=data.get("sort_order", 0),
            created_by=admin_id,
        )
        db.add(provider)
        await db.commit()
        await db.refresh(provider)
        return provider

    @staticmethod
    async def update_ai_provider(
        db: AsyncSession,
        provider_id: uuid.UUID,
        data: dict,
    ) -> Optional[AiProvider]:
        """更新AI提供商"""
        result = await db.execute(
            select(AiProvider).where(AiProvider.id == provider_id)
        )
        provider = result.scalar_one_or_none()
        if not provider:
            return None

        # 更新标量字段
        if "name" in data and data["name"] is not None:
            provider.name = data["name"]
        if "provider_type" in data and data["provider_type"] is not None:
            provider.provider_type = data["provider_type"]
        if "is_active" in data and data["is_active"] is not None:
            provider.is_active = data["is_active"]
        if "sort_order" in data and data["sort_order"] is not None:
            provider.sort_order = data["sort_order"]

        # 更新config，加密api_key
        if "config" in data and data["config"] is not None:
            new_config = copy.deepcopy(data["config"])
            if "api_key" in new_config:
                if new_config["api_key"]:
                    # 传入的api_key视为明文，加密后存储
                    new_config["api_key"] = aes_encrypt(new_config["api_key"])
                else:
                    # api_key为空字符串时，从旧配置中保留原有的加密值
                    if provider.config and "api_key" in provider.config:
                        new_config["api_key"] = provider.config["api_key"]
                    else:
                        del new_config["api_key"]
            # 如果api_key不在new_config中，保留原有的加密值（不做任何操作）
            provider.config = new_config

        await db.commit()
        await db.refresh(provider)
        return provider

    @staticmethod
    async def delete_ai_provider(
        db: AsyncSession,
        provider_id: uuid.UUID,
    ) -> bool:
        """删除AI提供商"""
        result = await db.execute(
            select(AiProvider).where(AiProvider.id == provider_id)
        )
        provider = result.scalar_one_or_none()
        if not provider:
            return False
        await db.delete(provider)
        await db.commit()
        return True
