"""API Key 管理接口测试"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.user import UserCreate
from app.services.user_service import UserService


@pytest.fixture
async def auth_headers(client: AsyncClient, db_session: AsyncSession):
    """获取已登录用户的认证 headers"""
    user_data = {
        "nickname": "apikeyuser",
        "password": "test123",
        "phone": "13900009001",
        "code": "8888",
    }
    user_in = UserCreate(**user_data)
    await UserService.create(db_session, user_in)

    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": user_data["nickname"],
            "password": user_data["password"],
        },
    )
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ==================== 列表与创建 ====================


@pytest.mark.asyncio
async def test_list_api_keys_empty(client: AsyncClient, auth_headers: dict):
    """初始状态应返回空列表"""
    response = await client.get("/api/v1/users/api-keys", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data == []


@pytest.mark.asyncio
async def test_create_api_key(client: AsyncClient, auth_headers: dict):
    """创建 API Key 应返回 lcai_ 开头的密钥"""
    response = await client.post(
        "/api/v1/users/api-keys",
        json={"name": "测试密钥"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "测试密钥"
    assert data["key"].startswith("lcai_")
    assert data["key_prefix"] == data["key"][:10]
    assert data["status"] == "active"
    assert "warning" in data
    assert "id" in data


@pytest.mark.asyncio
async def test_create_and_list(client: AsyncClient, auth_headers: dict):
    """创建后列表应包含刚创建的密钥（不返回明文 key）"""
    # 创建
    create_resp = await client.post(
        "/api/v1/users/api-keys",
        json={"name": "我的密钥"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    created = create_resp.json()
    key_id = created["id"]
    raw_key = created["key"]

    # 列出
    list_resp = await client.get("/api/v1/users/api-keys", headers=auth_headers)
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) == 1
    item = items[0]
    assert item["id"] == key_id
    assert item["name"] == "我的密钥"
    assert item["key_prefix"] == raw_key[:10]
    assert "key" not in item  # 列表不应返回明文


# ==================== 查看明文 ====================


@pytest.mark.asyncio
async def test_reveal_api_key(client: AsyncClient, auth_headers: dict):
    """查看 API Key 明文应返回与创建时相同的密钥"""
    create_resp = await client.post(
        "/api/v1/users/api-keys",
        json={"name": "reveal-test"},
        headers=auth_headers,
    )
    key_id = create_resp.json()["id"]
    raw_key = create_resp.json()["key"]

    reveal_resp = await client.get(
        f"/api/v1/users/api-keys/{key_id}/reveal",
        headers=auth_headers,
    )
    assert reveal_resp.status_code == 200
    reveal_data = reveal_resp.json()
    assert reveal_data["id"] == key_id
    assert reveal_data["key"] == raw_key


# ==================== 启用/禁用 ====================


@pytest.mark.asyncio
async def test_toggle_api_key_status(client: AsyncClient, auth_headers: dict):
    """启用/禁用开关应正常工作"""
    create_resp = await client.post(
        "/api/v1/users/api-keys",
        json={"name": "toggle-test"},
        headers=auth_headers,
    )
    key_id = create_resp.json()["id"]

    # 禁用
    disable_resp = await client.put(
        f"/api/v1/users/api-keys/{key_id}/status",
        json={"status": "disabled"},
        headers=auth_headers,
    )
    assert disable_resp.status_code == 200
    assert disable_resp.json()["status"] == "disabled"

    # 启用
    enable_resp = await client.put(
        f"/api/v1/users/api-keys/{key_id}/status",
        json={"status": "active"},
        headers=auth_headers,
    )
    assert enable_resp.status_code == 200
    assert enable_resp.json()["status"] == "active"


# ==================== 删除 ====================


@pytest.mark.asyncio
async def test_delete_api_key(client: AsyncClient, auth_headers: dict):
    """删除后列表应为空"""
    create_resp = await client.post(
        "/api/v1/users/api-keys",
        json={"name": "delete-test"},
        headers=auth_headers,
    )
    key_id = create_resp.json()["id"]

    delete_resp = await client.delete(
        f"/api/v1/users/api-keys/{key_id}",
        headers=auth_headers,
    )
    assert delete_resp.status_code == 204

    # 确认列表为空
    list_resp = await client.get("/api/v1/users/api-keys", headers=auth_headers)
    assert list_resp.json() == []


# ==================== 未授权访问 ====================


@pytest.mark.asyncio
async def test_unauthorized_access(client: AsyncClient):
    """未登录访问应返回 401"""
    # GET list
    resp = await client.get("/api/v1/users/api-keys")
    assert resp.status_code == 401

    # POST create
    resp = await client.post("/api/v1/users/api-keys", json={"name": "x"})
    assert resp.status_code == 401

    # GET reveal
    resp = await client.get("/api/v1/users/api-keys/00000000-0000-0000-0000-000000000000/reveal")
    assert resp.status_code == 401

    # PUT status
    resp = await client.put(
        "/api/v1/users/api-keys/00000000-0000-0000-0000-000000000000/status",
        json={"status": "active"},
    )
    assert resp.status_code == 401

    # DELETE
    resp = await client.delete(
        "/api/v1/users/api-keys/00000000-0000-0000-0000-000000000000"
    )
    assert resp.status_code == 401
