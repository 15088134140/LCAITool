import pytest
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.user import UserCreate, UserLogin
from app.services.user_service import UserService
from app.services.auth_service import AuthService
from app.core.security import create_access_token, create_refresh_token


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


@pytest.mark.asyncio
async def test_token_expired_verification(db_session: AsyncSession):
    """测试过期Token验证"""
    from app.core.exceptions import TokenExpiredException

    user_in = UserCreate(
        nickname="testexpired",
        password="testpassword123",
        phone="13800138003",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建一个已过期的token（过期时间设置为过去的时间）
    expired_token = create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(seconds=-1)  # 立即过期
    )

    with pytest.raises(TokenExpiredException):
        AuthService.verify_token(expired_token)


@pytest.mark.asyncio
async def test_refresh_token(db_session: AsyncSession):
    """测试Token刷新功能"""
    from app.core.exceptions import InvalidCredentialsException

    user_in = UserCreate(
        nickname="testrefresh",
        password="testpassword123",
        phone="13800138004",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 先登录获取refresh_token
    login_in = UserLogin(
        username="testrefresh",
        password="testpassword123"
    )
    token = await AuthService.login(db_session, login_in)

    # 使用refresh_token刷新
    new_token = await AuthService.refresh_token(db_session, token.refresh_token)

    assert new_token.access_token is not None
    assert new_token.refresh_token is not None


@pytest.mark.asyncio
async def test_refresh_token_with_invalid_token(db_session: AsyncSession):
    """测试使用无效Token刷新"""
    from app.core.exceptions import InvalidCredentialsException

    with pytest.raises(InvalidCredentialsException):
        await AuthService.refresh_token(db_session, "invalid_token")


@pytest.mark.asyncio
async def test_refresh_token_with_expired_token(db_session: AsyncSession):
    """测试使用过期Refresh Token刷新"""
    from app.core.exceptions import TokenExpiredException

    user_in = UserCreate(
        nickname="testrefreshexpired",
        password="testpassword123",
        phone="13800138005",
        code="8888"
    )
    created_user = await UserService.create(db_session, user_in)

    # 创建过期的refresh_token
    expired_refresh_token = create_refresh_token(
        subject=str(created_user.id),
        expires_delta=timedelta(seconds=-1)
    )

    with pytest.raises(TokenExpiredException):
        await AuthService.refresh_token(db_session, expired_refresh_token)


@pytest.mark.asyncio
async def test_login_disabled_user(db_session: AsyncSession):
    """测试禁用用户登录"""
    from app.core.exceptions import InvalidCredentialsException

    user_in = UserCreate(
        nickname="testdisabled",
        password="testpassword123",
        phone="13800138006",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 禁用用户
    await UserService.update_status(db_session, user.id, status=0)

    login_in = UserLogin(
        username="testdisabled",
        password="testpassword123"
    )
    with pytest.raises(InvalidCredentialsException):
        await AuthService.login(db_session, login_in)
