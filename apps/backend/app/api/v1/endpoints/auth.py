from typing import Any
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.core.config import settings
from app.core.exceptions import InvalidTokenException
from app.core.security import create_access_token
from app.schemas.token import Token, RefreshTokenRequest, TokenPayload
from app.schemas.user import UserCreate, User
from app.services.auth_service import AuthService
from app.services.user_service import UserService

router = APIRouter()


@router.post("/register", response_model=User, summary="用户注册")
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> Any:
    user = await UserService.create(db, user_in)
    return user


@router.post("/login", response_model=Token, summary="用户登录")
async def login(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    return await AuthService.login(
        db, UserLogin(username=form_data.username, password=form_data.password)
    )


@router.post("/refresh", response_model=Token, summary="刷新令牌")
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    try:
        payload = jwt.decode(request.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_data = TokenPayload(**payload)
        if token_data.type != "refresh":
            raise InvalidTokenException()
    except (jwt.JWTError, ValidationError):
        raise InvalidTokenException()

    user = await UserService.get_by_id(db, token_data.sub)
    if not user:
        raise InvalidTokenException()

    new_access_token = create_access_token(subject=str(user.id))
    new_refresh_token = create_access_token(subject=str(user.id))
    return Token(access_token=new_access_token, refresh_token=new_refresh_token)
