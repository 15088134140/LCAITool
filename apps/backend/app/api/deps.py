from typing import AsyncGenerator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from jose.exceptions import ExpiredSignatureError
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.exceptions import InvalidTokenException
from app.models.user import User
from app.schemas.token import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_data = TokenPayload(**payload)
        if token_data.type != "access":
            raise InvalidTokenException()
    except (jwt.JWTError, ValidationError):
        raise InvalidTokenException()

    from app.services.user_service import UserService
    user = await UserService.get_by_id(db, token_data.sub)

    if not user:
        raise InvalidTokenException()
    if user.status != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户已被禁用",
        )
    return user


async def get_optional_current_user(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme_optional),
) -> Optional[User]:
    """获取当前用户（可选）— 无 token 时返回 None，过期 token 返回 401"""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_data = TokenPayload(**payload)
        if token_data.type != "access":
            return None
    except ExpiredSignatureError:
        # token 过期 → 等同于无 token，返回 None
        # 不返回 401，避免可选的认证接口（如 ideas 列表）拒绝已登录但 token 过期的用户
        return None
    except (jwt.JWTError, ValidationError):
        return None

    from app.services.user_service import UserService

    user = await UserService.get_by_id(db, token_data.sub)
    if not user or user.status != 1:
        return None
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.status != 1:
        raise HTTPException(status_code=400, detail="用户已被禁用")
    return current_user


async def get_current_admin_user(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    # Eager load roles to avoid lazy loading issues
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(User).where(User.id == current_user.id).options(selectinload(User.roles))
    )
    user_with_roles = result.scalar_one_or_none()
    if not user_with_roles:
        raise HTTPException(status_code=404, detail="用户不存在")
    # Check if user has admin role
    if not any(role.name == "admin" for role in user_with_roles.roles):
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return user_with_roles


def requires_roles(*role_names: str):
    """权限校验装饰器工厂"""
    async def decorator(
        current_user: User = Depends(get_current_user),
    ) -> User:
        user_role_names = [role.name for role in current_user.roles]
        for role_name in role_names:
            if role_name in user_role_names:
                return current_user
        raise HTTPException(status_code=403, detail="权限不足")
    return decorator
