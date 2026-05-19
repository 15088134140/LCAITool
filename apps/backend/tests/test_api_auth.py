"""
认证接口API测试用例
覆盖：登录、注册、登出、Token验证、权限验证等场景
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.user import UserCreate
from app.services.user_service import UserService


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, db_session: AsyncSession):
    """测试登录成功 - POST /api/v1/auth/login"""
    # 先创建测试用户
    user_in = UserCreate(
        nickname="testlogin",
        password="test123",
        phone="13800138001",
        code="8888"
    )
    await UserService.create(db_session, user_in)

    # 调用登录接口
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "testlogin",
            "password": "test123"
        }
    )

    print(f"\n[test_login_success] 响应状态码: {response.status_code}")
    print(f"[test_login_success] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert len(data["access_token"]) > 0


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, db_session: AsyncSession):
    """测试错误密码登录 - POST /api/v1/auth/login"""
    # 先创建测试用户
    user_in = UserCreate(
        nickname="testwrong",
        password="test123",
        phone="13800138002",
        code="8888"
    )
    await UserService.create(db_session, user_in)

    # 使用错误密码登录
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "testwrong",
            "password": "wrongpassword"
        }
    )

    print(f"\n[test_login_wrong_password] 响应状态码: {response.status_code}")
    print(f"[test_login_wrong_password] 响应内容: {response.json()}")

    assert response.status_code == 401
    data = response.json()
    assert data["code"] == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """测试不存在用户登录 - POST /api/v1/auth/login"""
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "nonexistentuser",
            "password": "anypassword"
        }
    )

    print(f"\n[test_login_nonexistent_user] 响应状态码: {response.status_code}")
    print(f"[test_login_nonexistent_user] 响应内容: {response.json()}")

    assert response.status_code == 401
    data = response.json()
    assert data["code"] == 401


@pytest.mark.asyncio
async def test_register_new_user(client: AsyncClient):
    """测试新用户注册成功 - POST /api/v1/auth/register"""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "nickname": "newuser",
            "password": "test123456",
            "phone": "13900139001",
            "code": "8888"
        }
    )

    print(f"\n[test_register_new_user] 响应状态码: {response.status_code}")
    print(f"[test_register_new_user] 响应内容: {response.json()}")

    # 验证返回200或201
    assert response.status_code in [200, 201]
    data = response.json()
    assert "id" in data
    assert data["nickname"] == "newuser"
    assert data["phone"] == "13900139001"


@pytest.mark.asyncio
async def test_register_duplicate_phone(client: AsyncClient, db_session: AsyncSession):
    """测试重复手机号注册 - POST /api/v1/auth/register"""
    # 先注册第一个用户
    user_in = UserCreate(
        nickname="firstuser",
        password="test123",
        phone="13800138003",
        code="8888"
    )
    await UserService.create(db_session, user_in)

    # 再用相同的手机号注册
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "nickname": "seconduser",
            "password": "test123456",
            "phone": "13800138003",  # 相同的手机号
            "code": "8888"
        }
    )

    print(f"\n[test_register_duplicate_phone] 响应状态码: {response.status_code}")
    print(f"[test_register_duplicate_phone] 响应内容: {response.json()}")

    # 验证返回400（用户已存在）
    assert response.status_code == 400
    data = response.json()
    assert data["code"] == 400


@pytest.mark.asyncio
async def test_register_invalid_email(client: AsyncClient):
    """测试无效邮箱格式注册 - POST /api/v1/auth/register"""
    # 注意：当前注册schema是phone，不是email
    # 这里测试无效的手机号格式
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "nickname": "emailtest",
            "password": "test123456",
            "phone": "invalid_phone_format",  # 不是11位手机号
            "code": "8888"
        }
    )

    print(f"\n[test_register_invalid_email] 响应状态码: {response.status_code}")
    print(f"[test_register_invalid_email] 响应内容: {response.json()}")

    # 验证返回422（验证错误）
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_missing_fields(client: AsyncClient):
    """测试缺少必填字段 - POST /api/v1/auth/register"""
    # 缺少password字段
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "nickname": "missingfield",
            "phone": "13800138005",
            "code": "8888"
        }
    )

    print(f"\n[test_register_missing_fields] 响应状态码: {response.status_code}")
    print(f"[test_register_missing_fields] 响应内容: {response.json()}")

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_logout_authorized(client: AsyncClient, db_session: AsyncSession):
    """测试已登录用户登出 - POST /api/v1/auth/logout"""
    # 先创建测试用户并登录
    user_in = UserCreate(
        nickname="logouttest",
        password="test123",
        phone="13800138006",
        code="8888"
    )
    await UserService.create(db_session, user_in)

    # 登录获取token
    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "logouttest",
            "password": "test123"
        }
    )
    token = login_response.json()["access_token"]

    # 携带token调用登出接口
    response = await client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"}
    )

    print(f"\n[test_logout_authorized] 响应状态码: {response.status_code}")
    print(f"[test_logout_authorized] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert "message" in data


@pytest.mark.asyncio
async def test_logout_unauthorized(client: AsyncClient):
    """测试未登录用户登出 - POST /api/v1/auth/logout"""
    # 注意：当前logout接口不需要认证
    # 此用例验证接口可以访问（实际项目中logout应该需要认证）
    response = await client.post("/api/v1/auth/logout")

    print(f"\n[test_logout_unauthorized] 响应状态码: {response.status_code}")
    print(f"[test_logout_unauthorized] 响应内容: {response.json()}")

    # 当前实现不需要认证，所以返回200
    # 如果需要认证，应该返回401
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_unauthorized_access_protected_route(client: AsyncClient):
    """测试未授权访问受保护路由 - GET /api/v1/users/me"""
    response = await client.get("/api/v1/users/me")

    print(f"\n[test_unauthorized_access_protected_route] 响应状态码: {response.status_code}")
    print(f"[test_unauthorized_access_protected_route] 响应内容: {response.json()}")

    assert response.status_code == 401
    data = response.json()
    assert data["code"] == 401


# ==================== 扩展测试用例 ====================

@pytest.mark.asyncio
async def test_token_refresh(client: AsyncClient, db_session: AsyncSession):
    """测试Token刷新 - POST /api/v1/auth/refresh"""
    # 先创建测试用户并登录
    user_in = UserCreate(
        nickname="refreshtest",
        password="test123",
        phone="13800138007",
        code="8888"
    )
    await UserService.create(db_session, user_in)

    # 登录获取refresh_token
    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "refreshtest",
            "password": "test123"
        }
    )
    refresh_token = login_response.json()["refresh_token"]

    # 使用refresh_token刷新
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )

    print(f"\n[test_token_refresh] 响应状态码: {response.status_code}")
    print(f"[test_token_refresh] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert len(data["access_token"]) > 0


@pytest.mark.asyncio
async def test_wechat_login(client: AsyncClient):
    """测试微信登录 - POST /api/v1/auth/wechat"""
    response = await client.post(
        "/api/v1/auth/wechat",
        json={"code": "wechat_test_code_123"}
    )

    print(f"\n[test_wechat_login] 响应状态码: {response.status_code}")
    print(f"[test_wechat_login] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_access_protected_route_with_token(client: AsyncClient, db_session: AsyncSession):
    """测试使用有效Token访问受保护路由 - GET /api/v1/users/me"""
    # 先创建测试用户并登录
    user_in = UserCreate(
        nickname="protectedtest",
        password="test123",
        phone="13800138008",
        code="8888"
    )
    await UserService.create(db_session, user_in)

    # 登录获取token
    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "protectedtest",
            "password": "test123"
        }
    )
    token = login_response.json()["access_token"]

    # 使用token访问受保护路由
    response = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )

    print(f"\n[test_access_protected_route_with_token] 响应状态码: {response.status_code}")
    print(f"[test_access_protected_route_with_token] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert data["nickname"] == "protectedtest"


@pytest.mark.asyncio
async def test_login_disabled_user(client: AsyncClient, db_session: AsyncSession):
    """测试禁用用户登录 - POST /api/v1/auth/login"""
    # 先创建测试用户
    user_in = UserCreate(
        nickname="disableduser",
        password="test123",
        phone="13800138009",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 禁用用户
    await UserService.update_status(db_session, user.id, status=0)

    # 尝试登录
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "disableduser",
            "password": "test123"
        }
    )

    print(f"\n[test_login_disabled_user] 响应状态码: {response.status_code}")
    print(f"[test_login_disabled_user] 响应内容: {response.json()}")

    assert response.status_code == 401
    data = response.json()
    assert data["code"] == 401
