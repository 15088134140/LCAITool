import uuid
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from app.models.payment import PointTransaction, PointTransactionType
from app.models.user import User
from app.schemas.payment import PointTransactionCreate
from app.core.exceptions import UserNotFoundException, InsufficientBalanceException, OptimisticLockException


class PointService:
    @staticmethod
    async def get_by_id(db: AsyncSession, transaction_id: uuid.UUID) -> Optional[PointTransaction]:
        result = await db.execute(select(PointTransaction).where(PointTransaction.id == transaction_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_user_id(
        db: AsyncSession,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[PointTransaction], int]:
        query = select(PointTransaction).where(PointTransaction.user_id == user_id)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Get paginated results
        query = query.offset(skip).limit(limit).order_by(PointTransaction.created_at.desc())
        result = await db.execute(query)
        transactions = result.scalars().all()

        return transactions, total

    @staticmethod
    async def create(db: AsyncSession, obj_in: PointTransactionCreate) -> PointTransaction:
        # Get user's current balance first
        user_result = await db.execute(select(User).where(User.id == obj_in.user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise UserNotFoundException()

        balance_before = user.balance
        balance_after = balance_before + obj_in.amount

        db_obj = PointTransaction(
            user_id=obj_in.user_id,
            amount=obj_in.amount,
            type=obj_in.type,
            reason=obj_in.reason,
            related_id=obj_in.related_id,
            related_type=obj_in.related_type,
            idempotency_key=obj_in.idempotency_key,
            balance_before=balance_before,
            balance_after=balance_after,
            operator=obj_in.operator,
            remark=obj_in.remark,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def create_transaction(
        db: AsyncSession,
        user_id: uuid.UUID,
        amount: int,
        transaction_type: str,
        reason: str,
        related_id: Optional[str] = None,
        related_type: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        operator: Optional[str] = None,
        remark: Optional[str] = None,
    ) -> PointTransaction:
        """创建积分流水的便捷方法"""
        # Get user's current balance first
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise UserNotFoundException()

        balance_before = user.balance
        balance_after = balance_before + amount

        db_obj = PointTransaction(
            user_id=user_id,
            amount=amount,
            type=transaction_type,
            reason=reason,
            related_id=related_id,
            related_type=related_type,
            idempotency_key=idempotency_key,
            balance_before=balance_before,
            balance_after=balance_after,
            operator=operator,
            remark=remark,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def freeze_points(
        db: AsyncSession,
        user_id: uuid.UUID,
        amount: int,
        reason: str,
        related_id: Optional[str] = None
    ) -> User:
        """冻结用户积分 - 使用乐观锁"""
        # 获取用户当前状态
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise UserNotFoundException()

        if user.balance < amount:
            raise InsufficientBalanceException()

        # 乐观锁更新
        stmt = (
            update(User)
            .where(User.id == user_id, User.version == user.version)
            .values(
                balance=User.balance - amount,
                frozen_balance=User.frozen_balance + amount,
                version=User.version + 1
            )
            .execution_options(synchronize_session=False)
        )
        result = await db.execute(stmt)
        await db.commit()

        if result.rowcount == 0:
            raise OptimisticLockException()

        # 创建冻结流水
        await PointService.create_transaction(
            db=db,
            user_id=user_id,
            amount=-amount,
            transaction_type="freeze",
            reason=reason,
            related_id=related_id
        )

        # 重新获取用户（强制从数据库读取最新版本）
        await db.refresh(user)

        # 再查询一次确保 identity map 与 DB 一致
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def settle_frozen_points(
        db: AsyncSession,
        user_id: uuid.UUID,
        amount: int,
        reason: str,
        related_id: Optional[str] = None
    ) -> User:
        """结算冻结积分 - 从冻结余额中扣除，使用乐观锁"""
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise UserNotFoundException()

        if user.frozen_balance < amount:
            raise InsufficientBalanceException()

        # 乐观锁更新
        stmt = (
            update(User)
            .where(User.id == user_id, User.version == user.version)
            .values(
                frozen_balance=User.frozen_balance - amount,
                version=User.version + 1
            )
            .execution_options(synchronize_session=False)
        )
        result = await db.execute(stmt)
        await db.commit()

        if result.rowcount == 0:
            raise OptimisticLockException()

        # 创建消费流水
        await PointService.create_transaction(
            db=db,
            user_id=user_id,
            amount=-amount,
            transaction_type="consume",
            reason=reason,
            related_id=related_id
        )

        # 重新获取用户（强制从数据库读取最新版本）
        await db.refresh(user)

        # 再查询一次确保 identity map 与 DB 一致
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def unfreeze_points(
        db: AsyncSession,
        user_id: uuid.UUID,
        amount: int,
        reason: str,
        related_id: Optional[str] = None
    ) -> User:
        """解冻积分 - 将冻结余额转回可用余额"""
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise UserNotFoundException()

        if user.frozen_balance < amount:
            raise InsufficientBalanceException()

        # 乐观锁更新
        stmt = (
            update(User)
            .where(User.id == user_id, User.version == user.version)
            .values(
                balance=User.balance + amount,
                frozen_balance=User.frozen_balance - amount,
                version=User.version + 1
            )
            .execution_options(synchronize_session=False)
        )
        result = await db.execute(stmt)
        await db.commit()

        if result.rowcount == 0:
            raise OptimisticLockException()

        # 创建解冻流水
        await PointService.create_transaction(
            db=db,
            user_id=user_id,
            amount=amount,
            transaction_type="unfreeze",
            reason=reason,
            related_id=related_id
        )

        # 重新获取用户（强制从数据库读取最新版本）
        await db.refresh(user)

        # 再查询一次确保 identity map 与 DB 一致
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
