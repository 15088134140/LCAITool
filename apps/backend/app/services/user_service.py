import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.security import get_password_hash
from app.core.exceptions import UserAlreadyExistsException, UserNotFoundException
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_username(db: AsyncSession, username: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_multi(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[User]:
        result = await db.execute(select(User).offset(skip).limit(limit))
        return result.scalars().all()

    @staticmethod
    async def create(db: AsyncSession, obj_in: UserCreate) -> User:
        existing_user = await UserService.get_by_username(db, obj_in.username)
        if existing_user:
            raise UserAlreadyExistsException()

        if obj_in.email:
            existing_email = await UserService.get_by_email(db, obj_in.email)
            if existing_email:
                raise UserAlreadyExistsException()

        db_obj = User(
            username=obj_in.username,
            email=obj_in.email,
            password_hash=get_password_hash(obj_in.password),
            nickname=obj_in.username,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def update(db: AsyncSession, user_id: uuid.UUID, obj_in: UserUpdate) -> User:
        user = await UserService.get_by_id(db, user_id)
        if not user:
            raise UserNotFoundException()

        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def delete(db: AsyncSession, user_id: uuid.UUID) -> None:
        user = await UserService.get_by_id(db, user_id)
        if not user:
            raise UserNotFoundException()
        await db.delete(user)
        await db.commit()
