"""
积分接口API测试用例
覆盖：积分余额查询、流水查询、充值、消费、冻结结算等场景
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.user import UserCreate
from app.services.user_service import UserService
from app.services.point_service import PointService


# ==================== Fixture ====================

def _create_user_data(index: int) -> dict:
    """生成不同的测试用户数据"""
    return {
        "nickname": f"pointuser{index}",
        "password": "test123",
        "phone": f"1380000{index:04d}",
        "code": "8888"
    }


@pytest.fixture
async def auth_headers(client: AsyncClient, db_session: AsyncSession):
    """获取已登录用户的认证headers"""
    # 创建测试用户
    user_data = _create_user_data(0)
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
async def user_with_initial_points(client: AsyncClient, db_session: AsyncSession):
    """创建用户并返回认证headers和用户ID，附带初始积分"""
    user_data = _create_user_data(1)
    user_in = UserCreate(**user_data)
    user = await UserService.create(db_session, user_in)

    # 登录获取token
    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": user_data["nickname"],
            "password": user_data["password"]
        }
    )
    token = login_response.json()["access_token"]

    return {
        "headers": {"Authorization": f"Bearer {token}"},
        "user_id": str(user.id)
    }


# ==================== 积分查询接口测试 ====================

@pytest.mark.asyncio
async def test_get_point_balance(client: AsyncClient, auth_headers: dict):
    """测试获取积分余额 - GET /api/v1/points/balance"""
    response = await client.get(
        "/api/v1/points/balance",
        headers=auth_headers
    )

    print(f"\n[test_get_point_balance] 响应状态码: {response.status_code}")
    print(f"[test_get_point_balance] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert "balance" in data
    assert "frozen_balance" in data
    assert isinstance(data["balance"], int)
    assert isinstance(data["frozen_balance"], int)
    # 新用户赠送100积分
    assert data["balance"] == 100


@pytest.mark.asyncio
async def test_get_point_balance_unauthorized(client: AsyncClient):
    """测试未登录查询余额 - GET /api/v1/points/balance"""
    response = await client.get("/api/v1/points/balance")

    print(f"\n[test_get_point_balance_unauthorized] 响应状态码: {response.status_code}")
    print(f"[test_get_point_balance_unauthorized] 响应内容: {response.json()}")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_point_history(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """测试获取积分流水列表 - GET /api/v1/points/history"""
    # 先创建几笔交易
    user_data = _create_user_data(0)
    user = await UserService.get_by_username(db_session, user_data["nickname"])

    for i in range(5):
        await PointService.create_transaction(
            db=db_session,
            user_id=user.id,
            amount=(i + 1) * 10,
            transaction_type="test",
            reason=f"测试交易{i}"
        )

    # 查询流水
    response = await client.get(
        "/api/v1/points/history?page=1&page_size=10",
        headers=auth_headers
    )

    print(f"\n[test_get_point_history] 响应状态码: {response.status_code}")
    print(f"[test_get_point_history] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert data["total"] >= 5
    assert len(data["items"]) <= 10
    # 验证交易记录字段
    if data["items"]:
        item = data["items"][0]
        assert "id" in item
        assert "amount" in item
        assert "type" in item
        assert "created_at" in item


@pytest.mark.asyncio
async def test_get_point_history_with_filters(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """测试带筛选条件的流水查询 - GET /api/v1/points/history"""
    user_data = _create_user_data(0)
    user = await UserService.get_by_username(db_session, user_data["nickname"])

    # 创建不同类型的交易
    await PointService.create_transaction(
        db=db_session,
        user_id=user.id,
        amount=100,
        transaction_type="recharge",
        reason="充值测试"
    )
    await PointService.create_transaction(
        db=db_session,
        user_id=user.id,
        amount=-50,
        transaction_type="consume",
        reason="消费测试"
    )

    # 按类型筛选
    response = await client.get(
        "/api/v1/points/history?type=recharge",
        headers=auth_headers
    )

    print(f"\n[test_get_point_history_with_filters] 响应状态码: {response.status_code}")
    print(f"[test_get_point_history_with_filters] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    # 验证筛选结果
    for item in data["items"]:
        assert item["type"] == "recharge"


# ==================== 积分充值接口测试 ====================

@pytest.mark.asyncio
async def test_point_recharge(client: AsyncClient, auth_headers: dict):
    """测试积分充值 - POST /api/v1/points/recharge"""
    # 先获取初始余额
    balance_response = await client.get(
        "/api/v1/points/balance",
        headers=auth_headers
    )
    initial_balance = balance_response.json()["balance"]

    # 充值50积分
    recharge_amount = 50
    response = await client.post(
        f"/api/v1/points/recharge?amount={recharge_amount}&payment_method=wechat",
        headers=auth_headers
    )

    print(f"\n[test_point_recharge] 响应状态码: {response.status_code}")
    print(f"[test_point_recharge] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert data["recharge_amount"] == recharge_amount
    assert data["balance"] == initial_balance + recharge_amount
    assert "充值成功" in data["message"]


@pytest.mark.asyncio
async def test_recharge_negative_amount(client: AsyncClient, auth_headers: dict):
    """测试充值负数金额 - POST /api/v1/points/recharge"""
    response = await client.post(
        "/api/v1/points/recharge?amount=-100&payment_method=wechat",
        headers=auth_headers
    )

    print(f"\n[test_recharge_negative_amount] 响应状态码: {response.status_code}")
    print(f"[test_recharge_negative_amount] 响应内容: {response.json()}")

    # FastAPI参数校验失败返回422
    assert response.status_code in [400, 422]


@pytest.mark.asyncio
async def test_recharge_zero_amount(client: AsyncClient, auth_headers: dict):
    """测试充值0元 - POST /api/v1/points/recharge"""
    response = await client.post(
        "/api/v1/points/recharge?amount=0&payment_method=wechat",
        headers=auth_headers
    )

    print(f"\n[test_recharge_zero_amount] 响应状态码: {response.status_code}")
    print(f"[test_recharge_zero_amount] 响应内容: {response.json()}")

    # FastAPI参数校验失败返回422
    assert response.status_code in [400, 422]


# ==================== 积分消费接口测试 ====================

@pytest.mark.asyncio
async def test_point_consume(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """测试积分消费 - POST /api/v1/points/consume"""
    # 先充值确保有足够余额
    await client.post(
        "/api/v1/points/recharge?amount=200&payment_method=wechat",
        headers=auth_headers
    )

    # 获取充值后的余额
    balance_response = await client.get(
        "/api/v1/points/balance",
        headers=auth_headers
    )
    balance_before = balance_response.json()["balance"]

    # 消费50积分
    consume_amount = 50
    response = await client.post(
        f"/api/v1/points/consume?amount={consume_amount}&reason=工具使用",
        headers=auth_headers
    )

    print(f"\n[test_point_consume] 响应状态码: {response.status_code}")
    print(f"[test_point_consume] 响应内容: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert data["consumed_amount"] == consume_amount
    assert data["balance"] == balance_before - consume_amount
    assert "消费成功" in data["message"]


@pytest.mark.asyncio
async def test_consume_insufficient_balance(client: AsyncClient, auth_headers: dict):
    """测试余额不足消费 - POST /api/v1/points/consume"""
    # 尝试消费超过余额的金额
    response = await client.post(
        "/api/v1/points/consume?amount=10000&reason=大额消费",
        headers=auth_headers
    )

    print(f"\n[test_consume_insufficient_balance] 响应状态码: {response.status_code}")
    print(f"[test_consume_insufficient_balance] 响应内容: {response.json()}")

    assert response.status_code == 400
    data = response.json()
    assert "余额不足" in data.get("message", "") or "余额不足" in data.get("detail", "")


# ==================== 积分冻结结算接口测试 ====================

@pytest.mark.asyncio
async def test_point_freeze_and_settle(client: AsyncClient, user_with_initial_points: dict):
    """测试积分冻结与结算流程"""
    headers = user_with_initial_points["headers"]

    # 1. 获取初始状态
    balance_response = await client.get(
        "/api/v1/points/balance",
        headers=headers
    )
    initial_data = balance_response.json()
    print(f"\n[test_point_freeze_and_settle] 初始状态: balance={initial_data['balance']}, frozen={initial_data['frozen_balance']}")

    # 2. 冻结30积分
    freeze_amount = 30
    freeze_response = await client.post(
        f"/api/v1/points/freeze?amount={freeze_amount}&reason=任务预扣款&related_id=task_001",
        headers=headers
    )
    print(f"[test_point_freeze_and_settle] 冻结响应: {freeze_response.json()}")

    assert freeze_response.status_code == 200
    freeze_data = freeze_response.json()
    assert freeze_data["balance"] == initial_data["balance"] - freeze_amount
    assert freeze_data["frozen_balance"] == freeze_amount

    # 3. 结算20积分（实际消费）
    settle_amount = 20
    settle_response = await client.post(
        f"/api/v1/points/settle?amount={settle_amount}&reason=任务结算&related_id=task_001",
        headers=headers
    )
    print(f"[test_point_freeze_and_settle] 结算响应: {settle_response.json()}")

    assert settle_response.status_code == 200
    settle_data = settle_response.json()
    assert settle_data["frozen_balance"] == freeze_amount - settle_amount
    assert settle_data["balance"] == freeze_data["balance"]  # balance不变，从frozen_balance中扣除

    # 4. 解冻剩余10积分
    unfreeze_amount = 10
    unfreeze_response = await client.post(
        f"/api/v1/points/unfreeze?amount={unfreeze_amount}&reason=任务取消&related_id=task_001",
        headers=headers
    )
    print(f"[test_point_freeze_and_settle] 解冻响应: {unfreeze_response.json()}")

    assert unfreeze_response.status_code == 200
    unfreeze_data = unfreeze_response.json()
    assert unfreeze_data["frozen_balance"] == 0
    assert unfreeze_data["balance"] == settle_data["balance"] + unfreeze_amount

    # 验证最终状态：100 - 20(实际消耗) = 80
    assert unfreeze_data["balance"] == initial_data["balance"] - settle_amount
