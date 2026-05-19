import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.core.security import get_password_hash, aes_encrypt, mask_id_card, mask_id_card_encrypted, validate_id_card_format
from app.core.exceptions import UserAlreadyExistsException, UserNotFoundException, InvalidVerificationCodeException, InvalidIdCardFormatException
from app.models.user import User, Role
from app.schemas.user import UserCreate, UserUpdate, UserIdVerifyRequest


class UserService:
    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_username(db: AsyncSession, username: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.nickname == username))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_openid(db: AsyncSession, openid: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.openid == openid))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_multi(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        status: Optional[int] = None
    ) -> Tuple[List[User], int]:
        query = select(User)

        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    User.nickname.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.phone.ilike(search_pattern),
                )
            )

        if status is not None:
            query = query.where(User.status == status)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Get paginated results
        query = query.offset(skip).limit(limit).order_by(User.created_at.desc())
        result = await db.execute(query)
        users = result.scalars().all()

        return users, total

    @staticmethod
    async def get_by_phone(db: AsyncSession, phone: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.phone == phone))
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, obj_in: UserCreate) -> User:
        # 校验验证码：开发环境万能验证码 8888
        if obj_in.code != "8888":
            raise InvalidVerificationCodeException()

        # Check if phone exists
        existing_phone = await UserService.get_by_phone(db, obj_in.phone)
        if existing_phone:
            raise UserAlreadyExistsException()

        db_obj = User(
            nickname=obj_in.nickname or f"用户{obj_in.phone[-4:]}",
            phone=obj_in.phone,
            password_hash=get_password_hash(obj_in.password),
            balance=100,  # 赠送新人积分
            status=1,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def create_by_wechat(db: AsyncSession, openid: str, nickname: Optional[str] = None, avatar: Optional[str] = None) -> User:
        db_obj = User(
            openid=openid,
            nickname=nickname or "微信用户",
            avatar=avatar,
            balance=100,  # 赠送新人积分
            status=1,
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
    async def update_status(db: AsyncSession, user_id: uuid.UUID, status: int) -> User:
        user = await UserService.get_by_id(db, user_id)
        if not user:
            raise UserNotFoundException()

        user.status = status
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def verify_id_card(db: AsyncSession, user_id: uuid.UUID, obj_in: UserIdVerifyRequest) -> User:
        user = await UserService.get_by_id(db, user_id)
        if not user:
            raise UserNotFoundException()

        # 验证身份证号格式
        if not validate_id_card_format(obj_in.id_card_number):
            raise InvalidIdCardFormatException()

        # 加密存储身份证号
        user.id_card_name = obj_in.real_name
        user.id_card_number_encrypted = aes_encrypt(obj_in.id_card_number)
        user.id_card_verified = True

        # 赠送认证奖励积分
        user.balance += 50

        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def get_id_verify_info(db: AsyncSession, user_id: uuid.UUID) -> dict:
        user = await UserService.get_by_id(db, user_id)
        if not user:
            raise UserNotFoundException()

        return {
            "id_card_verified": user.id_card_verified,
            "real_name": user.id_card_name,
            "id_card_number": mask_id_card_encrypted(user.id_card_number_encrypted) if user.id_card_number_encrypted else None,
        }

    @staticmethod
    async def get_balance(db: AsyncSession, user_id: uuid.UUID) -> int:
        user = await UserService.get_by_id(db, user_id)
        if not user:
            raise UserNotFoundException()
        return user.balance

    @staticmethod
    async def adjust_balance(
        db: AsyncSession,
        user_id: uuid.UUID,
        amount: int,
        reason: str,
        related_id: Optional[str] = None
    ) -> User:
        user = await UserService.get_by_id(db, user_id)
        if not user:
            raise UserNotFoundException()

        user.balance += amount
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

    @staticmethod
    async def get_user_roles(db: AsyncSession, user_id: uuid.UUID) -> List[Role]:
        user = await UserService.get_by_id(db, user_id)
        if not user:
            raise UserNotFoundException()
        return user.roles

    @staticmethod
    async def assign_roles(db: AsyncSession, user_id: uuid.UUID, role_ids: List[uuid.UUID]) -> User:
        user = await UserService.get_by_id(db, user_id)
        if not user:
            raise UserNotFoundException()

        # Clear existing roles
        user.roles.clear()

        # Add new roles
        for role_id in role_ids:
            result = await db.execute(select(Role).where(Role.id == role_id))
            role = result.scalar_one_or_none()
            if role:
                user.roles.append(role)

        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
