import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.schemas.payment import RechargePackageCreate, RechargePackageUpdate
from app.schemas.user import UserCreate
from app.services.payment_service import (
    PaymentService, SimulatedPaymentProvider,
    PaymentProviderFactory
)
from app.services.user_service import UserService
from app.models.payment import (
    OrderStatus, PaymentProvider,
    PointTransactionType, RechargePackage
)
from app.models.user import User
from app.core.exceptions import ResourceNotFoundException, BusinessException


# ============ Recharge Package Tests ============

@pytest.mark.asyncio
async def test_create_recharge_package(db_session: AsyncSession):
    """测试创建充值档位"""
    package_in = RechargePackageCreate(
        name="100积分套餐",
        description="基础充值档位",
        original_price=10.0,
        sale_price=9.9,
        base_points=100,
        bonus_points=10,
        bonus_percentage=10,
        is_popular=True,
        sort_order=1,
        is_active=True
    )

    package = await PaymentService.create_recharge_package(db_session, package_in)

    assert package.id is not None
    assert package.name == "100积分套餐"
    assert package.base_points == 100
    assert package.bonus_points == 10
    assert package.is_popular is True
    assert package.is_active is True


@pytest.mark.asyncio
async def test_list_recharge_packages(db_session: AsyncSession):
    """测试获取充值档位列表"""
    # 创建多个档位
    for i in range(3):
        package_in = RechargePackageCreate(
            name=f"套餐{i+1}",
            description=f"测试套餐{i+1}",
            original_price=float(10 + i * 10),
            sale_price=float(9.9 + i * 10),
            base_points=100 + i * 100,
            bonus_points=10 + i * 10,
            sort_order=i,
            is_active=True
        )
        await PaymentService.create_recharge_package(db_session, package_in)

    # 禁用一个
    package_in = RechargePackageCreate(
        name="禁用套餐",
        description="已下架",
        original_price=100.0,
        sale_price=99.0,
        base_points=1000,
        bonus_points=100,
        sort_order=10,
        is_active=False
    )
    await PaymentService.create_recharge_package(db_session, package_in)

    # 获取所有
    all_packages = await PaymentService.list_recharge_packages(db_session)
    assert len(all_packages) == 4

    # 只获取激活的
    active_packages = await PaymentService.list_recharge_packages(db_session, is_active=True)
    assert len(active_packages) == 3


@pytest.mark.asyncio
async def test_update_recharge_package(db_session: AsyncSession):
    """测试更新充值档位"""
    package_in = RechargePackageCreate(
        name="原始名称",
        description="原始描述",
        original_price=10.0,
        sale_price=9.9,
        base_points=100,
        bonus_points=10,
        sort_order=1,
        is_active=True
    )
    package = await PaymentService.create_recharge_package(db_session, package_in)

    # 更新
    update_in = RechargePackageUpdate(name="新名称", sale_price=8.8, bonus_points=20)
    updated = await PaymentService.update_recharge_package(db_session, package.id, update_in)

    assert updated.name == "新名称"
    assert float(updated.sale_price) == 8.8
    assert updated.bonus_points == 20


@pytest.mark.asyncio
async def test_delete_recharge_package(db_session: AsyncSession):
    """测试删除充值档位（软删除）"""
    package_in = RechargePackageCreate(
        name="待删除套餐",
        description="测试",
        original_price=10.0,
        sale_price=9.9,
        base_points=100,
        sort_order=1,
        is_active=True
    )
    package = await PaymentService.create_recharge_package(db_session, package_in)

    result = await PaymentService.delete_recharge_package(db_session, package.id)
    assert result is True

    # 验证已禁用
    updated = await PaymentService.get_recharge_package(db_session, package.id)
    assert updated.is_active is False


# ============ Order Creation Tests ============

@pytest.mark.asyncio
async def test_create_order(db_session: AsyncSession):
    """测试创建订单"""
    # 创建用户
    user_in = UserCreate(
        nickname="payuser1",
        password="test123",
        phone="13900139001",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建充值档位
    package_in = RechargePackageCreate(
        name="100积分套餐",
        description="测试",
        original_price=10.0,
        sale_price=9.9,
        base_points=100,
        bonus_points=20,
        is_active=True
    )
    package = await PaymentService.create_recharge_package(db_session, package_in)

    # 创建订单
    order = await PaymentService.create_order(
        db=db_session,
        user_id=user.id,
        recharge_package_id=package.id,
        payment_provider=PaymentProvider.SIMULATED
    )

    assert order.id is not None
    assert order.user_id == user.id
    assert order.order_no.startswith("ORD")
    assert float(order.pay_amount) == 9.9
    assert order.base_points == 100
    assert order.bonus_points == 20
    assert order.total_points == 120
    assert order.status == OrderStatus.PENDING
    assert order.payment_provider == PaymentProvider.SIMULATED


@pytest.mark.asyncio
async def test_create_order_invalid_package(db_session: AsyncSession):
    """测试使用不存在的充值档位创建订单"""
    # 创建用户
    user_in = UserCreate(
        nickname="payuser2",
        password="test123",
        phone="13900139002",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    with pytest.raises(ResourceNotFoundException):
        await PaymentService.create_order(
            db=db_session,
            user_id=user.id,
            recharge_package_id=uuid.uuid4()
        )


@pytest.mark.asyncio
async def test_create_order_inactive_package(db_session: AsyncSession):
    """测试使用已禁用的充值档位创建订单"""
    user_in = UserCreate(
        nickname="payuser3",
        password="test123",
        phone="13900139003",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    package_in = RechargePackageCreate(
        name="已禁用套餐",
        description="测试",
        original_price=10.0,
        sale_price=9.9,
        base_points=100,
        is_active=False
    )
    package = await PaymentService.create_recharge_package(db_session, package_in)

    with pytest.raises(ResourceNotFoundException):
        await PaymentService.create_order(
            db=db_session,
            user_id=user.id,
            recharge_package_id=package.id
        )


# ============ Simulated Payment Tests ============

@pytest.mark.asyncio
async def test_process_simulated_payment_success(db_session: AsyncSession):
    """测试模拟支付成功"""
    # 创建用户
    user_in = UserCreate(
        nickname="payuser4",
        password="test123",
        phone="13900139004",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)
    initial_balance = user.balance  # 应该是100

    # 创建充值档位
    package_in = RechargePackageCreate(
        name="100积分套餐",
        description="测试",
        original_price=10.0,
        sale_price=9.9,
        base_points=100,
        bonus_points=20,
        is_active=True
    )
    package = await PaymentService.create_recharge_package(db_session, package_in)

    # 创建订单
    order = await PaymentService.create_order(
        db=db_session,
        user_id=user.id,
        recharge_package_id=package.id
    )

    # 执行支付
    result = await PaymentService.process_simulated_payment(db_session, order.id)

    assert result.success is True
    assert result.order_id == order.id
    assert result.total_points == 120
    assert result.is_simulated is True

    # 验证订单状态
    updated_order = await PaymentService.get_order(db_session, order.id)
    assert updated_order.status == OrderStatus.PAID
    assert updated_order.paid_at is not None

    # 验证用户积分已增加
    user_result = await db_session.execute(select(User).where(User.id == user.id))
    user_after = user_result.scalar_one_or_none()
    assert user_after.balance == initial_balance + 100 + 20  # 初始100 + 充值100 + 赠送20


@pytest.mark.asyncio
async def test_process_simulated_payment_idempotent(db_session: AsyncSession):
    """测试模拟支付幂等性（重复支付不重复发放积分）"""
    user_in = UserCreate(
        nickname="payuser5",
        password="test123",
        phone="13900139005",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    package_in = RechargePackageCreate(
        name="100积分套餐",
        description="测试",
        original_price=10.0,
        sale_price=9.9,
        base_points=100,
        bonus_points=20,
        is_active=True
    )
    package = await PaymentService.create_recharge_package(db_session, package_in)

    order = await PaymentService.create_order(
        db=db_session,
        user_id=user.id,
        recharge_package_id=package.id
    )

    # 第一次支付
    result1 = await PaymentService.process_simulated_payment(db_session, order.id)
    assert result1.success is True

    # 第二次支付
    result2 = await PaymentService.process_simulated_payment(db_session, order.id)
    assert result2.success is True

    # 验证积分只增加了一次
    user_result = await db_session.execute(select(User).where(User.id == user.id))
    user_after = user_result.scalar_one_or_none()
    assert user_after.balance == 100 + 100 + 20  # 初始100 + 充值100 + 赠送20


@pytest.mark.asyncio
async def test_process_simulated_payment_wrong_status(db_session: AsyncSession):
    """测试对错误状态的订单执行支付"""
    user_in = UserCreate(
        nickname="payuser6",
        password="test123",
        phone="13900139006",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    package_in = RechargePackageCreate(
        name="100积分套餐",
        description="测试",
        original_price=10.0,
        sale_price=9.9,
        base_points=100,
        is_active=True
    )
    package = await PaymentService.create_recharge_package(db_session, package_in)

    order = await PaymentService.create_order(
        db=db_session,
        user_id=user.id,
        recharge_package_id=package.id
    )

    # 先支付成功
    await PaymentService.process_simulated_payment(db_session, order.id)

    # 手动将订单状态改为失败
    order.status = OrderStatus.FAILED
    await db_session.commit()

    # 再次支付应该失败
    with pytest.raises(BusinessException):
        await PaymentService.process_simulated_payment(db_session, order.id)


# ============ Order Query Tests ============

@pytest.mark.asyncio
async def test_get_user_orders(db_session: AsyncSession):
    """测试获取用户订单列表"""
    user_in = UserCreate(
        nickname="payuser7",
        password="test123",
        phone="13900139007",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    package_in = RechargePackageCreate(
        name="100积分套餐",
        description="测试",
        original_price=10.0,
        sale_price=9.9,
        base_points=100,
        is_active=True
    )
    package = await PaymentService.create_recharge_package(db_session, package_in)

    # 创建3个订单
    order_ids = []
    for _ in range(3):
        order = await PaymentService.create_order(
            db=db_session,
            user_id=user.id,
            recharge_package_id=package.id
        )
        order_ids.append(order.id)

    # 支付其中一个
    await PaymentService.process_simulated_payment(db_session, order_ids[0])

    # 获取所有订单
    orders, total = await PaymentService.get_user_orders(db_session, user.id)
    assert total == 3
    assert len(orders) == 3

    # 只获取已支付的
    paid_orders, paid_total = await PaymentService.get_user_orders(
        db_session, user.id, status=OrderStatus.PAID
    )
    assert paid_total == 1
    assert len(paid_orders) == 1


@pytest.mark.asyncio
async def test_get_nonexistent_order(db_session: AsyncSession):
    """测试获取不存在的订单"""
    order = await PaymentService.get_order(db_session, uuid.uuid4())
    assert order is None


# ============ Payment Callback Tests ============

@pytest.mark.asyncio
async def test_handle_payment_callback_success(db_session: AsyncSession):
    """测试处理支付回调成功"""
    user_in = UserCreate(
        nickname="payuser8",
        password="test123",
        phone="13900139008",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    package_in = RechargePackageCreate(
        name="100积分套餐",
        description="测试",
        original_price=10.0,
        sale_price=9.9,
        base_points=100,
        bonus_points=20,
        is_active=True
    )
    package = await PaymentService.create_recharge_package(db_session, package_in)

    order = await PaymentService.create_order(
        db=db_session,
        user_id=user.id,
        recharge_package_id=package.id
    )

    from app.schemas.payment import OrderPaymentCallback
    callback_data = OrderPaymentCallback(
        order_no=order.order_no,
        third_party_order_no="SIM123456789",
        payment_success=True
    )

    result = await PaymentService.handle_payment_callback(db_session, order.id, callback_data)
    assert result is True

    # 验证订单状态和积分
    updated_order = await PaymentService.get_order(db_session, order.id)
    assert updated_order.status == OrderStatus.PAID
    assert updated_order.third_party_order_no == "SIM123456789"

    user_result = await db_session.execute(select(User).where(User.id == user.id))
    user_after = user_result.scalar_one_or_none()
    assert user_after.balance == 100 + 100 + 20


@pytest.mark.asyncio
async def test_handle_payment_callback_failure(db_session: AsyncSession):
    """测试处理支付回调失败"""
    user_in = UserCreate(
        nickname="payuser9",
        password="test123",
        phone="13900139009",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    package_in = RechargePackageCreate(
        name="100积分套餐",
        description="测试",
        original_price=10.0,
        sale_price=9.9,
        base_points=100,
        is_active=True
    )
    package = await PaymentService.create_recharge_package(db_session, package_in)

    order = await PaymentService.create_order(
        db=db_session,
        user_id=user.id,
        recharge_package_id=package.id
    )

    from app.schemas.payment import OrderPaymentCallback
    callback_data = OrderPaymentCallback(
        order_no=order.order_no,
        third_party_order_no="SIM_FAILED",
        payment_success=False
    )

    result = await PaymentService.handle_payment_callback(db_session, order.id, callback_data)
    assert result is False

    # 验证订单状态为失败
    updated_order = await PaymentService.get_order(db_session, order.id)
    assert updated_order.status == OrderStatus.FAILED

    # 验证积分未增加
    user_result = await db_session.execute(select(User).where(User.id == user.id))
    user_after = user_result.scalar_one_or_none()
    assert user_after.balance == 100  # 保持初始积分


# ============ Order Status Sync Tests ============

@pytest.mark.asyncio
async def test_sync_order_status_pending_simulated(db_session: AsyncSession):
    """测试同步pending状态的模拟支付订单（自动转为paid）"""
    user_in = UserCreate(
        nickname="payuser10",
        password="test123",
        phone="13900139010",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    package_in = RechargePackageCreate(
        name="100积分套餐",
        description="测试",
        original_price=10.0,
        sale_price=9.9,
        base_points=100,
        is_active=True
    )
    package = await PaymentService.create_recharge_package(db_session, package_in)

    order = await PaymentService.create_order(
        db=db_session,
        user_id=user.id,
        recharge_package_id=package.id
    )

    # 同步前是pending
    assert order.status == OrderStatus.PENDING

    # 同步后应该自动转为paid（模拟支付环境）
    new_status = await PaymentService.sync_order_status(db_session, order.id)
    assert new_status == OrderStatus.PAID


# ============ Transaction History Tests ============

@pytest.mark.asyncio
async def test_get_transaction_history(db_session: AsyncSession):
    """测试获取交易历史记录"""
    user_in = UserCreate(
        nickname="payuser11",
        password="test123",
        phone="13900139011",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    package_in = RechargePackageCreate(
        name="100积分套餐",
        description="测试",
        original_price=10.0,
        sale_price=9.9,
        base_points=100,
        bonus_points=20,
        is_active=True
    )
    package = await PaymentService.create_recharge_package(db_session, package_in)

    order = await PaymentService.create_order(
        db=db_session,
        user_id=user.id,
        recharge_package_id=package.id
    )

    # 完成支付（会产生2条流水：基础积分+赠送积分）
    await PaymentService.process_simulated_payment(db_session, order.id)

    # 获取所有交易记录
    transactions, total = await PaymentService.get_transaction_history(
        db_session, user.id, skip=0, limit=10
    )

    # 应该至少有2条：100基础积分 + 20赠送积分
    assert total >= 2
    assert len(transactions) >= 2

    # 按类型筛选
    recharge_txns, recharge_total = await PaymentService.get_transaction_history(
        db_session, user.id, transaction_type=PointTransactionType.RECHARGE, skip=0, limit=10
    )
    assert recharge_total >= 1

    reward_txns, reward_total = await PaymentService.get_transaction_history(
        db_session, user.id, transaction_type=PointTransactionType.REWARD, skip=0, limit=10
    )
    assert reward_total >= 1


# ============ Payment Provider Tests ============

@pytest.mark.asyncio
async def test_simulated_payment_provider(db_session: AsyncSession):
    """测试模拟支付提供商"""
    provider = SimulatedPaymentProvider()

    # 创建支付
    result = await provider.create_payment(None)
    assert result["payment_type"] == "simulated"
    assert result["is_simulated"] is True
    assert result["auto_complete"] is True

    # 验证回调
    callback_data = {"test": "data"}
    success, verified_data = await provider.verify_callback(callback_data)
    assert success is True
    assert verified_data == callback_data

    # 查询订单状态
    success, amount = await provider.query_order_status("test_order_no")
    assert success is True


@pytest.mark.asyncio
async def test_payment_provider_factory(db_session: AsyncSession):
    """测试支付提供商工厂"""
    # 获取模拟支付提供商
    provider = PaymentProviderFactory.get_provider(PaymentProvider.SIMULATED)
    assert isinstance(provider, SimulatedPaymentProvider)


# ============ Edge Case Tests ============

@pytest.mark.asyncio
async def test_process_nonexistent_order(db_session: AsyncSession):
    """测试处理不存在的订单"""
    with pytest.raises(ResourceNotFoundException):
        await PaymentService.process_simulated_payment(db_session, uuid.uuid4())


@pytest.mark.asyncio
async def test_order_no_generation(db_session: AsyncSession):
    """测试订单号生成规则"""
    order_no1 = PaymentService._generate_order_no()
    order_no2 = PaymentService._generate_order_no()

    assert order_no1.startswith("ORD")
    assert order_no2.startswith("ORD")
    assert order_no1 != order_no2  # 确保不重复
