from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.core.exceptions import InvalidCredentialsException
from app.schemas.token import Token
from app.schemas.user import UserLogin
from app.services.user_service import UserService


class AuthService:
    @staticmethod
    async def login(db: AsyncSession, obj_in: UserLogin) -> Token:
        user = await UserService.get_by_username(db, obj_in.username)
        if not user:
            raise InvalidCredentialsException()
        if not verify_password(obj_in.password, user.password_hash):
            raise InvalidCredentialsException()
        if not user.is_active:
            raise InvalidCredentialsException()

        access_token = create_access_token(subject=str(user.id))
        refresh_token = create_refresh_token(subject=str(user.id))
        return Token(access_token=access_token, refresh_token=refresh_token)
