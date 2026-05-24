"""邀请 API 测试"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.user import UserCreate
from app.services.user_service import UserService


@pytest.mark.asyncio
async def test_invite_info(client: AsyncClient, db_session: AsyncSession):
    """测试获取邀请信息 - GET /api/v1/users/invite/info"""
    # 创建测试用户
    user_in = UserCreate(nickname="inviteuser", password="test123", phone="13900002001", code="8888")
    await UserService.create(db_session, user_in)

    # 登录获取token
    response = await client.post("/api/v1/auth/login", data={"username": "inviteuser", "password": "test123"})
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 获取邀请信息
    response = await client.get("/api/v1/users/invite/info", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "invite_code" in data
    assert data["invite_code"].startswith("LCA")


@pytest.mark.asyncio
async def test_invite_list(client: AsyncClient, db_session: AsyncSession):
    """测试获取邀请列表 - GET /api/v1/users/invite/list"""
    # 创建测试用户
    user_in = UserCreate(nickname="invitelist", password="test123", phone="13900002002", code="8888")
    await UserService.create(db_session, user_in)

    # 登录获取token
    response = await client.post("/api/v1/auth/login", data={"username": "invitelist", "password": "test123"})
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 获取邀请列表
    response = await client.get("/api/v1/users/invite/list", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
