"""
AI Providers Package
提供各种AI提供商的实现：火山方舟-豆包、Dify工作流、DeepSeek、智谱等
"""
from typing import Dict, Type
import os

from .base import BaseAIProvider, AIResponse
from .doubao import DoubaoProvider
from .dify import DifyProvider
from .deepseek import DeepSeekProvider
from .zhipu import ZhipuProvider


class AIProviderFactory:
    """AI 提供商工厂类"""

    _providers: Dict[str, Type[BaseAIProvider]] = {
        "doubao": DoubaoProvider,
        "dify": DifyProvider,
        "deepseek": DeepSeekProvider,
        "zhipu": ZhipuProvider,
    }

    @classmethod
    def get_provider(cls, provider_name: str, **config) -> BaseAIProvider:
        """
        根据提供商名称获取实例
        :param provider_name: 提供商名称（doubao, dify, deepseek, zhipu）
        :param config: 配置参数，会与环境变量中的配置合并
        :return: BaseAIProvider 实例
        :raises ValueError: 如果提供商不支持
        """
        provider_class = cls._providers.get(provider_name.lower())
        if not provider_class:
            raise ValueError(
                f"Unsupported AI provider: {provider_name}. "
                f"Supported providers: {list(cls._providers.keys())}"
            )

        # 从环境变量获取默认配置
        env_config = cls._get_env_config(provider_name)
        # 合并配置，传入的配置优先级更高
        merged_config = {**env_config, **config}

        return provider_class(**merged_config)

    @classmethod
    async def get_provider_from_db(cls, db, slug: str) -> BaseAIProvider:
        """
        从数据库获取 AI Provider 配置并创建实例
        :param db: 数据库会话（异步）
        :param slug: 提供商标识（如 deepseek, zhipu）
        :return: BaseAIProvider 实例
        :raises ValueError: 如果提供商不存在
        """
        from sqlalchemy import select
        from app.models.system import AiProvider

        result = await db.execute(select(AiProvider).where(AiProvider.slug == slug))
        provider = result.scalar_one_or_none()
        if not provider:
            raise ValueError(f"AI provider '{slug}' not found in database")

        return cls.get_provider(provider.slug, **provider.config)

    @classmethod
    def _get_env_config(cls, provider_name: str) -> Dict[str, str]:
        """
        从环境变量获取提供商配置
        配置项格式：{PROVIDER}_API_KEY, {PROVIDER}_API_BASE, {PROVIDER}_MODEL
        """
        prefix = provider_name.upper()
        return {
            "api_key": os.getenv(f"{prefix}_API_KEY", ""),
            "api_base": os.getenv(f"{prefix}_API_BASE", ""),
            "model": os.getenv(f"{prefix}_MODEL", ""),
        }

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
