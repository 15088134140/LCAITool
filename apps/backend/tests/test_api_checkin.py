"""签到 API 测试"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.user import UserCreate
from app.services.user_service import UserService


@pytest.mark.asyncio
async def test_checkin_status(client: AsyncClient, db_session: AsyncSession):
    """测试查询签到状态 - GET /api/v1/users/checkin/status"""
    # 创建测试用户
    user_in = UserCreate(nickname="checkinuser", password="test123", phone="13900001001", code="8888")
    await UserService.create(db_session, user_in)

    # 登录获取token
    response = await client.post("/api/v1/auth/login", data={"username": "checkinuser", "password": "test123"})
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 查询签到状态
    response = await client.get("/api/v1/users/checkin/status", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "today_checked" in data
    assert "streak" in data
    assert "can_checkin" in data


@pytest.mark.asyncio
async def test_checkin_success(client: AsyncClient, db_session: AsyncSession):
    """测试签到成功 - POST /api/v1/users/checkin"""
    # 创建测试用户
    user_in = UserCreate(nickname="checkinsuccess", password="test123", phone="13900001002", code="8888")
    await UserService.create(db_session, user_in)

    # 登录获取token
    response = await client.post("/api/v1/auth/login", data={"username": "checkinsuccess", "password": "test123"})
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 执行签到
    response = await client.post("/api/v1/users/checkin", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["points_earned"] > 0
    assert data["streak"] >= 1


@pytest.mark.asyncio
async def test_checkin_duplicate(client: AsyncClient, db_session: AsyncSession):
    """测试重复签到返回400 - POST /api/v1/users/checkin"""
    # 创建测试用户
    user_in = UserCreate(nickname="checkindup", password="test123", phone="13900001003", code="8888")
    await UserService.create(db_session, user_in)

    # 登录获取token
    response = await client.post("/api/v1/auth/login", data={"username": "checkindup", "password": "test123"})
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 第一次签到
    await client.post("/api/v1/users/checkin", headers=headers)
    # 第二次签到（重复）
    response = await client.post("/api/v1/users/checkin", headers=headers)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_checkin_unauthorized(client: AsyncClient):
    """测试未登录签到返回401"""
    response = await client.post("/api/v1/users/checkin")
    assert response.status_code == 401
