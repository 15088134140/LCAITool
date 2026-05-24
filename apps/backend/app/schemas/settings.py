import uuid
from typing import Any, Optional
from pydantic import BaseModel, Field


class SystemConfigCreate(BaseModel):
    """创建系统配置"""
    key: str = Field(..., max_length=100, description="配置键")
    value: str = Field("", description="配置值")
    group: str = Field("basic", max_length=50, description="分组")
    label: str = Field(..., max_length=100, description="显示名称")
    description: Optional[str] = Field(None, max_length=500, description="配置说明")
    type: str = Field("string", max_length=20, description="值类型: string/number/boolean/richtext")


class SystemConfigUpdate(BaseModel):
    """批量更新系统配置"""
    settings: dict[str, str] = Field(..., description="配置键值对 {key: value}")


class SystemConfigResponse(BaseModel):
    """系统配置响应"""
    key: str
    value: str
    group: str
    label: str
    description: Optional[str] = None
    type: str
    updated_by: Optional[uuid.UUID] = None
    created_at: int
    updated_at: int

    model_config = {"from_attributes": True}


class AiProviderCreate(BaseModel):
    """创建AI提供商"""
    slug: str = Field(..., max_length=50, description="标识符: volcano/deepseek/dify/openai")
    name: str = Field(..., max_length=100, description="显示名称")
    provider_type: str = Field(..., max_length=50, description="类型: openai/volcano/dify/custom")
    config: Optional[dict[str, Any]] = Field(None, description="配置JSON: 含api_key/base_url/model等")
    is_active: bool = Field(True, description="是否启用")
    sort_order: int = Field(0, description="排序")


class AiProviderUpdate(BaseModel):
    """更新AI提供商"""
    name: Optional[str] = Field(None, max_length=100, description="显示名称")
    provider_type: Optional[str] = Field(None, max_length=50, description="类型")
    config: Optional[dict[str, Any]] = Field(None, description="配置JSON")
    is_active: Optional[bool] = Field(None, description="是否启用")
    sort_order: Optional[int] = Field(None, description="排序")


class AiProviderResponse(BaseModel):
    """AI提供商响应"""
    id: uuid.UUID
    slug: str
    name: str
    provider_type: str
    config: Optional[dict[str, Any]] = None
    is_active: bool
    sort_order: int
    created_by: Optional[uuid.UUID] = None
    created_at: int
    updated_at: int

    model_config = {"from_attributes": True}
