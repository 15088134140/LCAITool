import pytest
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.user import UserCreate, PointTransactionCreate
from app.services.user_service import UserService
from app.services.point_service import PointService


@pytest.mark.asyncio
async def test_create_point_transaction(db_session: AsyncSession):
    user_in = UserCreate(
        nickname="testpoint",
        password="testpassword123",
        phone="13800138200",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    transaction_in = PointTransactionCreate(
        user_id=user.id,
        amount=100,
        type="recharge",
        reason="测试充值"
    )
    transaction = await PointService.create(db_session, transaction_in)

    assert transaction.user_id == user.id
    assert transaction.amount == 100
    assert transaction.type == "recharge"
    assert transaction.reason == "测试充值"


@pytest.mark.asyncio
async def test_create_transaction_helper(db_session: AsyncSession):
    user_in = UserCreate(
        nickname="testpoint2",
        password="testpassword123",
        phone="13800138201",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    transaction = await PointService.create_transaction(
        db=db_session,
        user_id=user.id,
        amount=50,
        transaction_type="reward",
        reason="测试奖励"
    )

    assert transaction.user_id == user.id
    assert transaction.amount == 50
    assert transaction.type == "reward"


@pytest.mark.asyncio
async def test_get_user_transactions(db_session: AsyncSession):
    user_in = UserCreate(
        nickname="testpoint3",
        password="testpassword123",
        phone="13800138202",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建几笔交易
    for i in range(3):
        await PointService.create_transaction(
            db=db_session,
            user_id=user.id,
            amount=(i + 1) * 10,
            transaction_type="reward",
            reason=f"奖励{i}"
        )

    transactions, total = await PointService.get_by_user_id(
        db_session, user.id, skip=0, limit=10
    )

    assert total == 3
    assert len(transactions) == 3


@pytest.mark.asyncio
async def test_get_transaction_pagination(db_session: AsyncSession):
    user_in = UserCreate(
        nickname="testpoint4",
        password="testpassword123",
        phone="13800138203",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建15笔交易
    for i in range(15):
        await PointService.create_transaction(
            db=db_session,
            user_id=user.id,
            amount=i + 1,
            transaction_type="test",
            reason=f"交易{i}"
        )

    # 第一页
    transactions, total = await PointService.get_by_user_id(
        db_session, user.id, skip=0, limit=10
    )
    assert total == 15
    assert len(transactions) == 10

    # 第二页
    transactions2, total2 = await PointService.get_by_user_id(
        db_session, user.id, skip=10, limit=10
    )
    assert total2 == 15
    assert len(transactions2) == 5


@pytest.mark.asyncio
async def test_point_freeze_and_settle(db_session: AsyncSession):
    """测试积分预冻结与结算流程"""
    from app.core.exceptions import InsufficientBalanceException

    user_in = UserCreate(
        nickname="testfreeze",
        password="testpassword123",
        phone="13800138210",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 初始状态：balance=100, frozen_balance=0
    assert user.balance == 100
    assert user.frozen_balance == 0

    # 冻结30积分
    user = await PointService.freeze_points(
        db=db_session,
        user_id=user.id,
        amount=30,
        reason="任务预冻结",
        related_id="task_001"
    )

    assert user.balance == 70  # 100 - 30
    assert user.frozen_balance == 30
    assert user.version == 1  # 版本号递增

    # 结算20积分（实际消费）
    user = await PointService.settle_frozen_points(
        db=db_session,
        user_id=user.id,
        amount=20,
        reason="任务结算",
        related_id="task_001"
    )

    assert user.balance == 70  # 保持不变
    assert user.frozen_balance == 10  # 30 - 20
    assert user.version == 2  # 版本号递增

    # 解冻剩余10积分
    user = await PointService.unfreeze_points(
        db=db_session,
        user_id=user.id,
        amount=10,
        reason="任务取消，解冻积分",
        related_id="task_001"
    )

    assert user.balance == 80  # 70 + 10
    assert user.frozen_balance == 0
    assert user.version == 3  # 版本号递增

    # 测试冻结超过余额的积分
    with pytest.raises(InsufficientBalanceException):
        await PointService.freeze_points(
            db=db_session,
            user_id=user.id,
            amount=1000,  # 超过余额
            reason="测试超额冻结",
            related_id="task_002"
        )


@pytest.mark.asyncio
async def test_optimistic_lock_mechanism(db_session: AsyncSession):
    """测试乐观锁机制 - 验证版本不匹配时操作失败"""
    from sqlalchemy import select, update, text
    from app.models.user import User

    user_in = UserCreate(
        nickname="testoptimistic",
        password="testpassword123",
        phone="13800138211",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)
    user_id = user.id
    initial_version = user.version

    # 模拟另一个进程在数据库中更新了版本号
    await db_session.execute(
        text(f"UPDATE users SET version = version + 1 WHERE id = '{user_id}'")
    )
    await db_session.commit()

    # 现在我们直接测试：当WHERE条件中的version不匹配时，rowcount为0
    stmt = (
        update(User)
        .where(User.id == user_id, User.version == initial_version)
        .values(
            balance=User.balance - 10,
            frozen_balance=User.frozen_balance + 10,
            version=User.version + 1
        )
        .execution_options(synchronize_session=False)
    )
    result = await db_session.execute(stmt)
    await db_session.commit()

    # rowcount应该为0，因为数据库中的version已经增加了1
    assert result.rowcount == 0


@pytest.mark.asyncio
async def test_unfreeze_insufficient_frozen_balance(db_session: AsyncSession):
    """测试解冻超过冻结余额的情况"""
    from app.core.exceptions import InsufficientBalanceException

    user_in = UserCreate(
        nickname="testunfreeze",
        password="testpassword123",
        phone="13800138212",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 先冻结20积分
    user = await PointService.freeze_points(
        db=db_session,
        user_id=user.id,
        amount=20,
        reason="测试冻结"
    )

    # 尝试解冻30积分（超过冻结余额）
    with pytest.raises(InsufficientBalanceException):
        await PointService.unfreeze_points(
            db=db_session,
            user_id=user.id,
            amount=30,
            reason="测试超额解冻"
        )


@pytest.mark.asyncio
async def test_settle_insufficient_frozen_balance(db_session: AsyncSession):
    """测试结算超过冻结余额的情况"""
    from app.core.exceptions import InsufficientBalanceException

    user_in = UserCreate(
        nickname="testsettle",
        password="testpassword123",
        phone="13800138213",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 先冻结20积分
    user = await PointService.freeze_points(
        db=db_session,
        user_id=user.id,
        amount=20,
        reason="测试冻结"
    )

    # 尝试结算30积分（超过冻结余额）
    with pytest.raises(InsufficientBalanceException):
        await PointService.settle_frozen_points(
            db=db_session,
            user_id=user.id,
            amount=30,
            reason="测试超额结算"
        )
