import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.user import UserCreate, UserLogin
from app.services.user_service import UserService
from app.services.auth_service import AuthService


@pytest.mark.asyncio
async def test_login_success(db_session: AsyncSession):
    user_in = UserCreate(
        nickname="testlogin",
        password="testpassword123",
        phone="13800138001",
        code="8888"
    )
    await UserService.create(db_session, user_in)

    login_in = UserLogin(
        username="testlogin",
        password="testpassword123"
    )
    token = await AuthService.login(db_session, login_in)

    assert token.access_token is not None
    assert token.refresh_token is not None
    assert token.token_type == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(db_session: AsyncSession):
    from app.core.exceptions import InvalidCredentialsException

    user_in = UserCreate(
        nickname="testwrong",
        password="testpassword123",
        phone="13800138002",
        code="8888"
    )
    await UserService.create(db_session, user_in)

    login_in = UserLogin(
        username="testwrong",
        password="wrongpassword"
    )
    with pytest.raises(InvalidCredentialsException):
        await AuthService.login(db_session, login_in)


@pytest.mark.asyncio
async def test_login_user_not_found(db_session: AsyncSession):
    from app.core.exceptions import InvalidCredentialsException

    login_in = UserLogin(
        username="nonexistent",
        password="anypassword"
    )
    with pytest.raises(InvalidCredentialsException):
        await AuthService.login(db_session, login_in)


@pytest.mark.asyncio
async def test_login_by_wechat_new_user(db_session: AsyncSession):
    token = await AuthService.login_by_wechat(
        db_session,
        openid="wechat_test_12345",
        nickname="微信用户",
        avatar="http://example.com/avatar.jpg"
    )

    assert token.access_token is not None
    assert token.refresh_token is not None

    user = await UserService.get_by_openid(db_session, "wechat_test_12345")
    assert user is not None
    assert user.nickname == "微信用户"
    assert user.balance == 100  # 新用户赠送100积分


@pytest.mark.asyncio
async def test_login_by_wechat_existing_user(db_session: AsyncSession):
    # 首次登录创建用户
    token1 = await AuthService.login_by_wechat(
        db_session,
        openid="wechat_existing_123",
        nickname="第一次登录"
    )

    # 第二次登录应该返回同一个用户的token
    token2 = await AuthService.login_by_wechat(
        db_session,
        openid="wechat_existing_123",
        nickname="第二次登录"
    )

    assert token2.access_token is not None

    # 验证用户只有一个
    user = await UserService.get_by_openid(db_session, "wechat_existing_123")
    assert user is not None
    assert user.nickname == "第一次登录"  # 昵称不会被覆盖
