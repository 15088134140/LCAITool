"""
执行器注册表
统一维护工具 executor_key 与执行器类的映射关系。
"""
from typing import Dict, Optional

from .base import BaseToolExecutor
from .storybook import StorybookExecutor
from .ecommerce import EcommerceExecutor
from .marketing import MarketingExecutor
from .creative_video import CreativeVideoExecutor


EXECUTOR_REGISTRY: Dict[str, dict] = {
    "storybook-generator": {
        "key": "storybook-generator",
        "name": "绘本生成执行器",
        "description": "生成绘本、页面图片、音频、PDF",
        "class": StorybookExecutor,
        "aliases": [],
    },
    "ecommerce-detail": {
        "key": "ecommerce-detail",
        "name": "电商详情页执行器",
        "description": "生成电商详情页素材",
        "class": EcommerceExecutor,
        "aliases": ["ecommerce"],
    },
    "product-description": {
        "key": "product-description",
        "name": "营销文案执行器",
        "description": "生成商品/营销文案",
        "class": MarketingExecutor,
        "aliases": ["marketing"],
    },
    "creative-video-generator": {
        "key": "creative-video-generator",
        "name": "创意视频生成器执行器",
        "description": "调用 Seedance 1.5 Pro 生成单条创意视频",
        "class": CreativeVideoExecutor,
        "aliases": [],
    },
}


def resolve_executor_key(key_or_alias: str) -> Optional[str]:
    """把 canonical key 或 legacy alias 解析为 canonical executor_key"""
    for entry in EXECUTOR_REGISTRY.values():
        if key_or_alias == entry["key"] or key_or_alias in entry.get("aliases", []):
            return entry["key"]
    return None


def get_executor_class(key_or_alias: str) -> Optional[type[BaseToolExecutor]]:
    """支持 canonical key 和 legacy alias 获取执行器类"""
    canonical = resolve_executor_key(key_or_alias)
    if canonical and canonical in EXECUTOR_REGISTRY:
        return EXECUTOR_REGISTRY[canonical]["class"]
    return None


def list_executors() -> list[dict]:
    """返回执行器列表（不含 class）"""
    return [
        {"key": v["key"], "name": v["name"], "description": v["description"]}
        for v in EXECUTOR_REGISTRY.values()
    ]
