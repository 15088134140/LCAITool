import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.tool import (
    Tool, ToolCategory, ToolFavorite, ToolRating, ToolDemo
)
from app.models.user import User


@pytest.mark.asyncio
async def test_create_tool_category(db_session: AsyncSession):
    """测试创建工具分类"""
    category = ToolCategory(
        slug="story",
        name="故事创作",
        description="AI故事创作工具",
        icon="https://example.com/icon.png",
        sort_order=1,
        is_active=True,
        is_featured=True
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)

    assert category.id is not None
    assert category.slug == "story"
    assert category.name == "故事创作"
    assert category.tool_count == 0
    assert category.created_at is not None
    assert category.updated_at is not None


@pytest.mark.asyncio
async def test_create_tool_category_with_parent(db_session: AsyncSession):
    """测试创建带父分类的子分类"""
    parent = ToolCategory(
        slug="ai-tools",
        name="AI工具",
        description="所有AI工具"
    )
    db_session.add(parent)
    await db_session.commit()

    child = ToolCategory(
        slug="image-gen",
        name="图像生成",
        description="AI图像生成工具",
        parent_id=parent.id
    )
    db_session.add(child)
    await db_session.commit()
    await db_session.refresh(child)

    assert child.parent_id == parent.id

    # 测试关系
    await db_session.refresh(parent, ["children"])
    assert len(parent.children) == 1
    assert parent.children[0].id == child.id


@pytest.mark.asyncio
async def test_create_tool(db_session: AsyncSession):
    """测试创建工具"""
    category = ToolCategory(
        slug="story",
        name="故事创作"
    )
    db_session.add(category)
    await db_session.commit()

    tool = Tool(
        slug="storybook",
        name="有声绘本生成",
        short_desc="一键生成精美有声绘本",
        description="基于AI的智能绘本生成工具，支持自定义主题、角色等",
        cover_image="https://example.com/cover.jpg",
        category_id=category.id,
        category="故事创作",
        tags='["绘本", "AI", "儿童"]',
        base_fee=10,
        image_fee=2,
        audio_fee=1,
        token_fee=0,
        config={"max_pages": 20, "ai_model": "gpt-4"},
        status=1
    )
    db_session.add(tool)
    await db_session.commit()
    await db_session.refresh(tool)

    assert tool.id is not None
    assert tool.slug == "storybook"
    assert tool.name == "有声绘本生成"
    assert tool.base_fee == 10
    assert tool.use_count == 0
    assert tool.favorite_count == 0
    assert tool.rating_count == 0
    assert float(tool.rating_avg) == 0.0


@pytest.mark.asyncio
async def test_tool_category_relationship(db_session: AsyncSession):
    """测试工具和分类的关系"""
    category = ToolCategory(
        slug="story",
        name="故事创作"
    )
    db_session.add(category)
    await db_session.commit()

    tool1 = Tool(
        slug="storybook",
        name="有声绘本生成",
        category_id=category.id,
        base_fee=10
    )
    tool2 = Tool(
        slug="short-story",
        name="短篇小说生成",
        category_id=category.id,
        base_fee=5
    )
    db_session.add_all([tool1, tool2])
    await db_session.commit()

    await db_session.refresh(category, ["tools"])
    assert len(category.tools) == 2
    assert category.tools[0].slug in ["storybook", "short-story"]
    assert category.tools[1].slug in ["storybook", "short-story"]


@pytest.mark.asyncio
async def test_create_tool_favorite(db_session: AsyncSession):
    """测试创建工具收藏"""
    # 创建用户
    user = User(
        nickname="testuser",
        phone="13800138000",
        balance=100
    )
    db_session.add(user)

    # 创建工具
    tool = Tool(
        slug="storybook",
        name="有声绘本生成",
        base_fee=10
    )
    db_session.add(tool)
    await db_session.commit()

    # 创建收藏
    favorite = ToolFavorite(
        user_id=user.id,
        tool_id=tool.id
    )
    db_session.add(favorite)
    await db_session.commit()
    await db_session.refresh(favorite)

    assert favorite.id is not None
    assert favorite.user_id == user.id
    assert favorite.tool_id == tool.id


@pytest.mark.asyncio
async def test_tool_favorite_relationships(db_session: AsyncSession):
    """测试工具收藏关系"""
    user = User(nickname="testuser", phone="13800138001", balance=100)
    tool = Tool(slug="storybook", name="有声绘本生成", base_fee=10)
    db_session.add_all([user, tool])
    await db_session.commit()

    favorite = ToolFavorite(user_id=user.id, tool_id=tool.id)
    db_session.add(favorite)
    await db_session.commit()

    # 测试反向关系
    await db_session.refresh(user, ["favorites"])
    await db_session.refresh(tool, ["favorites"])

    assert len(user.favorites) == 1
    assert len(tool.favorites) == 1


@pytest.mark.asyncio
async def test_create_tool_rating(db_session: AsyncSession):
    """测试创建工具评价"""
    user = User(nickname="testuser", phone="13800138002", balance=100)
    tool = Tool(slug="storybook", name="有声绘本生成", base_fee=10)
    db_session.add_all([user, tool])
    await db_session.commit()

    task_id = uuid.uuid4()
    rating = ToolRating(
        user_id=user.id,
        tool_id=tool.id,
        task_id=task_id,
        rating=5,
        content="非常好用的工具，生成的绘本质量很高！",
        images='["https://example.com/img1.jpg", "https://example.com/img2.jpg"]',
        status=1
    )
    db_session.add(rating)
    await db_session.commit()
    await db_session.refresh(rating)

    assert rating.id is not None
    assert rating.rating == 5
    assert rating.task_id == task_id
    assert rating.is_useful_count == 0


@pytest.mark.asyncio
async def test_tool_rating_with_admin_reply(db_session: AsyncSession):
    """测试带管理员回复的评价"""
    import time

    user = User(nickname="testuser", phone="13800138003", balance=100)
    tool = Tool(slug="storybook", name="有声绘本生成", base_fee=10)
    db_session.add_all([user, tool])
    await db_session.commit()

    rating = ToolRating(
        user_id=user.id,
        tool_id=tool.id,
        task_id=uuid.uuid4(),
        rating=4,
        content="不错的工具"
    )
    db_session.add(rating)
    await db_session.commit()

    # 添加管理员回复
    rating.admin_reply = "感谢您的评价！"
    rating.replied_at = int(time.time())
    await db_session.commit()
    await db_session.refresh(rating)

    assert rating.admin_reply == "感谢您的评价！"
    assert rating.replied_at is not None


@pytest.mark.asyncio
async def test_create_tool_demo(db_session: AsyncSession):
    """测试创建工具演示案例"""
    tool = Tool(slug="storybook", name="有声绘本生成", base_fee=10)
    db_session.add(tool)
    await db_session.commit()

    demo = ToolDemo(
        tool_id=tool.id,
        title="小红帽故事",
        description="经典童话故事生成示例",
        cover_image="https://example.com/redhood.jpg",
        demo_type="image",
        demo_images='["https://example.com/page1.jpg", "https://example.com/page2.jpg"]',
        input_params={"theme": "小红帽", "pages": 5},
        result_sample={"output_url": "https://example.com/result.pdf"},
        sort_order=1,
        is_active=True
    )
    db_session.add(demo)
    await db_session.commit()
    await db_session.refresh(demo)

    assert demo.id is not None
    assert demo.title == "小红帽故事"
    assert demo.tool_id == tool.id


@pytest.mark.asyncio
async def test_tool_demo_relationship(db_session: AsyncSession):
    """测试工具演示案例关系"""
    tool = Tool(slug="storybook", name="有声绘本生成", base_fee=10)
    db_session.add(tool)
    await db_session.commit()

    demo1 = ToolDemo(
        tool_id=tool.id,
        title="小红帽",
        sort_order=1
    )
    demo2 = ToolDemo(
        tool_id=tool.id,
        title="三只小猪",
        sort_order=2
    )
    db_session.add_all([demo1, demo2])
    await db_session.commit()

    await db_session.refresh(tool, ["demos"])
    assert len(tool.demos) == 2


@pytest.mark.asyncio
async def test_unique_constraint_favorite(db_session: AsyncSession):
    """测试用户不能重复收藏同一个工具"""
    user = User(nickname="testuser", phone="13800138004", balance=100)
    tool = Tool(slug="storybook", name="有声绘本生成", base_fee=10)
    db_session.add_all([user, tool])
    await db_session.commit()

    # 第一次收藏
    favorite1 = ToolFavorite(user_id=user.id, tool_id=tool.id)
    db_session.add(favorite1)
    await db_session.commit()

    # 第二次收藏应该失败
    from sqlalchemy.exc import IntegrityError

    favorite2 = ToolFavorite(user_id=user.id, tool_id=tool.id)
    db_session.add(favorite2)

    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_unique_constraint_rating_task_id(db_session: AsyncSession):
    """测试同一个任务不能重复评价"""
    user = User(nickname="testuser", phone="13800138005", balance=100)
    tool = Tool(slug="storybook", name="有声绘本生成", base_fee=10)
    db_session.add_all([user, tool])
    await db_session.commit()

    task_id = uuid.uuid4()

    # 第一次评价
    rating1 = ToolRating(
        user_id=user.id,
        tool_id=tool.id,
        task_id=task_id,
        rating=5
    )
    db_session.add(rating1)
    await db_session.commit()

    # 第二次评价应该失败
    from sqlalchemy.exc import IntegrityError

    rating2 = ToolRating(
        user_id=user.id,
        tool_id=tool.id,
        task_id=task_id,  # 相同的task_id
        rating=4
    )
    db_session.add(rating2)

    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_query_tools_by_category(db_session: AsyncSession):
    """测试按分类查询工具"""
    # 创建两个分类
    cat1 = ToolCategory(slug="story", name="故事创作")
    cat2 = ToolCategory(slug="image", name="图像处理")
    db_session.add_all([cat1, cat2])
    await db_session.commit()

    # 创建多个工具
    tool1 = Tool(slug="storybook", name="有声绘本", category_id=cat1.id, base_fee=10)
    tool2 = Tool(slug="short-story", name="短篇小说", category_id=cat1.id, base_fee=5)
    tool3 = Tool(slug="image-gen", name="图像生成", category_id=cat2.id, base_fee=8)
    db_session.add_all([tool1, tool2, tool3])
    await db_session.commit()

    # 查询故事创作分类的工具
    result = await db_session.execute(
        select(Tool).where(Tool.category_id == cat1.id)
    )
    tools = result.scalars().all()

    assert len(tools) == 2
    tool_slugs = {t.slug for t in tools}
    assert tool_slugs == {"storybook", "short-story"}


@pytest.mark.asyncio
async def test_tool_default_values(db_session: AsyncSession):
    """测试工具默认值"""
    tool = Tool(
        slug="test-tool",
        name="测试工具"
    )
    db_session.add(tool)
    await db_session.commit()
    await db_session.refresh(tool)

    assert tool.base_fee == 0
    assert tool.image_fee == 0
    assert tool.audio_fee == 0
    assert tool.token_fee == 0
    assert tool.status == 1
    assert tool.use_count == 0
    assert tool.favorite_count == 0
    assert tool.rating_count == 0
    assert float(tool.rating_avg) == 0.0
