import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.tool import (
    ToolCreate, ToolUpdate,
    ToolCategoryCreate, ToolCategoryUpdate,
    ToolRatingCreate,
    ToolDemoCreate
)
from app.services.tool_service import ToolService
from app.core.exceptions import ToolNotFoundException, ToolCategoryNotFoundException


# ============== ToolCategory Tests ==============

@pytest.mark.asyncio
async def test_create_category(db_session: AsyncSession):
    """测试创建工具分类"""
    category_in = ToolCategoryCreate(
        slug="ai-story",
        name="AI绘本",
        description="AI生成绘本工具",
        sort_order=1
    )
    category = await ToolService.create_category(db_session, category_in)

    assert category.id is not None
    assert category.slug == "ai-story"
    assert category.name == "AI绘本"
    assert category.tool_count == 0
    assert category.is_active is True


@pytest.mark.asyncio
async def test_list_categories(db_session: AsyncSession):
    """测试获取分类列表"""
    # 创建多个分类
    for i in range(3):
        category_in = ToolCategoryCreate(
            slug=f"category-{i}",
            name=f"分类{i}",
            sort_order=i
        )
        await ToolService.create_category(db_session, category_in)

    categories = await ToolService.list_categories(db_session)
    assert len(categories) >= 3


@pytest.mark.asyncio
async def test_update_category(db_session: AsyncSession):
    """测试更新分类"""
    # 创建分类
    category_in = ToolCategoryCreate(
        slug="test-update",
        name="测试更新",
        sort_order=10
    )
    category = await ToolService.create_category(db_session, category_in)

    # 更新
    update_in = ToolCategoryUpdate(
        name="更新后的名称",
        is_featured=True
    )
    updated = await ToolService.update_category(db_session, category.id, update_in)

    assert updated.name == "更新后的名称"
    assert updated.is_featured is True
    assert updated.slug == "test-update"  # 未修改的字段保持不变


@pytest.mark.asyncio
async def test_update_category_not_found(db_session: AsyncSession):
    """测试更新不存在的分类"""
    update_in = ToolCategoryUpdate(name="测试")
    with pytest.raises(ToolCategoryNotFoundException):
        await ToolService.update_category(db_session, uuid.uuid4(), update_in)


# ============== Tool CRUD Tests ==============

@pytest.mark.asyncio
async def test_create_tool(db_session: AsyncSession):
    """测试创建工具"""
    tool_in = ToolCreate(
        slug="storybook-generator",
        name="AI有声绘本生成器",
        description="专业AI绘本生成工具，支持多风格插图和语音合成",
        short_desc="一键生成专业有声绘本",
        base_fee=50,
        image_fee=10,
        audio_fee=5,
        status=1
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    assert tool.id is not None
    assert tool.slug == "storybook-generator"
    assert tool.name == "AI有声绘本生成器"
    assert tool.base_fee == 50
    assert tool.use_count == 0
    assert tool.favorite_count == 0
    assert tool.rating_count == 0


@pytest.mark.asyncio
async def test_get_tool_by_id(db_session: AsyncSession):
    """测试根据ID获取工具"""
    tool_in = ToolCreate(
        slug="test-id",
        name="测试工具",
        base_fee=10
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    found = await ToolService.get_tool_by_id(db_session, tool.id)
    assert found is not None
    assert found.id == tool.id
    assert found.name == "测试工具"


@pytest.mark.asyncio
async def test_get_tool_by_slug(db_session: AsyncSession):
    """测试根据标识获取工具"""
    tool_in = ToolCreate(
        slug="unique-slug-123",
        name="测试工具Slug",
        base_fee=10
    )
    await ToolService.create_tool(db_session, tool_in)

    found = await ToolService.get_tool_by_slug(db_session, "unique-slug-123")
    assert found is not None
    assert found.slug == "unique-slug-123"


@pytest.mark.asyncio
async def test_get_tool_not_found(db_session: AsyncSession):
    """测试获取不存在的工具"""
    found = await ToolService.get_tool_by_id(db_session, uuid.uuid4())
    assert found is None


@pytest.mark.asyncio
async def test_list_tools(db_session: AsyncSession):
    """测试获取工具列表"""
    # 创建多个工具
    for i in range(5):
        tool_in = ToolCreate(
            slug=f"tool-list-{i}",
            name=f"工具{i}",
            base_fee=10 + i
        )
        await ToolService.create_tool(db_session, tool_in)

    tools, total = await ToolService.list_tools(db_session, skip=0, limit=10)
    assert total >= 5
    assert len(tools) >= 5


@pytest.mark.asyncio
async def test_list_tools_with_search(db_session: AsyncSession):
    """测试工具搜索"""
    # 创建工具
    tool_in = ToolCreate(
        slug="searchable-tool",
        name="特殊搜索工具",
        description="这是一个用于搜索测试的工具",
        base_fee=10
    )
    await ToolService.create_tool(db_session, tool_in)

    # 按名称搜索
    tools, total = await ToolService.list_tools(db_session, search="特殊搜索", skip=0, limit=10)
    assert total >= 1

    # 按描述搜索
    tools2, total2 = await ToolService.list_tools(db_session, search="搜索测试", skip=0, limit=10)
    assert total2 >= 1


@pytest.mark.asyncio
async def test_list_tools_pagination(db_session: AsyncSession):
    """测试工具分页"""
    # 创建15个工具
    for i in range(15):
        tool_in = ToolCreate(
            slug=f"paginate-tool-{i}",
            name=f"分页工具{i}",
            base_fee=10
        )
        await ToolService.create_tool(db_session, tool_in)

    # 第一页
    tools1, total1 = await ToolService.list_tools(db_session, skip=0, limit=10)
    assert total1 >= 15
    assert len(tools1) == 10

    # 第二页
    tools2, total2 = await ToolService.list_tools(db_session, skip=10, limit=10)
    assert total2 >= 15
    assert len(tools2) == 5


@pytest.mark.asyncio
async def test_update_tool(db_session: AsyncSession):
    """测试更新工具"""
    tool_in = ToolCreate(
        slug="update-test",
        name="待更新工具",
        base_fee=10
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    update_in = ToolUpdate(
        name="更新后的工具名称",
        base_fee=100,
        status=0
    )
    updated = await ToolService.update_tool(db_session, tool.id, update_in)

    assert updated.name == "更新后的工具名称"
    assert updated.base_fee == 100
    assert updated.status == 0
    assert updated.slug == "update-test"  # 未修改字段保持不变


@pytest.mark.asyncio
async def test_update_tool_not_found(db_session: AsyncSession):
    """测试更新不存在的工具"""
    update_in = ToolUpdate(name="测试")
    with pytest.raises(ToolNotFoundException):
        await ToolService.update_tool(db_session, uuid.uuid4(), update_in)


@pytest.mark.asyncio
async def test_delete_tool(db_session: AsyncSession):
    """测试删除工具"""
    tool_in = ToolCreate(
        slug="to-delete",
        name="待删除工具",
        base_fee=10
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    await ToolService.delete_tool(db_session, tool.id)

    # 验证已删除
    found = await ToolService.get_tool_by_id(db_session, tool.id)
    assert found is None


@pytest.mark.asyncio
async def test_delete_tool_not_found(db_session: AsyncSession):
    """测试删除不存在的工具"""
    with pytest.raises(ToolNotFoundException):
        await ToolService.delete_tool(db_session, uuid.uuid4())


# ============== Favorite Tests ==============

@pytest.mark.asyncio
async def test_toggle_favorite_add(db_session: AsyncSession):
    """测试添加收藏"""
    # 创建工具
    tool_in = ToolCreate(
        slug="fav-tool",
        name="收藏测试工具",
        base_fee=10
    )
    tool = await ToolService.create_tool(db_session, tool_in)
    user_id = uuid.uuid4()

    # 第一次收藏 - 返回True表示已收藏
    result = await ToolService.toggle_favorite(db_session, user_id, tool.id)
    assert result is True

    # 验证收藏计数已增加
    tool = await ToolService.get_tool_by_id(db_session, tool.id)
    assert tool.favorite_count == 1


@pytest.mark.asyncio
async def test_toggle_favorite_remove(db_session: AsyncSession):
    """测试取消收藏"""
    # 创建工具
    tool_in = ToolCreate(
        slug="fav-tool2",
        name="收藏测试工具2",
        base_fee=10
    )
    tool = await ToolService.create_tool(db_session, tool_in)
    user_id = uuid.uuid4()

    # 添加收藏
    await ToolService.toggle_favorite(db_session, user_id, tool.id)

    # 第二次调用（取消收藏）- 返回False表示已取消收藏
    result = await ToolService.toggle_favorite(db_session, user_id, tool.id)
    assert result is False

    # 验证收藏计数已减少
    tool = await ToolService.get_tool_by_id(db_session, tool.id)
    assert tool.favorite_count == 0


@pytest.mark.asyncio
async def test_get_user_favorites(db_session: AsyncSession):
    """测试获取用户收藏列表"""
    user_id = uuid.uuid4()

    # 创建多个工具并收藏
    for i in range(5):
        tool_in = ToolCreate(
            slug=f"user-fav-{i}",
            name=f"用户收藏工具{i}",
            base_fee=10
        )
        tool = await ToolService.create_tool(db_session, tool_in)
        await ToolService.toggle_favorite(db_session, user_id, tool.id)

    favorites, total = await ToolService.get_user_favorites(db_session, user_id, skip=0, limit=10)
    assert total == 5
    assert len(favorites) == 5


# ============== Rating Tests ==============

@pytest.mark.asyncio
async def test_create_rating(db_session: AsyncSession):
    """测试创建评价"""
    # 创建工具
    tool_in = ToolCreate(
        slug="rating-tool",
        name="评价测试工具",
        base_fee=10
    )
    tool = await ToolService.create_tool(db_session, tool_in)
    user_id = uuid.uuid4()
    task_id = uuid.uuid4()

    rating_in = ToolRatingCreate(
        tool_id=tool.id,
        task_id=task_id,
        rating=5,
        content="非常好用的工具，生成的绘本质量很高"
    )
    rating = await ToolService.create_rating(db_session, user_id, rating_in)

    assert rating.id is not None
    assert rating.user_id == user_id
    assert rating.tool_id == tool.id
    assert rating.rating == 5
    assert rating.content == "非常好用的工具，生成的绘本质量很高"

    # 验证工具评分统计已更新
    tool = await ToolService.get_tool_by_id(db_session, tool.id)
    assert tool.rating_count == 1
    assert tool.rating_avg == 5.0


@pytest.mark.asyncio
async def test_get_tool_ratings(db_session: AsyncSession):
    """测试获取工具评价列表"""
    # 创建工具
    tool_in = ToolCreate(
        slug="rating-list-tool",
        name="评价列表测试工具",
        base_fee=10
    )
    tool = await ToolService.create_tool(db_session, tool_in)
    user_id = uuid.uuid4()

    # 创建多条评价
    for i in range(3):
        rating_in = ToolRatingCreate(
            tool_id=tool.id,
            task_id=uuid.uuid4(),
            rating=3 + i,  # 3, 4, 5
            content=f"评价内容{i}"
        )
        await ToolService.create_rating(db_session, user_id, rating_in)

    ratings, total = await ToolService.get_tool_ratings(db_session, tool.id, skip=0, limit=10)
    assert total == 3
    assert len(ratings) == 3


# ============== Demo Tests ==============

@pytest.mark.asyncio
async def test_create_demo(db_session: AsyncSession):
    """测试创建演示案例"""
    # 创建工具
    tool_in = ToolCreate(
        slug="demo-tool",
        name="演示测试工具",
        base_fee=10
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    demo_in = ToolDemoCreate(
        tool_id=tool.id,
        title="太空冒险绘本示例",
        description="这是一个精美的太空主题绘本示例",
        cover_image="https://example.com/cover.jpg",
        demo_type="image",
        sort_order=1
    )
    demo = await ToolService.create_demo(db_session, demo_in)

    assert demo.id is not None
    assert demo.tool_id == tool.id
    assert demo.title == "太空冒险绘本示例"
    assert demo.is_active is True


@pytest.mark.asyncio
async def test_list_demos(db_session: AsyncSession):
    """测试获取工具演示案例列表"""
    # 创建工具
    tool_in = ToolCreate(
        slug="demo-list-tool",
        name="演示列表测试工具",
        base_fee=10
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    # 创建多个演示案例
    for i in range(3):
        demo_in = ToolDemoCreate(
            tool_id=tool.id,
            title=f"示例{i}",
            sort_order=i
        )
        await ToolService.create_demo(db_session, demo_in)

    demos = await ToolService.list_demos(db_session, tool.id)
    assert len(demos) == 3
    # 验证按sort_order排序
    assert demos[0].sort_order == 0
    assert demos[1].sort_order == 1
    assert demos[2].sort_order == 2
