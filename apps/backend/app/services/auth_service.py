import uuid
from calendar import timegm
from jose import jwt, JWTError
from jose.exceptions import ExpiredSignatureError
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.core.config import settings
from app.core.exceptions import InvalidCredentialsException, TokenExpiredException, UserNotFoundException
from app.schemas.token import Token
from app.schemas.user import UserLogin
from app.services.user_service import UserService


def get_utc_timestamp() -> int:
    """获取当前UTC时间的时间戳（与JWT的exp格式一致）"""
    return timegm(datetime.utcnow().utctimetuple())


class AuthService:
    @staticmethod
    async def login(db: AsyncSession, obj_in: UserLogin) -> Token:
        # 支持用户名/手机号/邮箱登录
        user = await UserService.get_by_username_or_phone(db, obj_in.username)
        if not user:
            raise InvalidCredentialsException()
        if not verify_password(obj_in.password, user.password_hash):
            raise InvalidCredentialsException()
        if user.status != 1:
            raise InvalidCredentialsException()

        access_token = create_access_token(subject=str(user.id))
        refresh_token = create_refresh_token(subject=str(user.id))
        return Token(access_token=access_token, refresh_token=refresh_token)

    @staticmethod
    async def login_by_wechat(db: AsyncSession, openid: str, nickname: str = None, avatar: str = None) -> Token:
        """微信登录：已存在的直接登录，不存在的创建新用户"""
        user = await UserService.get_by_openid(db, openid)
        if not user:
            user = await UserService.create_by_wechat(db, openid, nickname, avatar)

        if user.status != 1:
            raise InvalidCredentialsException()

        access_token = create_access_token(subject=str(user.id))
        refresh_token = create_refresh_token(subject=str(user.id))
        return Token(access_token=access_token, refresh_token=refresh_token)

    @staticmethod
    async def refresh_token(db: AsyncSession, refresh_token: str) -> Token:
        """刷新Token：使用refresh_token换取新的access_token"""
        try:
            # 使用options不验证exp，以便我们自己处理过期异常
            payload = jwt.decode(
                refresh_token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
                options={"verify_exp": False}
            )
            if payload.get("type") != "refresh":
                raise InvalidCredentialsException()

            user_id = payload.get("sub")
            if user_id is None:
                raise InvalidCredentialsException()

            exp = payload.get("exp")
            if exp is not None and get_utc_timestamp() > exp:
                raise TokenExpiredException()

        except JWTError:
            raise InvalidCredentialsException()

        user = await UserService.get_by_id(db, uuid.UUID(user_id))
        if not user:
            raise UserNotFoundException()
        if user.status != 1:
            raise InvalidCredentialsException()

        new_access_token = create_access_token(subject=str(user.id))
        new_refresh_token = create_refresh_token(subject=str(user.id))
        return Token(access_token=new_access_token, refresh_token=new_refresh_token)

    @staticmethod
    def verify_token(token: str) -> dict:
        """验证Token有效性，返回payload"""
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
                options={"verify_exp": False}
            )
            exp = payload.get("exp")
            if exp is not None and get_utc_timestamp() > exp:
                raise TokenExpiredException()
            return payload
        except ExpiredSignatureError:
            raise TokenExpiredException()
        except JWTError:
            raise InvalidCredentialsException()
