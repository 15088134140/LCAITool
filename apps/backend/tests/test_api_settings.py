"""系统设置 API 测试"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from tests.test_api_admin import create_test_admin_user, get_user_token


@pytest.mark.asyncio
async def test_get_settings(client: AsyncClient, db_session: AsyncSession):
    """测试获取系统配置列表（需管理员权限） - GET /api/v1/admin/settings"""
    # 创建管理员用户
    await create_test_admin_user(db_session)

    # 获取管理员token
    admin_token = await get_user_token(client, "admin", "admin123")

    # 获取系统配置
    response = await client.get(
        "/api/v1/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_settings_with_group(client: AsyncClient, db_session: AsyncSession):
    """测试按分组获取系统配置 - GET /api/v1/admin/settings?group=basic"""
    # 创建管理员用户
    await create_test_admin_user(db_session)

    # 获取管理员token
    admin_token = await get_user_token(client, "admin", "admin123")

    # 按分组获取
    response = await client.get(
        "/api/v1/admin/settings",
        params={"group": "basic"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_ai_providers(client: AsyncClient, db_session: AsyncSession):
    """测试获取 AI 提供商列表（需管理员权限） - GET /api/v1/admin/ai-providers"""
    # 创建管理员用户
    await create_test_admin_user(db_session)

    # 获取管理员token
    admin_token = await get_user_token(client, "admin", "admin123")

    # 获取AI提供商列表
    response = await client.get(
        "/api/v1/admin/ai-providers",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_settings_unauthorized(client: AsyncClient):
    """测试未登录访问设置返回401"""
    response = await client.get("/api/v1/admin/settings")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_settings_not_admin(client: AsyncClient, db_session: AsyncSession):
    """测试普通用户访问设置返回403"""
    # 创建普通用户
    from app.schemas.user import UserCreate
    from app.services.user_service import UserService
    user_in = UserCreate(nickname="regularsetting", password="test123", phone="13900005001", code="8888")
    await UserService.create(db_session, user_in)

    # 登录获取token
    response = await client.post("/api/v1/auth/login", data={"username": "regularsetting", "password": "test123"})
    token = response.json()["access_token"]

    # 普通用户访问设置
    response = await client.get(
        "/api/v1/admin/settings",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
