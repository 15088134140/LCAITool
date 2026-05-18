from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_active_user, get_db
from app.models.user import User
from app.schemas.user import User, UserUpdate
from app.services.user_service import UserService

router = APIRouter()


@router.get("/me", response_model=User, summary="获取当前用户信息")
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return current_user


@router.put("/me", response_model=User, summary="更新当前用户信息")
async def update_current_user(
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    user = await UserService.update(db, current_user.id, user_in)
    return user


@router.get("/{user_id}", response_model=User, summary="获取指定用户信息")
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    if not current_user.is_admin and str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="权限不足")
    user = await UserService.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user


@router.get("/", response_model=List[User], summary="获取用户列表（管理员）")
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    users = await UserService.get_multi(db, skip=skip, limit=limit)
    return users
