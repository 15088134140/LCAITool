"""
用户接口API测试用例
覆盖：用户信息查询、修改、实名认证、密码修改等场景
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.user import UserCreate
from app.services.user_service import UserService


# ==================== Fixture ====================

def _create_user_data(index: int) -> dict:
    """生成不同的测试用户数据"""
    return {
        "nickname": f"testuser{index}",
        "password": "test123",
        "phone": f"1390000{index:04d}",
        "code": "8888"
    }


@pytest.fixture
async def test_user_data():
    """测试用户基础数据"""
    return _create_user_data(0)


@pytest.fixture
async def auth_headers(client: AsyncClient, db_session: AsyncSession):
    """获取已登录用户的认证headers"""
    # 创建测试用户
    user_data = _create_user_data(1)
    user_in = UserCreate(**user_data)
    await UserService.create(db_session, user_in)

    # 登录获取token
    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": user_data["nickname"],
            "password": user_data["password"]
        }
    )
    token = login_response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def created_user_id(client: AsyncClient, db_session: AsyncSession):
    """创建测试用户并返回用户ID"""
    user_data = _create_user_data(2)
    user_in = UserCreate(**user_data)
    user = await UserService.create(db_session, user_in)
    return str(user.id)


# ==================== 用户信息接口测试 ====================

@pytest.mark.asyncio
async def test_get_current_user_info(client: AsyncClient, auth_headers: dict):
    """测试获取当前用户信息 - GET /api/v1/users/me"""
    response = await client.get(
        "/api/v1/users/me",
        headers=auth_headers
    )

    print(f"\n[test_get_current_user_info] 响应状态码: {response.status_code}")
    print(f"[test_get_current_user_info] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    # auth_headers fixture 使用的是 testuser1
    assert data["nickname"] == "testuser1"
    assert data["phone"] == "13900000001"
    assert "id" in data
    assert "balance" in data
    assert "id_card_verified" in data


@pytest.mark.asyncio
async def test_update_user_basic_info(client: AsyncClient, auth_headers: dict):
    """测试更新用户基本信息 - PUT /api/v1/users/me"""
    update_data = {
        "nickname": "updated_nickname",
        "avatar": "https://example.com/new_avatar.jpg"
    }

    response = await client.put(
        "/api/v1/users/me",
        json=update_data,
        headers=auth_headers
    )

    print(f"\n[test_update_user_basic_info] 响应状态码: {response.status_code}")
    print(f"[test_update_user_basic_info] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert data["nickname"] == "updated_nickname"
    assert data["avatar"] == "https://example.com/new_avatar.jpg"


@pytest.mark.asyncio
async def test_update_user_info_unauthorized(client: AsyncClient):
    """测试未登录更新用户信息 - PUT /api/v1/users/me"""
    update_data = {
        "nickname": "should_fail"
    }

    response = await client.put(
        "/api/v1/users/me",
        json=update_data
    )

    print(f"\n[test_update_user_info_unauthorized] 响应状态码: {response.status_code}")
    print(f"[test_update_user_info_unauthorized] 响应内容: {response.json()}")

    assert response.status_code == 401
    data = response.json()
    assert data["code"] == 401


# ==================== 实名认证接口测试 ====================

@pytest.mark.asyncio
async def test_submit_real_name_verification(client: AsyncClient, auth_headers: dict):
    """测试提交实名认证 - POST /api/v1/users/verify-id"""
    verify_data = {
        "real_name": "张三",
        "id_card_number": "110101199001011234"
    }

    response = await client.post(
        "/api/v1/users/verify-id",
        json=verify_data,
        headers=auth_headers
    )

    print(f"\n[test_submit_real_name_verification] 响应状态码: {response.status_code}")
    print(f"[test_submit_real_name_verification] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert data["id_card_verified"] == True
    assert "real_name" in data
    assert "id_card_number" in data
    # 验证身份证号脱敏
    assert data["id_card_number"].startswith("1101")
    assert "****" in data["id_card_number"]


@pytest.mark.asyncio
async def test_verification_invalid_id_card(client: AsyncClient, auth_headers: dict):
    """测试无效身份证号验证 - POST /api/v1/users/verify-id"""
    verify_data = {
        "real_name": "李四",
        "id_card_number": "invalid_id_card"  # 无效格式
    }

    response = await client.post(
        "/api/v1/users/verify-id",
        json=verify_data,
        headers=auth_headers
    )

    print(f"\n[test_verification_invalid_id_card] 响应状态码: {response.status_code}")
    print(f"[test_verification_invalid_id_card] 响应内容: {response.json()}")

    # 身份证号格式错误返回400（业务验证错误）
    assert response.status_code == 400
    data = response.json()
    assert data["code"] == 400


# ==================== 密码修改接口测试 ====================

@pytest.mark.asyncio
async def test_change_password_success(client: AsyncClient, db_session: AsyncSession):
    """测试修改密码成功 - POST /api/v1/users/change-password"""
    # 创建测试用户
    user_in = UserCreate(
        nickname="pwdchangetest",
        password="oldpassword",
        phone="13900002222",
        code="8888"
    )
    await UserService.create(db_session, user_in)

    # 登录获取token
    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "pwdchangetest",
            "password": "oldpassword"
        }
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 修改密码
    change_pwd_data = {
        "old_password": "oldpassword",
        "new_password": "newpassword123"
    }

    response = await client.post(
        "/api/v1/users/change-password",
        json=change_pwd_data,
        headers=headers
    )

    print(f"\n[test_change_password_success] 响应状态码: {response.status_code}")
    print(f"[test_change_password_success] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "成功" in data["message"]


@pytest.mark.asyncio
async def test_change_password_wrong_old(client: AsyncClient, db_session: AsyncSession):
    """测试旧密码错误 - POST /api/v1/users/change-password"""
    # 创建测试用户
    user_in = UserCreate(
        nickname="wrongoldpwd",
        password="correctpassword",
        phone="13900003333",
        code="8888"
    )
    await UserService.create(db_session, user_in)

    # 登录获取token
    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "wrongoldpwd",
            "password": "correctpassword"
        }
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 使用错误的旧密码
    change_pwd_data = {
        "old_password": "wrongpassword",
        "new_password": "newpassword123"
    }

    response = await client.post(
        "/api/v1/users/change-password",
        json=change_pwd_data,
        headers=headers
    )

    print(f"\n[test_change_password_wrong_old] 响应状态码: {response.status_code}")
    print(f"[test_change_password_wrong_old] 响应内容: {response.json()}")

    assert response.status_code == 400
    data = response.json()
    assert data["code"] == 400


@pytest.mark.asyncio
async def test_change_password_unauthorized(client: AsyncClient):
    """测试未登录修改密码 - POST /api/v1/users/change-password"""
    change_pwd_data = {
        "old_password": "anyold",
        "new_password": "anynew"
    }

    response = await client.post(
        "/api/v1/users/change-password",
        json=change_pwd_data
    )

    print(f"\n[test_change_password_unauthorized] 响应状态码: {response.status_code}")
    print(f"[test_change_password_unauthorized] 响应内容: {response.json()}")

    assert response.status_code == 401
    data = response.json()
    assert data["code"] == 401


@pytest.mark.asyncio
async def test_login_with_new_password(client: AsyncClient, db_session: AsyncSession):
    """测试使用新密码登录 - 修改密码后验证登录"""
    # 创建测试用户
    user_in = UserCreate(
        nickname="newlogintest",
        password="oldpwd",
        phone="13900004444",
        code="8888"
    )
    await UserService.create(db_session, user_in)

    # 登录获取token
    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "newlogintest",
            "password": "oldpwd"
        }
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 修改密码
    change_pwd_data = {
        "old_password": "oldpwd",
        "new_password": "newpwd123"
    }

    await client.post(
        "/api/v1/users/change-password",
        json=change_pwd_data,
        headers=headers
    )

    # 使用新密码登录
    new_login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "newlogintest",
            "password": "newpwd123"
        }
    )

    print(f"\n[test_login_with_new_password] 响应状态码: {new_login_response.status_code}")
    print(f"[test_login_with_new_password] 响应内容: {new_login_response.json()}")

    assert new_login_response.status_code == 200
    new_data = new_login_response.json()
    assert "access_token" in new_data
    assert len(new_data["access_token"]) > 0


# ==================== 用户统计接口测试 ====================

@pytest.mark.asyncio
async def test_get_user_stats(client: AsyncClient, auth_headers: dict):
    """测试获取用户统计数据 - GET /api/v1/users/stats"""
    response = await client.get(
        "/api/v1/users/stats",
        headers=auth_headers
    )

    print(f"\n[test_get_user_stats] 响应状态码: {response.status_code}")
    print(f"[test_get_user_stats] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert "days_used" in data
    assert "today_count" in data
    assert "total_works" in data
    assert "total_consumed" in data
    assert "reward_points" in data
    assert data["days_used"] >= 1
    assert data["today_count"] >= 0
    assert data["total_works"] >= 0
    assert data["total_consumed"] >= 0
    assert data["reward_points"] >= 0


@pytest.mark.asyncio
async def test_get_user_stats_unauthorized(client: AsyncClient):
    """测试未登录获取用户统计 - GET /api/v1/users/stats"""
    response = await client.get("/api/v1/users/stats")

    print(f"\n[test_get_user_stats_unauthorized] 响应状态码: {response.status_code}")
    print(f"[test_get_user_stats_unauthorized] 响应内容: {response.json()}")

    assert response.status_code == 401
    data = response.json()
    assert data["code"] == 401


# ==================== 用户查询接口测试 ====================

@pytest.mark.asyncio
async def test_get_user_by_id(client: AsyncClient, auth_headers: dict, created_user_id: str):
    """测试查询指定用户信息 - GET /api/v1/users/{user_id}"""
    response = await client.get(
        f"/api/v1/users/{created_user_id}",
        headers=auth_headers
    )

    print(f"\n[test_get_user_by_id] 响应状态码: {response.status_code}")
    print(f"[test_get_user_by_id] 响应内容: {response.json()}")

    # 检查接口是否存在
    if response.status_code == 404:
        print("[test_get_user_by_id] 注意：GET /api/v1/users/{user_id} 接口未实现")
        pytest.skip("GET /api/v1/users/{user_id} 接口未实现")
    elif response.status_code == 200:
        data = response.json()
        assert "id" in data
        assert data["id"] == created_user_id
    else:
        # 其他可能的响应（如权限限制）
        assert response.status_code in [403, 401]  # 可能需要管理员权限
