"""评价 API 测试"""
import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.tool import Tool, ToolCategory
from app.schemas.user import UserCreate
from app.services.user_service import UserService


@pytest.fixture
async def test_tool(db_session: AsyncSession) -> uuid.UUID:
    """创建测试工具并返回工具ID"""
    cat = ToolCategory(
        id=uuid.uuid4(),
        slug="test-cat",
        name="测试分类",
    )
    db_session.add(cat)
    await db_session.flush()

    tool = Tool(
        id=uuid.uuid4(),
        slug="test-rating-tool",
        name="测试工具",
        category_id=cat.id,
        status=1,
    )
    db_session.add(tool)
    await db_session.commit()
    return tool.id


@pytest.mark.asyncio
async def test_get_rating_stats(client: AsyncClient, test_tool):
    """测试获取评价统计 - GET /api/v1/tools/{tool_id}/ratings/stats"""
    response = await client.get(f"/api/v1/tools/{test_tool}/ratings/stats")
    assert response.status_code == 200
    data = response.json()
    assert "avg_rating" in data or "average" in data
    assert "total_count" in data or "count" in data
    assert "distribution" in data


@pytest.mark.asyncio
async def test_get_ratings(client: AsyncClient, test_tool):
    """测试获取评价列表 - GET /api/v1/tools/{tool_id}/ratings"""
    response = await client.get(f"/api/v1/tools/{test_tool}/ratings")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data


@pytest.mark.asyncio
async def test_create_rating(client: AsyncClient, db_session: AsyncSession, test_tool):
    """测试创建评价 - POST /api/v1/tools/{tool_id}/ratings"""
    # 创建测试用户
    user_in = UserCreate(nickname="ratinguser", password="test123", phone="13900003001", code="8888")
    await UserService.create(db_session, user_in)

    # 登录获取token
    response = await client.post("/api/v1/auth/login", data={"username": "ratinguser", "password": "test123"})
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 创建评价（需要 tool_id 和 task_id）
    response = await client.post(
        f"/api/v1/tools/{test_tool}/ratings",
        json={"tool_id": str(test_tool), "task_id": str(uuid.uuid4()), "rating": 5, "content": "非常好用的工具！"},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["rating"] == 5


@pytest.mark.asyncio
async def test_get_ratings_unauthorized(client: AsyncClient, test_tool):
    """测试未登录用户也可以查看评价列表（公开接口）"""
    response = await client.get(f"/api/v1/tools/{test_tool}/ratings")
    assert response.status_code == 200
