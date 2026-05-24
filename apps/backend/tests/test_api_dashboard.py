"""Dashboard API 测试"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from tests.test_api_admin import create_test_admin_user, get_user_token


@pytest.mark.asyncio
async def test_dashboard_stats(client: AsyncClient, db_session: AsyncSession):
    """测试获取Dashboard统计数据 - GET /api/v1/admin/dashboard/stats"""
    # 创建管理员用户
    await create_test_admin_user(db_session)

    # 获取管理员token
    admin_token = await get_user_token(client, "admin", "admin123")

    # 获取Dashboard统计
    response = await client.get(
        "/api/v1/admin/dashboard/stats",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "total_users" in data
    assert "verified_users" in data
    assert "total_revenue" in data
    assert "today_tasks" in data
    assert "top_tools" in data
    assert "recent_activities" in data


@pytest.mark.asyncio
async def test_dashboard_stats_unauthorized(client: AsyncClient):
    """测试未登录访问Dashboard返回401"""
    response = await client.get("/api/v1/admin/dashboard/stats")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_dashboard_stats_not_admin(client: AsyncClient, db_session: AsyncSession):
    """测试普通用户访问Dashboard返回403"""
    from app.schemas.user import UserCreate
    from app.services.user_service import UserService
    user_in = UserCreate(nickname="regulardash", password="test123", phone="13900006001", code="8888")
    await UserService.create(db_session, user_in)

    # 登录获取token
    response = await client.post("/api/v1/auth/login", data={"username": "regulardash", "password": "test123"})
    token = response.json()["access_token"]

    # 普通用户访问Dashboard
    response = await client.get(
        "/api/v1/admin/dashboard/stats",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
