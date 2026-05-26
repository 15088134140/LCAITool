"""
AI Providers Package
提供各种AI提供商的实现：火山方舟-豆包、Dify工作流、DeepSeek、智谱等
"""
from typing import Dict, Type

from .base import BaseAIProvider, AIResponse
from .doubao import DoubaoProvider
from .dify import DifyProvider
from .deepseek import DeepSeekProvider
from .zhipu import ZhipuProvider


class AIProviderFactory:
    """AI 提供商工厂类"""

    _providers: Dict[str, Type[BaseAIProvider]] = {
        "volcano": DoubaoProvider,
        "dify": DifyProvider,
        "deepseek": DeepSeekProvider,
        "zhipu": ZhipuProvider,
    }

    @classmethod
    def get_provider(cls, provider_name: str, **config) -> BaseAIProvider:
        """
        根据提供商名称获取实例，所有配置由调用方提供（数据库唯一来源，不读取环境变量）
        :param provider_name: 提供商名称（volcano, dify, deepseek, zhipu）
        :param config: 配置参数（api_key, api_base, model 等）
        :return: BaseAIProvider 实例
        :raises ValueError: 如果提供商不支持
        """
        provider_class = cls._providers.get(provider_name.lower())
        if not provider_class:
            raise ValueError(
                f"Unsupported AI provider: {provider_name}. "
                f"Supported providers: {list(cls._providers.keys())}"
            )

        return provider_class(**config)

    @classmethod
    async def get_provider_from_db(cls, db, slug: str) -> BaseAIProvider:
        """
        从数据库获取 AI Provider 配置并创建实例
        :param db: 数据库会话（异步）
        :param slug: 提供商标识（如 deepseek, zhipu）
        :return: BaseAIProvider 实例
        :raises ValueError: 如果提供商不存在或 api_key 未配置
        """
        from sqlalchemy import select
        from app.models.system import AiProvider
        from app.core.security import aes_decrypt

        result = await db.execute(select(AiProvider).where(AiProvider.slug == slug))
        provider = result.scalar_one_or_none()
        if not provider:
            raise ValueError(f"AI provider '{slug}' not found in database")

        # 解密数据库中可能已加密的 api_key
        config = dict(provider.config or {})
        api_key = config.get("api_key", "")
        if api_key:
            try:
                config["api_key"] = aes_decrypt(api_key)
            except Exception:
                # 解密失败说明是明文存储，直接使用
                pass

        # 验证 api_key 已配置
        if not config.get("api_key"):
            raise ValueError(
                f"AI provider '{slug}' api_key 未配置，请在管理后台 → AI提供商管理中设置"
            )

        return cls.get_provider(provider.slug, **config)

    @classmethod
    def register_provider(cls, name: str, provider_class: Type[BaseAIProvider]) -> None:
        """
        注册新的提供商
        :param name: 提供商名称
        :param provider_class: 提供商类
        """
        cls._providers[name.lower()] = provider_class


__all__ = [
    "BaseAIProvider",
    "AIResponse",
    "DoubaoProvider",
    "DifyProvider",
    "DeepSeekProvider",
    "ZhipuProvider",
    "AIProviderFactory",
]
