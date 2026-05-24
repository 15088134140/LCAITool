"""反馈 API 测试"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.user import UserCreate
from app.services.user_service import UserService


@pytest.mark.asyncio
async def test_submit_feedback(client: AsyncClient, db_session: AsyncSession):
    """测试提交反馈 - POST /api/v1/feedback"""
    # 创建测试用户
    user_in = UserCreate(nickname="fbuser", password="test123", phone="13900004001", code="8888")
    await UserService.create(db_session, user_in)

    # 登录获取token
    response = await client.post("/api/v1/auth/login", data={"username": "fbuser", "password": "test123"})
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 提交反馈
    response = await client.post(
        "/api/v1/feedback",
        json={
            "type": "feature",
            "title": "测试反馈",
            "description": "这是一个测试反馈",
        },
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "测试反馈"
    assert data["type"] == "feature"


@pytest.mark.asyncio
async def test_get_my_feedbacks(client: AsyncClient, db_session: AsyncSession):
    """测试获取我的反馈列表 - GET /api/v1/feedback/my"""
    # 创建测试用户
    user_in = UserCreate(nickname="fblist", password="test123", phone="13900004002", code="8888")
    await UserService.create(db_session, user_in)

    # 登录获取token
    response = await client.post("/api/v1/auth/login", data={"username": "fblist", "password": "test123"})
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 先创建一个反馈
    await client.post(
        "/api/v1/feedback",
        json={"type": "bug", "title": "测试反馈2", "description": "第二个测试反馈"},
        headers=headers,
    )

    # 获取反馈列表
    response = await client.get("/api/v1/feedback/my", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) >= 1


@pytest.mark.asyncio
async def test_submit_feedback_unauthorized(client: AsyncClient):
    """测试未登录提交反馈返回401"""
    response = await client.post(
        "/api/v1/feedback",
        json={"type": "feature", "title": "未登录反馈"},
    )
    assert response.status_code == 401
