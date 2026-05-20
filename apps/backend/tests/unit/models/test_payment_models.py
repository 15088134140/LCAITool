import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.payment import (
    Order, RechargePackage, PointTransaction,
    PaymentProvider, OrderStatus, ReconciliationStatus, PointTransactionType
)
from app.models.user import User


@pytest.mark.asyncio
async def test_create_recharge_package(db_session: AsyncSession):
    """测试创建充值档位"""
    package = RechargePackage(
        name="新手礼包",
        description="新用户专享",
        original_price=29.9,
        sale_price=19.9,
        base_points=200,
        bonus_points=50,
        bonus_percentage=25,
        is_popular=True,
        sort_order=1,
        is_active=True
    )
    db_session.add(package)
    await db_session.commit()
    await db_session.refresh(package)

    assert package.id is not None
    assert package.name == "新手礼包"
    assert float(package.original_price) == 29.9
    assert float(package.sale_price) == 19.9
    assert package.base_points == 200
    assert package.bonus_points == 50
    assert package.is_popular is True
    assert package.created_at is not None


@pytest.mark.asyncio
async def test_recharge_package_default_values(db_session: AsyncSession):
    """测试充值档位默认值"""
    package = RechargePackage(
        name="测试档位",
        original_price=10.0,
        sale_price=10.0,
        base_points=100
    )
    db_session.add(package)
    await db_session.commit()
    await db_session.refresh(package)

    assert package.bonus_points == 0
    assert package.bonus_percentage == 0
    assert package.is_popular is False
    assert package.sort_order == 0
    assert package.is_active is True


@pytest.mark.asyncio
async def test_create_order(db_session: AsyncSession):
    """测试创建订单"""
    # 创建用户
    user = User(
        nickname="testuser",
        phone="13800138000",
        balance=0
    )
    db_session.add(user)
    await db_session.commit()

    # 创建订单
    order = Order(
        user_id=user.id,
        order_no="ORD202405200001",
        pay_amount=19.9,
        base_points=200,
        bonus_points=50,
        total_points=250,
        payment_provider=PaymentProvider.WECHAT,
        status=OrderStatus.PENDING,
        client_ip="192.168.1.1",
        device_info="iPhone 15"
    )
    db_session.add(order)
    await db_session.commit()
    await db_session.refresh(order)

    assert order.id is not None
    assert order.order_no == "ORD202405200001"
    assert float(order.pay_amount) == 19.9
    assert order.total_points == 250
    assert order.payment_provider == PaymentProvider.WECHAT
    assert order.status == OrderStatus.PENDING
    assert order.reconciliation_status == ReconciliationStatus.PENDING


@pytest.mark.asyncio
async def test_order_update_status(db_session: AsyncSession):
    """测试订单状态更新"""
    import time

    user = User(nickname="testuser", phone="13800138001", balance=0)
    db_session.add(user)
    await db_session.commit()

    order = Order(
        user_id=user.id,
        order_no="ORD202405200002",
        pay_amount=9.9,
        base_points=100,
        bonus_points=0,
        total_points=100,
        payment_provider=PaymentProvider.ALIPAY
    )
    db_session.add(order)
    await db_session.commit()

    # 更新为已支付
    order.status = OrderStatus.PAID
    order.paid_at = int(time.time())
    order.third_party_order_no = "ALIPAY20240520001"
    await db_session.commit()
    await db_session.refresh(order)

    assert order.status == OrderStatus.PAID
    assert order.paid_at is not None
    assert order.third_party_order_no == "ALIPAY20240520001"


@pytest.mark.asyncio
async def test_order_user_relationship(db_session: AsyncSession):
    """测试订单和用户的关系"""
    user = User(nickname="testuser", phone="13800138002", balance=0)
    db_session.add(user)
    await db_session.commit()

    order1 = Order(
        user_id=user.id,
        order_no="ORD202405200003",
        pay_amount=9.9,
        base_points=100,
        bonus_points=0,
        total_points=100,
        payment_provider=PaymentProvider.WECHAT
    )
    order2 = Order(
        user_id=user.id,
        order_no="ORD202405200004",
        pay_amount=19.9,
        base_points=200,
        bonus_points=50,
        total_points=250,
        payment_provider=PaymentProvider.WECHAT
    )
    db_session.add_all([order1, order2])
    await db_session.commit()

    await db_session.refresh(user, ["orders"])
    assert len(user.orders) == 2


@pytest.mark.asyncio
async def test_create_point_transaction(db_session: AsyncSession):
    """测试创建积分交易"""
    user = User(nickname="testuser", phone="13800138003", balance=100)
    db_session.add(user)
    await db_session.commit()

    transaction = PointTransaction(
        user_id=user.id,
        amount=50,
        type=PointTransactionType.RECHARGE,
        reason="充值",
        related_id="ORD202405200005",
        related_type="order",
        idempotency_key="idempotent_001",
        balance_before=100,
        balance_after=150,
        operator="system",
        remark="测试充值"
    )
    db_session.add(transaction)
    await db_session.commit()
    await db_session.refresh(transaction)

    assert transaction.id is not None
    assert transaction.amount == 50
    assert transaction.type == PointTransactionType.RECHARGE
    assert transaction.idempotency_key == "idempotent_001"
    assert transaction.balance_before == 100
    assert transaction.balance_after == 150


@pytest.mark.asyncio
async def test_point_transaction_consume(db_session: AsyncSession):
    """测试消费积分交易"""
    user = User(nickname="testuser", phone="13800138004", balance=100)
    db_session.add(user)
    await db_session.commit()

    transaction = PointTransaction(
        user_id=user.id,
        amount=-30,
        type=PointTransactionType.CONSUME,
        reason="使用工具",
        related_id=str(uuid.uuid4()),
        related_type="task",
        balance_before=100,
        balance_after=70,
        operator="system"
    )
    db_session.add(transaction)
    await db_session.commit()
    await db_session.refresh(transaction)

    assert transaction.amount == -30
    assert transaction.type == PointTransactionType.CONSUME
    assert transaction.balance_after == 70


@pytest.mark.asyncio
async def test_point_transaction_user_relationship(db_session: AsyncSession):
    """测试积分交易和用户的关系"""
    user = User(nickname="testuser", phone="13800138005", balance=100)
    db_session.add(user)
    await db_session.commit()

    tx1 = PointTransaction(
        user_id=user.id,
        amount=50,
        type=PointTransactionType.RECHARGE,
        balance_before=100,
        balance_after=150
    )
    tx2 = PointTransaction(
        user_id=user.id,
        amount=-20,
        type=PointTransactionType.CONSUME,
        balance_before=150,
        balance_after=130
    )
    db_session.add_all([tx1, tx2])
    await db_session.commit()

    await db_session.refresh(user, ["transactions"])
    assert len(user.transactions) == 2


@pytest.mark.asyncio
async def test_point_transaction_order_relationship(db_session: AsyncSession):
    """测试积分交易和订单的关系"""
    user = User(nickname="testuser", phone="13800138006", balance=0)
    db_session.add(user)
    await db_session.commit()

    order = Order(
        user_id=user.id,
        order_no="ORD202405200006",
        pay_amount=19.9,
        base_points=200,
        bonus_points=50,
        total_points=250,
        payment_provider=PaymentProvider.WECHAT
    )
    db_session.add(order)
    await db_session.commit()

    transaction = PointTransaction(
        user_id=user.id,
        order_id=order.id,
        amount=250,
        type=PointTransactionType.RECHARGE,
        reason="充值",
        balance_before=0,
        balance_after=250
    )
    db_session.add(transaction)
    await db_session.commit()

    await db_session.refresh(order, ["transactions"])
    assert len(order.transactions) == 1
    assert order.transactions[0].id == transaction.id


@pytest.mark.asyncio
async def test_unique_constraint_order_no(db_session: AsyncSession):
    """测试订单号唯一约束"""
    user = User(nickname="testuser", phone="13800138007", balance=0)
    db_session.add(user)
    await db_session.commit()

    # 第一个订单
    order1 = Order(
        user_id=user.id,
        order_no="ORD202405200008",
        pay_amount=9.9,
        base_points=100,
        bonus_points=0,
        total_points=100,
        payment_provider=PaymentProvider.WECHAT
    )
    db_session.add(order1)
    await db_session.commit()

    # 第二个订单使用相同的订单号应该失败
    from sqlalchemy.exc import IntegrityError

    order2 = Order(
        user_id=user.id,
        order_no="ORD202405200008",  # 相同的订单号
        pay_amount=19.9,
        base_points=200,
        bonus_points=0,
        total_points=200,
        payment_provider=PaymentProvider.WECHAT
    )
    db_session.add(order2)

    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_unique_constraint_idempotency_key(db_session: AsyncSession):
    """测试幂等键唯一约束"""
    user = User(nickname="testuser", phone="13800138008", balance=100)
    db_session.add(user)
    await db_session.commit()

    # 第一个交易
    tx1 = PointTransaction(
        user_id=user.id,
        amount=50,
        type=PointTransactionType.RECHARGE,
        idempotency_key="unique_key_001",
        balance_before=100,
        balance_after=150
    )
    db_session.add(tx1)
    await db_session.commit()

    # 第二个交易使用相同的幂等键应该失败
    from sqlalchemy.exc import IntegrityError

    tx2 = PointTransaction(
        user_id=user.id,
        amount=50,
        type=PointTransactionType.RECHARGE,
        idempotency_key="unique_key_001",  # 相同的幂等键
        balance_before=150,
        balance_after=200
    )
    db_session.add(tx2)

    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_query_active_recharge_packages(db_session: AsyncSession):
    """测试查询启用的充值档位"""
    package1 = RechargePackage(
        name="档位1", original_price=10, sale_price=10,
        base_points=100, is_active=True, sort_order=2
    )
    package2 = RechargePackage(
        name="档位2", original_price=20, sale_price=20,
        base_points=200, is_active=True, sort_order=1
    )
    package3 = RechargePackage(
        name="档位3", original_price=30, sale_price=30,
        base_points=300, is_active=False, sort_order=3
    )
    db_session.add_all([package1, package2, package3])
    await db_session.commit()

    # 查询启用的档位，按排序顺序
    result = await db_session.execute(
        select(RechargePackage)
        .where(RechargePackage.is_active == True)
        .order_by(RechargePackage.sort_order)
    )
    packages = result.scalars().all()

    assert len(packages) == 2
    assert packages[0].name == "档位2"  # sort_order 1
    assert packages[1].name == "档位1"  # sort_order 2


@pytest.mark.asyncio
async def test_query_user_orders_by_status(db_session: AsyncSession):
    """测试按状态查询用户订单"""
    user = User(nickname="testuser", phone="13800138009", balance=0)
    db_session.add(user)
    await db_session.commit()

    order1 = Order(
        user_id=user.id, order_no="ORD1", pay_amount=10,
        base_points=100, bonus_points=0, total_points=100,
        payment_provider=PaymentProvider.WECHAT, status=OrderStatus.PAID
    )
    order2 = Order(
        user_id=user.id, order_no="ORD2", pay_amount=20,
        base_points=200, bonus_points=0, total_points=200,
        payment_provider=PaymentProvider.WECHAT, status=OrderStatus.PENDING
    )
    order3 = Order(
        user_id=user.id, order_no="ORD3", pay_amount=30,
        base_points=300, bonus_points=0, total_points=300,
        payment_provider=PaymentProvider.WECHAT, status=OrderStatus.PAID
    )
    db_session.add_all([order1, order2, order3])
    await db_session.commit()

    # 查询已支付的订单
    result = await db_session.execute(
        select(Order)
        .where(Order.user_id == user.id)
        .where(Order.status == OrderStatus.PAID)
    )
    paid_orders = result.scalars().all()

    assert len(paid_orders) == 2
    order_nos = {o.order_no for o in paid_orders}
    assert order_nos == {"ORD1", "ORD3"}


@pytest.mark.asyncio
async def test_freeze_unfreeze_transactions(db_session: AsyncSession):
    """测试冻结和解冻交易"""
    user = User(nickname="testuser", phone="13800138010", balance=200, frozen_balance=0)
    db_session.add(user)
    await db_session.commit()

    # 冻结积分
    freeze_tx = PointTransaction(
        user_id=user.id,
        amount=-50,
        type=PointTransactionType.FREEZE,
        reason="任务预冻结",
        balance_before=200,
        balance_after=150
    )
    db_session.add(freeze_tx)
    await db_session.commit()

    # 解冻积分
    unfreeze_tx = PointTransaction(
        user_id=user.id,
        amount=50,
        type=PointTransactionType.UNFREEZE,
        reason="任务取消解冻",
        balance_before=150,
        balance_after=200
    )
    db_session.add(unfreeze_tx)
    await db_session.commit()

    # 查询交易记录
    result = await db_session.execute(
        select(PointTransaction).where(PointTransaction.user_id == user.id)
    )
    transactions = result.scalars().all()

    assert len(transactions) == 2
    types = {t.type for t in transactions}
    assert types == {PointTransactionType.FREEZE, PointTransactionType.UNFREEZE}
