import uuid
from typing import Optional, Any
from pydantic import BaseModel, Field


# ============== ToolCategory Schemas ==============

class ToolCategoryBase(BaseModel):
    slug: str = Field(..., max_length=100, description="分类标识")
    name: str = Field(..., max_length=50, description="分类名称")
    icon: Optional[str] = Field(None, max_length=255, description="分类图标URL")
    description: Optional[str] = Field(None, max_length=255, description="分类描述")
    sort_order: int = Field(0, description="排序顺序，数字越小越靠前")
    is_active: bool = Field(True, description="是否启用")
    is_featured: bool = Field(False, description="是否推荐")
    parent_id: Optional[uuid.UUID] = Field(None, description="父分类ID")


class ToolCategoryCreate(ToolCategoryBase):
    pass


class ToolCategoryUpdate(BaseModel):
    slug: Optional[str] = Field(None, max_length=100, description="分类标识")
    name: Optional[str] = Field(None, max_length=50, description="分类名称")
    icon: Optional[str] = Field(None, max_length=255, description="分类图标URL")
    description: Optional[str] = Field(None, max_length=255, description="分类描述")
    sort_order: Optional[int] = Field(None, description="排序顺序")
    is_active: Optional[bool] = Field(None, description="是否启用")
    is_featured: Optional[bool] = Field(None, description="是否推荐")
    parent_id: Optional[uuid.UUID] = Field(None, description="父分类ID")


class ToolCategoryResponse(ToolCategoryBase):
    id: uuid.UUID
    tool_count: int
    created_at: int
    updated_at: int

    model_config = {"from_attributes": True}


# ============== Tool Schemas ==============

class ToolBase(BaseModel):
    slug: str = Field(..., max_length=100, description="工具标识")
    name: str = Field(..., max_length=100, description="工具名称")
    description: Optional[str] = Field(None, description="详细描述")
    short_desc: Optional[str] = Field(None, max_length=255, description="简短描述")
    cover_image: Optional[str] = Field(None, max_length=255, description="封面图片URL")
    category_id: Optional[uuid.UUID] = Field(None, description="分类ID")
    category: Optional[str] = Field(None, max_length=50, description="分类名称")
    tags: Optional[str] = Field(None, description="标签列表，JSON格式")
    base_fee: int = Field(0, description="基础费（积分）")
    image_fee: int = Field(0, description="图片费（积分/张）")
    audio_fee: int = Field(0, description="音频费（积分/分钟）")
    token_fee: int = Field(0, description="Token费（积分/千token）")
    config: Optional[Any] = Field(None, description="工具配置，JSON格式")
    status: int = Field(1, description="状态：0下线 1上线 2维护中")
    is_featured: bool = Field(False, description="是否推荐展示在首页精品工具")
    usage_modes: Optional[list[str]] = Field(default=None, description="使用模式，可选值 form/dialog")


class ToolCreate(ToolBase):
    pass


class ToolUpdate(BaseModel):
    slug: Optional[str] = Field(None, max_length=100, description="工具标识")
    name: Optional[str] = Field(None, max_length=100, description="工具名称")
    description: Optional[str] = Field(None, description="详细描述")
    short_desc: Optional[str] = Field(None, max_length=255, description="简短描述")
    cover_image: Optional[str] = Field(None, max_length=255, description="封面图片URL")
    category_id: Optional[uuid.UUID] = Field(None, description="分类ID")
    category: Optional[str] = Field(None, max_length=50, description="分类名称")
    tags: Optional[str] = Field(None, description="标签列表，JSON格式")
    base_fee: Optional[int] = Field(None, description="基础费（积分）")
    image_fee: Optional[int] = Field(None, description="图片费（积分/张）")
    audio_fee: Optional[int] = Field(None, description="音频费（积分/分钟）")
    token_fee: Optional[int] = Field(None, description="Token费（积分/千token）")
    config: Optional[Any] = Field(None, description="工具配置，JSON格式")
    status: Optional[int] = Field(None, description="状态：0下线 1上线 2维护中")
    is_featured: Optional[bool] = Field(None, description="是否推荐展示在首页精品工具")
    usage_modes: Optional[list[str]] = Field(None, description="使用模式")


class ToolResponse(ToolBase):
    id: uuid.UUID
    use_count: int
    favorite_count: int
    rating_count: int
    rating_avg: float
    created_at: int
    updated_at: int

    model_config = {"from_attributes": True}


# ============== ToolFavorite Schema ==============

class ToolFavoriteResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    tool_id: uuid.UUID
    created_at: int

    model_config = {"from_attributes": True}


# ============== ToolRating Schemas ==============

class ToolRatingCreate(BaseModel):
    tool_id: uuid.UUID = Field(..., description="工具ID")
    task_id: uuid.UUID = Field(..., description="任务ID")
    rating: int = Field(..., ge=1, le=5, description="评分：1-5星")
    content: Optional[str] = Field(None, description="评价内容")
    images: Optional[str] = Field(None, description="评价图片，JSON数组格式")


class ToolRatingResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    tool_id: uuid.UUID
    task_id: uuid.UUID
    rating: int
    content: Optional[str]
    images: Optional[str]
    is_useful_count: int
    status: int
    admin_reply: Optional[str]
    replied_at: Optional[int]
    created_at: int
    updated_at: int

    model_config = {"from_attributes": True}


# ============== ToolDemo Schemas ==============

class ToolDemoCreate(BaseModel):
    tool_id: uuid.UUID = Field(..., description="工具ID")
    title: str = Field(..., max_length=200, description="案例标题")
    description: Optional[str] = Field(None, description="案例描述")
    cover_image: Optional[str] = Field(None, max_length=255, description="案例封面图")
    demo_type: str = Field("image", max_length=50, description="案例类型：image/image_audio/video")
    demo_images: Optional[str] = Field(None, description="演示图片，JSON数组格式")
    input_params: Optional[Any] = Field(None, description="输入参数示例，JSON格式")
    result_sample: Optional[Any] = Field(None, description="输出结果示例，JSON格式")
    sort_order: int = Field(0, description="排序顺序")
    is_active: bool = Field(True, description="是否启用")
    created_by: Optional[uuid.UUID] = Field(None, description="创建者ID")


class ToolDemoResponse(ToolDemoCreate):
    id: uuid.UUID
    created_at: int
    updated_at: int

    model_config = {"from_attributes": True}
