import uuid
from sqlalchemy import (
    Column, String, Integer, ForeignKey, Text, Boolean, Numeric, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.mixins import JSONType


class ToolCategory(BaseModel):
    __tablename__ = "tool_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False, comment="分类标识")
    name = Column(String(50), unique=True, index=True, nullable=False, comment="分类名称")
    icon = Column(String(255), nullable=True, comment="分类图标URL")
    description = Column(String(255), nullable=True, comment="分类描述")
    sort_order = Column(Integer, default=0, nullable=False, comment="排序顺序，数字越小越靠前")
    tool_count = Column(Integer, default=0, nullable=False, comment="工具数量")
    is_active = Column(Boolean, default=True, nullable=False, comment="是否启用")
    is_featured = Column(Boolean, default=False, nullable=False, comment="是否推荐")
    parent_id = Column(UUID(as_uuid=True), ForeignKey("tool_categories.id", ondelete="SET NULL"), nullable=True, index=True, comment="父分类ID")

    parent = relationship("ToolCategory", remote_side=[id], backref="children")
    tools = relationship("Tool", back_populates="category_obj", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_category_parent_id", "parent_id"),
    )


class Tool(BaseModel):
    __tablename__ = "tools"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False, comment="工具标识")
    name = Column(String(100), index=True, nullable=False, comment="工具名称")
    description = Column(Text, nullable=True, comment="详细描述")
    short_desc = Column(String(255), nullable=True, comment="简短描述")
    cover_image = Column(Text, nullable=True, comment="封面图片URL，多张图片以 | 分隔")
    category_id = Column(UUID(as_uuid=True), ForeignKey("tool_categories.id", ondelete="SET NULL"), nullable=True, index=True, comment="分类ID")
    category = Column(String(50), nullable=True, comment="分类名称（冗余字段）")
    tags = Column(Text, nullable=True, comment="标签列表，JSON格式")
    base_fee = Column(Integer, default=0, nullable=False, comment="基础费（积分）")
    image_fee = Column(Integer, default=0, nullable=False, comment="图片费（积分/张）")
    audio_fee = Column(Integer, default=0, nullable=False, comment="音频费（积分/段）")
    token_fee = Column(Integer, default=0, nullable=False, comment="Token费（积分/千token）")
    config = Column(JSONType, nullable=True, comment="工具配置，JSON格式")
    status = Column(Integer, default=1, nullable=False, comment="状态：0下线 1上线 2维护中")
    is_featured = Column(Boolean, default=False, nullable=False, comment="是否推荐展示在首页精品工具")
    use_count = Column(Integer, default=0, nullable=False, comment="使用次数")
    favorite_count = Column(Integer, default=0, nullable=False, comment="收藏次数")
    rating_count = Column(Integer, default=0, nullable=False, comment="评价次数")
    rating_avg = Column(Numeric(2, 1), default=0.0, nullable=False, comment="平均评分")
    is_mock_enabled = Column(Boolean, default=False, nullable=False, comment="是否启用Mock执行模式")
    usage_modes = Column(JSONType, nullable=True, comment="使用模式，JSON数组：[\"form\", \"dialog\"]")
    param_schema = Column(JSONType, nullable=True, comment="参数字段映射，JSON数组：[{key, label, type, order}]")

    category_obj = relationship("ToolCategory", back_populates="tools")
    favorites = relationship("ToolFavorite", back_populates="tool", cascade="all, delete-orphan")
    ratings = relationship("ToolRating", back_populates="tool", cascade="all, delete-orphan")
    demos = relationship("ToolDemo", back_populates="tool", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_tool_category_id", "category_id"),
        Index("idx_tool_status", "status"),
    )


class ToolFavorite(BaseModel):
    __tablename__ = "tool_favorites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="用户ID")
    tool_id = Column(UUID(as_uuid=True), ForeignKey("tools.id", ondelete="CASCADE"), nullable=False, index=True, comment="工具ID")

    user = relationship("User", backref="favorites")
    tool = relationship("Tool", back_populates="favorites")

    __table_args__ = (
        Index("idx_favorite_user_tool", "user_id", "tool_id", unique=True),
    )


class ToolRating(BaseModel):
    __tablename__ = "tool_ratings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="用户ID")
    tool_id = Column(UUID(as_uuid=True), ForeignKey("tools.id", ondelete="CASCADE"), nullable=False, index=True, comment="工具ID")
    task_id = Column(UUID(as_uuid=True), nullable=False, unique=True, index=True, comment="任务ID")
    rating = Column(Integer, nullable=False, comment="评分：1-5星")
    content = Column(Text, nullable=True, comment="评价内容")
    images = Column(Text, nullable=True, comment="评价图片，JSON数组格式")
    is_useful_count = Column(Integer, default=0, nullable=False, comment="有用次数")
    status = Column(Integer, default=1, nullable=False, comment="状态：0隐藏 1显示")
    admin_reply = Column(Text, nullable=True, comment="管理员回复")
    replied_at = Column(Integer, nullable=True, comment="回复时间")

    user = relationship("User", backref="ratings")
    tool = relationship("Tool", back_populates="ratings")

    __table_args__ = (
        Index("idx_rating_tool_id", "tool_id"),
        Index("idx_rating_user_id", "user_id"),
    )


class ToolDemo(BaseModel):
    __tablename__ = "tool_demos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tool_id = Column(UUID(as_uuid=True), ForeignKey("tools.id", ondelete="CASCADE"), nullable=False, index=True, comment="工具ID")
    title = Column(String(200), nullable=False, comment="案例标题")
    description = Column(Text, nullable=True, comment="案例描述")
    cover_image = Column(String(255), nullable=True, comment="案例封面图")
    demo_type = Column(String(50), default="image", nullable=False, comment="案例类型：image/image_audio/video")
    demo_images = Column(Text, nullable=True, comment="演示图片，JSON数组格式")
    input_params = Column(JSONType, nullable=True, comment="输入参数示例，JSON格式")
    result_sample = Column(JSONType, nullable=True, comment="输出结果示例，JSON格式")
    sort_order = Column(Integer, default=0, nullable=False, comment="排序顺序")
    is_active = Column(Boolean, default=True, nullable=False, comment="是否启用")
    created_by = Column(UUID(as_uuid=True), nullable=True, comment="创建者ID")

    tool = relationship("Tool", back_populates="demos")

    __table_args__ = (
        Index("idx_demo_tool_id", "tool_id"),
        Index("idx_demo_sort_order", "sort_order"),
    )
