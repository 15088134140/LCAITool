import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserIdVerifyRequest
from app.services.user_service import UserService


@pytest.mark.asyncio
async def test_create_user(db_session: AsyncSession):
    user_in = UserCreate(
        nickname="testuser",
        password="testpassword123",
        phone="13800138100",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    assert user.nickname == "testuser"
    assert user.phone == "13800138100"
    assert user.balance == 100  # 赠送新人积分
    assert user.status == 1
    assert user.password_hash is not None
    assert user.password_hash != "testpassword123"  # 密码应该被哈希


@pytest.mark.asyncio
async def test_get_user_by_id(db_session: AsyncSession):
    user_in = UserCreate(
        nickname="testgetuser",
        password="testpassword123",
        phone="13800138101",
        code="8888"
    )
    created_user = await UserService.create(db_session, user_in)

    fetched_user = await UserService.get_by_id(db_session, created_user.id)
    assert fetched_user is not None
    assert fetched_user.id == created_user.id
    assert fetched_user.nickname == "testgetuser"


@pytest.mark.asyncio
async def test_get_user_by_username(db_session: AsyncSession):
    user_in = UserCreate(
        nickname="testusername",
        password="testpassword123",
        phone="13800138102",
        code="8888"
    )
    await UserService.create(db_session, user_in)

    fetched_user = await UserService.get_by_username(db_session, "testusername")
    assert fetched_user is not None
    assert fetched_user.nickname == "testusername"


@pytest.mark.asyncio
async def test_get_user_by_email(db_session: AsyncSession):
    # 注意：当前UserCreate不包含email字段，需要创建后更新
    user_in = UserCreate(
        nickname="testemail",
        password="testpassword123",
        phone="13800138103",
        code="8888"
    )
    created_user = await UserService.create(db_session, user_in)

    # 更新email
    update_in = UserUpdate(email="email@example.com")
    await UserService.update(db_session, created_user.id, update_in)

    fetched_user = await UserService.get_by_email(db_session, "email@example.com")
    assert fetched_user is not None
    assert fetched_user.email == "email@example.com"


@pytest.mark.asyncio
async def test_update_user(db_session: AsyncSession):
    user_in = UserCreate(
        nickname="testupdate",
        password="testpassword123",
        phone="13800138104",
        code="8888"
    )
    created_user = await UserService.create(db_session, user_in)

    update_in = UserUpdate(
        nickname="newnickname",
        email="newemail@example.com"
    )
    updated_user = await UserService.update(db_session, created_user.id, update_in)

    assert updated_user.nickname == "newnickname"
    assert updated_user.email == "newemail@example.com"


@pytest.mark.asyncio
async def test_get_balance(db_session: AsyncSession):
    user_in = UserCreate(
        nickname="testbalance",
        password="testpassword123",
        phone="13800138105",
        code="8888"
    )
    created_user = await UserService.create(db_session, user_in)

    balance = await UserService.get_balance(db_session, created_user.id)
    assert balance == 100  # 新用户赠送100积分


@pytest.mark.asyncio
async def test_adjust_balance(db_session: AsyncSession):
    user_in = UserCreate(
        nickname="testadjust",
        password="testpassword123",
        phone="13800138106",
        code="8888"
    )
    created_user = await UserService.create(db_session, user_in)

    user = await UserService.adjust_balance(
        db=db_session,
        user_id=created_user.id,
        amount=100,
        reason="测试充值"
    )
    assert user.balance == 200  # 初始100 + 充值100

    user = await UserService.adjust_balance(
        db=db_session,
        user_id=created_user.id,
        amount=-50,
        reason="测试消费"
    )
    assert user.balance == 150


@pytest.mark.asyncio
async def test_verify_id_card(db_session: AsyncSession):
    user_in = UserCreate(
        nickname="testverify",
        password="testpassword123",
        phone="13800138107",
        code="8888"
    )
    created_user = await UserService.create(db_session, user_in)

    verify_in = UserIdVerifyRequest(
        real_name="张三",
        id_card_number="110101199001011234"
    )
    verified_user = await UserService.verify_id_card(db_session, created_user.id, verify_in)

    assert verified_user.id_card_verified is True
    assert verified_user.id_card_name == "张三"
    assert verified_user.id_card_number_encrypted is not None
    assert verified_user.balance == 150  # 初始100 + 实名认证奖励50


@pytest.mark.asyncio
async def test_get_users_multi(db_session: AsyncSession):
    for i in range(5):
        user_in = UserCreate(
            nickname=f"user{i}",
            password="testpassword123",
            phone=f"1380013811{i}",
            code="8888"
        )
        await UserService.create(db_session, user_in)

    users, total = await UserService.get_multi(db_session, skip=0, limit=10)
    assert total >= 5
    assert len(users) >= 5


@pytest.mark.asyncio
async def test_user_not_found(db_session: AsyncSession):
    from app.core.exceptions import UserNotFoundException

    non_existent_id = uuid.uuid4()
    # get_by_id returns None, get_balance raises exception if user not found
    with pytest.raises(UserNotFoundException):
        await UserService.get_balance(db_session, non_existent_id)


@pytest.mark.asyncio
async def test_user_already_exists(db_session: AsyncSession):
    from app.core.exceptions import UserAlreadyExistsException

    user_in = UserCreate(
        nickname="duplicate",
        password="testpassword123",
        phone="13800138199",
        code="8888"
    )
    await UserService.create(db_session, user_in)

    with pytest.raises(UserAlreadyExistsException):
        await UserService.create(db_session, user_in)


@pytest.mark.asyncio
async def test_update_status(db_session: AsyncSession):
    user_in = UserCreate(
        nickname="teststatus",
        password="testpassword123",
        phone="13800138120",
        code="8888"
    )
    created_user = await UserService.create(db_session, user_in)

    # 禁用用户
    updated_user = await UserService.update_status(db_session, created_user.id, status=0)
    assert updated_user.status == 0

    # 重新启用
    updated_user = await UserService.update_status(db_session, created_user.id, status=1)
    assert updated_user.status == 1


@pytest.mark.asyncio
async def test_get_id_verify_info(db_session: AsyncSession):
    user_in = UserCreate(
        nickname="testverifyinfo",
        password="testpassword123",
        phone="13800138121",
        code="8888"
    )
    created_user = await UserService.create(db_session, user_in)

    # 未认证时
    info = await UserService.get_id_verify_info(db_session, created_user.id)
    assert info["id_card_verified"] is False
    assert info["real_name"] is None
    assert info["id_card_number"] is None

    # 认证后
    verify_in = UserIdVerifyRequest(
        real_name="张三",
        id_card_number="110101199001011234"
    )
    await UserService.verify_id_card(db_session, created_user.id, verify_in)

    info = await UserService.get_id_verify_info(db_session, created_user.id)
    assert info["id_card_verified"] is True
    assert info["real_name"] == "张三"
    assert info["id_card_number"] is not None
    assert "**********" in info["id_card_number"]  # 脱敏后的身份证号


@pytest.mark.asyncio
async def test_delete_user(db_session: AsyncSession):
    user_in = UserCreate(
        nickname="testdelete",
        password="testpassword123",
        phone="13800138122",
        code="8888"
    )
    created_user = await UserService.create(db_session, user_in)

    # 删除用户
    await UserService.delete(db_session, created_user.id)

    # 验证用户已不存在
    user = await UserService.get_by_id(db_session, created_user.id)
    assert user is None


@pytest.mark.asyncio
async def test_invalid_verification_code(db_session: AsyncSession):
    from app.core.exceptions import InvalidVerificationCodeException

    user_in = UserCreate(
        nickname="testcode",
        password="testpassword123",
        phone="13800138123",
        code="1234"  # 错误的验证码
    )
    with pytest.raises(InvalidVerificationCodeException):
        await UserService.create(db_session, user_in)


@pytest.mark.asyncio
async def test_get_by_phone(db_session: AsyncSession):
    user_in = UserCreate(
        nickname="testphone",
        password="testpassword123",
        phone="13800138124",
        code="8888"
    )
    created_user = await UserService.create(db_session, user_in)

    fetched_user = await UserService.get_by_phone(db_session, "13800138124")
    assert fetched_user is not None
    assert fetched_user.id == created_user.id
    assert fetched_user.nickname == "testphone"


@pytest.mark.asyncio
async def test_get_users_with_search(db_session: AsyncSession):
    # 创建几个用户
    for i in range(3):
        user_in = UserCreate(
            nickname=f"searchuser{i}",
            password="testpassword123",
            phone=f"1380013813{i}",
            code="8888"
        )
        await UserService.create(db_session, user_in)

    # 搜索特定用户
    users, total = await UserService.get_multi(db_session, skip=0, limit=10, search="searchuser1")
    assert total >= 1
    assert len(users) >= 1
    assert any(user.nickname == "searchuser1" for user in users)


@pytest.mark.asyncio
async def test_get_users_with_status_filter(db_session: AsyncSession):
    # 创建两个用户
    user1_in = UserCreate(
        nickname="statususer1",
        password="testpassword123",
        phone="13800138140",
        code="8888"
    )
    user1 = await UserService.create(db_session, user1_in)

    user2_in = UserCreate(
        nickname="statususer2",
        password="testpassword123",
        phone="13800138141",
        code="8888"
    )
    user2 = await UserService.create(db_session, user2_in)

    # 禁用第二个用户
    await UserService.update_status(db_session, user2.id, status=0)

    # 只查询启用的用户
    users, total = await UserService.get_multi(db_session, skip=0, limit=10, status=1)
    assert any(user.id == user1.id for user in users)

    # 查询禁用的用户
    users, total = await UserService.get_multi(db_session, skip=0, limit=10, status=0)
    assert any(user.id == user2.id for user in users)
