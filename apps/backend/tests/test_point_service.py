import pytest
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
