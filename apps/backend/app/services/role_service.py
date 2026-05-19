import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.exceptions import UserNotFoundException
from app.models.user import Role
from app.schemas.user import RoleCreate, RoleUpdate


class RoleService:
    @staticmethod
    async def get_by_id(db: AsyncSession, role_id: uuid.UUID) -> Optional[Role]:
        result = await db.execute(select(Role).where(Role.id == role_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_name(db: AsyncSession, name: str) -> Optional[Role]:
        result = await db.execute(select(Role).where(Role.name == name))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_multi(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Role], int]:
        query = select(Role)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Get paginated results
        query = query.offset(skip).limit(limit).order_by(Role.created_at.desc())
        result = await db.execute(query)
        roles = result.scalars().all()

        return roles, total

    @staticmethod
    async def create(db: AsyncSession, obj_in: RoleCreate) -> Role:
        db_obj = Role(
            name=obj_in.name,
            description=obj_in.description,
            permissions=obj_in.permissions,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def update(db: AsyncSession, role_id: uuid.UUID, obj_in: RoleUpdate) -> Role:
        role = await RoleService.get_by_id(db, role_id)
        if not role:
            raise UserNotFoundException()

        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(role, field, value)

        db.add(role)
        await db.commit()
        await db.refresh(role)
        return role

    @staticmethod
    async def delete(db: AsyncSession, role_id: uuid.UUID) -> None:
        role = await RoleService.get_by_id(db, role_id)
        if not role:
            raise UserNotFoundException()
        await db.delete(role)
        await db.commit()
