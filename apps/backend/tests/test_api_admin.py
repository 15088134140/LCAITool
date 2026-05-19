"""
管理员接口API测试用例
覆盖：用户列表查询、用户详情查询、用户禁用启用、用户积分调整等管理功能
"""
import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.schemas.user import UserCreate, RoleCreate
from app.services.user_service import UserService
from app.services.role_service import RoleService
from app.models.user import User, Role, user_roles


# ==================== Fixture 辅助函数 ====================

async def create_test_admin_user(db_session: AsyncSession) -> User:
    """创建管理员测试用户"""
    # 先创建admin角色
    role = await RoleService.get_by_name(db_session, "admin")
    if not role:
        role_in = RoleCreate(name="admin", description="系统管理员")
        role = await RoleService.create(db_session, role_in)

    # 创建用户
    user_in = UserCreate(
        nickname="admin",
        password="admin123",
        phone="13999999999",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 分配admin角色
    user = await UserService.assign_roles(db_session, user.id, [role.id])
    await db_session.refresh(user)
    await db_session.execute(select(user_roles).where(user_roles.c.user_id == user.id))
    return user


async def create_test_regular_user(db_session: AsyncSession, nickname: str = "testuser") -> User:
    """创建普通测试用户"""
    user_in = UserCreate(
        nickname=nickname,
        password="test123",
        phone="13800138100",
        code="8888"
    )
    return await UserService.create(db_session, user_in)


async def get_user_token(client: AsyncClient, nickname: str, password: str) -> str:
    """获取用户访问Token"""
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": nickname,
            "password": password
        }
    )
    return response.json()["access_token"]


# ==================== 管理员用户列表接口测试 ====================

@pytest.mark.asyncio
async def test_admin_get_user_list(client: AsyncClient, db_session: AsyncSession):
    """测试管理员获取用户列表 - GET /api/v1/admin/users"""
    # 创建管理员用户
    admin_user = await create_test_admin_user(db_session)

    # 创建几个测试用户
    for i in range(5):
        user_in = UserCreate(
            nickname=f"user{i}",
            password="test123",
            phone=f"138001380{i:02d}",
            code="8888"
        )
        await UserService.create(db_session, user_in)

    # 获取管理员token
    admin_token = await get_user_token(client, "admin", "admin123")

    # 调用用户列表接口
    response = await client.get(
        "/api/v1/admin/users",
        params={"page": 1, "page_size": 10},
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    print(f"\n[test_admin_get_user_list] 响应状态码: {response.status_code}")
    print(f"[test_admin_get_user_list] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert isinstance(data["items"], list)
    assert data["total"] >= 5  # 5个用户 + 1个管理员
    assert data["page"] == 1
    assert data["page_size"] == 10


@pytest.mark.asyncio
async def test_admin_get_user_list_with_search(client: AsyncClient, db_session: AsyncSession):
    """测试带搜索的用户列表 - GET /api/v1/admin/users?search="""
    # 创建管理员用户
    admin_user = await create_test_admin_user(db_session)

    # 创建测试用户
    for i in range(3):
        user_in = UserCreate(
            nickname=f"searchuser{i}",
            password="test123",
            phone=f"138001381{i:02d}",
            code="8888"
        )
        await UserService.create(db_session, user_in)

    # 获取管理员token
    admin_token = await get_user_token(client, "admin", "admin123")

    # 带搜索参数调用
    response = await client.get(
        "/api/v1/admin/users",
        params={"search": "searchuser", "page": 1, "page_size": 10},
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    print(f"\n[test_admin_get_user_list_with_search] 响应状态码: {response.status_code}")
    print(f"[test_admin_get_user_list_with_search] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    # 应该能搜索到3个用户
    assert data["total"] >= 3


@pytest.mark.asyncio
async def test_admin_get_user_list_with_status_filter(client: AsyncClient, db_session: AsyncSession):
    """测试带状态筛选的用户列表 - GET /api/v1/admin/users?status="""
    # 创建管理员用户
    admin_user = await create_test_admin_user(db_session)

    # 创建正常用户
    user_in = UserCreate(
        nickname="activeuser",
        password="test123",
        phone="13800138200",
        code="8888"
    )
    active_user = await UserService.create(db_session, user_in)

    # 创建并禁用用户
    user_in2 = UserCreate(
        nickname="disableduser",
        password="test123",
        phone="13800138201",
        code="8888"
    )
    disabled_user = await UserService.create(db_session, user_in2)
    await UserService.update_status(db_session, disabled_user.id, status=0)

    # 获取管理员token
    admin_token = await get_user_token(client, "admin", "admin123")

    # 筛选正常用户
    response = await client.get(
        "/api/v1/admin/users",
        params={"status": 1, "page": 1, "page_size": 10},
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    print(f"\n[test_admin_get_user_list_with_status_filter] 正常用户响应: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    # 检查返回的用户都是正常状态
    for user in data["items"]:
        assert user["status"] == 1


@pytest.mark.asyncio
async def test_user_cannot_access_admin_api(client: AsyncClient, db_session: AsyncSession):
    """测试普通用户无法访问管理员接口"""
    # 创建普通用户
    user_in = UserCreate(
        nickname="regularuser",
        password="test123",
        phone="13800138300",
        code="8888"
    )
    await UserService.create(db_session, user_in)

    # 获取普通用户token
    user_token = await get_user_token(client, "regularuser", "test123")

    # 尝试访问管理员接口
    response = await client.get(
        "/api/v1/admin/users",
        params={"page": 1, "page_size": 10},
        headers={"Authorization": f"Bearer {user_token}"}
    )

    print(f"\n[test_user_cannot_access_admin_api] 响应状态码: {response.status_code}")
    print(f"[test_user_cannot_access_admin_api] 响应内容: {response.json()}")

    # 验证返回403权限不足
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_unauthorized_cannot_access_admin_api(client: AsyncClient):
    """测试未登录无法访问管理员接口"""
    # 不带token访问管理员接口
    response = await client.get(
        "/api/v1/admin/users",
        params={"page": 1, "page_size": 10}
    )

    print(f"\n[test_unauthorized_cannot_access_admin_api] 响应状态码: {response.status_code}")
    print(f"[test_unauthorized_cannot_access_admin_api] 响应内容: {response.json()}")

    # 验证返回401未授权
    assert response.status_code == 401


# ==================== 管理员用户详情接口测试 ====================

@pytest.mark.asyncio
async def test_admin_get_user_detail(client: AsyncClient, db_session: AsyncSession):
    """测试管理员获取用户详情 - GET /api/v1/admin/users/{user_id}"""
    # 创建管理员用户
    admin_user = await create_test_admin_user(db_session)

    # 创建测试用户
    user_in = UserCreate(
        nickname="detailuser",
        password="test123",
        phone="13800138400",
        code="8888"
    )
    test_user = await UserService.create(db_session, user_in)

    # 获取管理员token
    admin_token = await get_user_token(client, "admin", "admin123")

    # 调用用户详情接口
    response = await client.get(
        f"/api/v1/admin/users/{test_user.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    print(f"\n[test_admin_get_user_detail] 响应状态码: {response.status_code}")
    print(f"[test_admin_get_user_detail] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_user.id)
    assert data["nickname"] == "detailuser"
    assert "phone" in data
    assert "balance" in data
    assert "status" in data


# ==================== 管理员用户状态管理测试 ====================

@pytest.mark.asyncio
async def test_admin_disable_user(client: AsyncClient, db_session: AsyncSession):
    """测试管理员禁用用户 - PUT /api/v1/admin/users/{user_id}/status"""
    # 创建管理员用户
    admin_user = await create_test_admin_user(db_session)

    # 创建测试用户（初始状态为正常）
    user_in = UserCreate(
        nickname="disabletest",
        password="test123",
        phone="13800138500",
        code="8888"
    )
    test_user = await UserService.create(db_session, user_in)
    assert test_user.status == 1

    # 获取管理员token
    admin_token = await get_user_token(client, "admin", "admin123")

    # 调用禁用接口（status=0）
    response = await client.put(
        f"/api/v1/admin/users/{test_user.id}/status",
        params={"status": 0},
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    print(f"\n[test_admin_disable_user] 响应状态码: {response.status_code}")
    print(f"[test_admin_disable_user] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == 0  # 验证状态已变为禁用


@pytest.mark.asyncio
async def test_admin_enable_user(client: AsyncClient, db_session: AsyncSession):
    """测试管理员启用用户 - PUT /api/v1/admin/users/{user_id}/status"""
    # 创建管理员用户
    admin_user = await create_test_admin_user(db_session)

    # 创建测试用户并禁用
    user_in = UserCreate(
        nickname="enabletest",
        password="test123",
        phone="13800138501",
        code="8888"
    )
    test_user = await UserService.create(db_session, user_in)
    test_user = await UserService.update_status(db_session, test_user.id, status=0)
    await db_session.refresh(test_user)
    assert test_user.status == 0

    # 获取管理员token
    admin_token = await get_user_token(client, "admin", "admin123")

    # 调用启用接口（status=1）
    response = await client.put(
        f"/api/v1/admin/users/{test_user.id}/status",
        params={"status": 1},
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    print(f"\n[test_admin_enable_user] 响应状态码: {response.status_code}")
    print(f"[test_admin_enable_user] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == 1  # 验证状态已变为启用


@pytest.mark.asyncio
async def test_admin_disable_nonexistent_user(client: AsyncClient, db_session: AsyncSession):
    """测试禁用不存在的用户"""
    # 创建管理员用户
    admin_user = await create_test_admin_user(db_session)

    # 获取管理员token
    admin_token = await get_user_token(client, "admin", "admin123")

    # 使用不存在的用户ID调用禁用接口
    nonexistent_id = uuid.uuid4()
    response = await client.put(
        f"/api/v1/admin/users/{nonexistent_id}/status",
        params={"status": 0},
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    print(f"\n[test_admin_disable_nonexistent_user] 响应状态码: {response.status_code}")
    print(f"[test_admin_disable_nonexistent_user] 响应内容: {response.json()}")

    # 验证返回404
    assert response.status_code == 404


# ==================== 管理员积分调整测试 ====================

@pytest.mark.asyncio
async def test_admin_adjust_user_points(client: AsyncClient, db_session: AsyncSession):
    """测试管理员调整用户积分 - POST /api/v1/admin/users/{user_id}/adjust-balance"""
    # 创建管理员用户
    admin_user = await create_test_admin_user(db_session)

    # 创建测试用户
    user_in = UserCreate(
        nickname="pointtest",
        password="test123",
        phone="13800138600",
        code="8888"
    )
    test_user = await UserService.create(db_session, user_in)
    initial_balance = test_user.balance

    # 获取管理员token
    admin_token = await get_user_token(client, "admin", "admin123")

    # 增加积分
    add_amount = 100
    response = await client.post(
        f"/api/v1/admin/users/{test_user.id}/adjust-balance",
        json={"amount": add_amount, "reason": "测试增加积分"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    print(f"\n[test_admin_adjust_user_points] 增加积分响应: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert data["balance"] == initial_balance + add_amount

    # 扣减积分
    deduct_amount = -50
    response = await client.post(
        f"/api/v1/admin/users/{test_user.id}/adjust-balance",
        json={"amount": deduct_amount, "reason": "测试扣减积分"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    print(f"[test_admin_adjust_user_points] 扣减积分响应: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert data["balance"] == initial_balance + add_amount + deduct_amount


@pytest.mark.asyncio
async def test_admin_view_point_history(client: AsyncClient, db_session: AsyncSession):
    """测试管理员查看用户积分流水 - GET /api/v1/admin/users/{user_id}/points/history"""
    # 创建管理员用户
    admin_user = await create_test_admin_user(db_session)

    # 创建测试用户
    user_in = UserCreate(
        nickname="historytest",
        password="test123",
        phone="13800138700",
        code="8888"
    )
    test_user = await UserService.create(db_session, user_in)

    # 获取管理员token
    admin_token = await get_user_token(client, "admin", "admin123")

    # 先调整积分，产生流水记录
    await client.post(
        f"/api/v1/admin/users/{test_user.id}/adjust-balance",
        json={"amount": 100, "reason": "测试积分流水"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    # 调用积分流水接口
    response = await client.get(
        f"/api/v1/admin/users/{test_user.id}/points/history",
        params={"page": 1, "page_size": 10},
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    print(f"\n[test_admin_view_point_history] 响应状态码: {response.status_code}")
    print(f"[test_admin_view_point_history] 响应内容: {response.json()}")

    # 检查接口返回正常
    print(f"[test_admin_view_point_history] 响应: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) >= 1  # 至少有一条流水记录


@pytest.mark.asyncio
async def test_admin_get_verification_list(client: AsyncClient, db_session: AsyncSession):
    """测试获取实名认证申请列表 - GET /api/v1/admin/verifications"""
    # 创建管理员用户
    admin_user = await create_test_admin_user(db_session)

    # 获取管理员token
    admin_token = await get_user_token(client, "admin", "admin123")

    # 调用实名认证申请列表接口
    response = await client.get(
        "/api/v1/admin/verifications",
        params={"page": 1, "page_size": 10},
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    print(f"\n[test_admin_get_verification_list] 响应状态码: {response.status_code}")
    print(f"[test_admin_get_verification_list] 响应内容: {response.json()}")

    # 检查接口返回正常
    print(f"[test_admin_get_verification_list] 响应: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
