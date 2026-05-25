import uuid
import time
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from fastapi import HTTPException
from app.core.security import get_password_hash, aes_encrypt, mask_id_card, mask_id_card_encrypted, validate_id_card_format
from app.core.exceptions import UserAlreadyExistsException, UserNotFoundException, InvalidVerificationCodeException, InvalidIdCardFormatException
from app.models.user import User, Role
from app.models.task import Task, Work
from app.models.payment import PointTransaction, PointTransactionType
from app.schemas.user import UserCreate, UserUpdate, UserIdVerifyRequest
from app.services.settings_service import SettingsService


class UserService:
    CHECKIN_REDIS_PREFIX = "checkin"

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_username(db: AsyncSession, username: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.nickname == username))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_username_or_phone(db: AsyncSession, username: str) -> Optional[User]:
        result = await db.execute(
            select(User).where(
                or_(User.nickname == username, User.phone == username, User.email == username)
            )
        )
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
        status: Optional[int] = None,
        real_name_not_null: Optional[bool] = None
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

        if real_name_not_null is True:
            query = query.where(User.real_name.isnot(None))
        elif real_name_not_null is False:
            query = query.where(User.real_name.is_(None))

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
        # 手机号注册模式：校验手机号和验证码
        if obj_in.phone:
            # 校验验证码：开发环境万能验证码 8888
            if obj_in.code != "8888":
                raise InvalidVerificationCodeException()

            # Check if phone exists
            existing_phone = await UserService.get_by_phone(db, obj_in.phone)
            if existing_phone:
                raise UserAlreadyExistsException()

            register_bonus = await SettingsService.get_config_value(db, "register_bonus_points", 50)
            db_obj = User(
                nickname=obj_in.nickname or obj_in.username or f"用户{obj_in.phone[-4:]}",
                phone=obj_in.phone,
                email=obj_in.email,
                password_hash=get_password_hash(obj_in.password),
                balance=register_bonus,  # 赠送新人积分（从系统配置读取）
                status=1,
            )
        # 用户名注册模式
        elif obj_in.username:
            # Check if username exists
            existing_user = await UserService.get_by_username(db, obj_in.username)
            if existing_user:
                raise UserAlreadyExistsException()

            register_bonus = await SettingsService.get_config_value(db, "register_bonus_points", 50)
            db_obj = User(
                nickname=obj_in.nickname or obj_in.username,
                email=obj_in.email,
                password_hash=get_password_hash(obj_in.password),
                balance=register_bonus,  # 赠送新人积分（从系统配置读取）
                status=1,
            )
        else:
            raise ValueError("注册需要提供用户名或手机号")

        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def create_by_wechat(db: AsyncSession, openid: str, nickname: Optional[str] = None, avatar: Optional[str] = None) -> User:
        register_bonus = await SettingsService.get_config_value(db, "register_bonus_points", 50)
        db_obj = User(
            openid=openid,
            nickname=nickname or "微信用户",
            avatar=avatar,
            balance=register_bonus,  # 赠送新人积分（从系统配置读取）
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
        user.real_name = obj_in.real_name
        user.id_card_number_encrypted = aes_encrypt(obj_in.id_card_number)
        user.id_card_verified = True

        # 赠送认证奖励积分（从系统配置读取）
        verify_bonus = await SettingsService.get_config_value(db, "verify_bonus_points", 50)
        user.balance += verify_bonus

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
            "real_name": user.real_name,
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
    async def get_user_stats(db: AsyncSession, user_id: uuid.UUID) -> dict:
        """获取用户统计数据：注册天数、今日次数、作品总数、累计消费、奖励积分"""
        user_result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        now_ts = int(time.time())
        created_ts = user.created_at
        days_used = max(1, (now_ts - created_ts) // 86400 + 1)

        # 今日开始时间戳
        today_start_ts = now_ts - (now_ts % 86400)

        # 今日任务数
        today_count_result = await db.execute(
            select(func.count(Task.id)).where(
                Task.user_id == user_id,
                Task.created_at >= today_start_ts
            )
        )
        today_count = today_count_result.scalar() or 0

        # 作品总数
        works_result = await db.execute(
            select(func.count(Work.id)).where(Work.user_id == user_id)
        )
        total_works = works_result.scalar() or 0

        # 累计消费积分
        consumed_result = await db.execute(
            select(func.abs(func.coalesce(func.sum(PointTransaction.amount), 0))).where(
                PointTransaction.user_id == user_id,
                PointTransaction.type == "consume"
            )
        )
        total_consumed = consumed_result.scalar() or 0

        # 奖励积分
        reward_result = await db.execute(
            select(func.coalesce(func.sum(PointTransaction.amount), 0)).where(
                PointTransaction.user_id == user_id,
                PointTransaction.type.in_(["reward", "adjust"]),
                PointTransaction.amount > 0
            )
        )
        reward_points = reward_result.scalar() or 0

        # 总收入（所有正数交易）
        income_result = await db.execute(
            select(func.coalesce(func.sum(PointTransaction.amount), 0)).where(
                PointTransaction.user_id == user_id,
                PointTransaction.amount > 0
            )
        )
        total_income = income_result.scalar() or 0

        # 本月消费
        now_utc = datetime.fromtimestamp(now_ts, tz=timezone.utc)
        month_start = now_utc.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_start_ts = int(month_start.timestamp())
        month_consumed_result = await db.execute(
            select(func.abs(func.coalesce(func.sum(PointTransaction.amount), 0))).where(
                PointTransaction.user_id == user_id,
                PointTransaction.type == "consume",
                PointTransaction.created_at >= month_start_ts
            )
        )
        monthly_consumed = month_consumed_result.scalar() or 0

        # 累计充值（recharge 基础积分 + reward 赠送积分，均关联订单）
        recharge_result = await db.execute(
            select(func.coalesce(func.sum(PointTransaction.amount), 0)).where(
                PointTransaction.user_id == user_id,
                PointTransaction.type.in_(["recharge", "reward"]),
                PointTransaction.related_type == "order"
            )
        )
        total_recharge = recharge_result.scalar() or 0

        return {
            "days_used": days_used,
            "today_count": today_count,
            "total_works": total_works,
            "total_consumed": total_consumed,
            "total_recharge": total_recharge,
            "total_income": total_income,
            "reward_points": reward_points,
            "monthly_consumed": monthly_consumed,
        }

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
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(User).where(User.id == user_id).options(selectinload(User.roles))
        )
        user = result.scalar_one_or_none()
        if not user:
            raise UserNotFoundException()

        # Clear existing roles
        user.roles.clear()

        # Add new roles
        for role_id in role_ids:
            role_result = await db.execute(select(Role).where(Role.id == role_id))
            role = role_result.scalar_one_or_none()
            if role:
                user.roles.append(role)

        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    # ----- 签到相关方法 -----

    @staticmethod
    async def get_checkin_status(user: User) -> dict:
        """查询签到状态"""
        from datetime import date
        from app.core.redis import get_redis_client
        today = date.today().isoformat()
        redis = get_redis_client()
        checked = await redis.get(f"{UserService.CHECKIN_REDIS_PREFIX}:{user.id}:{today}")
        return {
            "today_checked": checked == b"1",
            "streak": user.checkin_streak or 0,
            "can_checkin": checked != b"1",
        }

    @staticmethod
    async def do_checkin(db: AsyncSession, user: User) -> dict:
        """执行签到"""
        from datetime import date, timedelta
        from app.core.redis import get_redis_client

        today = date.today().isoformat()
        redis = get_redis_client()

        # 检查是否已签到
        checked = await redis.get(f"{UserService.CHECKIN_REDIS_PREFIX}:{user.id}:{today}")
        if checked == b"1":
            raise HTTPException(status_code=400, detail="今日已签到")

        # 计算连续天数
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        last_date = user.last_checkin_date

        if last_date == yesterday:
            streak = (user.checkin_streak or 0) + 1
            if streak > 7:
                streak = 1
        elif last_date == today:
            raise HTTPException(status_code=400, detail="今日已签到")
        else:
            streak = 1

        # 计算奖励（从系统配置读取积分参数）
        base_points = await SettingsService.get_config_value(db, "checkin_base_points", 1)
        points = streak * base_points
        extra_bonus = await SettingsService.get_config_value(db, "checkin_streak_bonus", 5) if streak == 7 else 0

        total_earned = points + extra_bonus

        # 更新用户字段
        user.checkin_streak = streak
        user.last_checkin_date = today
        user.total_checkin_days = (user.total_checkin_days or 0) + 1
        user.balance += total_earned

        # 记录积分流水
        reason = f"每日签到: 第{streak}天 + {points}积分"
        if extra_bonus:
            reason += f"，满7天额外奖励 +{extra_bonus}积分"
        db.add(PointTransaction(
            user_id=user.id,
            amount=total_earned,
            type=PointTransactionType.REWARD,
            reason=reason,
            balance_before=user.balance - total_earned,
            balance_after=user.balance,
        ))

        await db.commit()

        # Redis 记录签到状态，7天过期
        await redis.set(f"{UserService.CHECKIN_REDIS_PREFIX}:{user.id}:{today}", "1", ex=86400 * 7)

        return {
            "streak": streak,
            "points_earned": total_earned,
            "total_points": user.balance,
        }

    # ----- 邀请相关方法 -----

    @staticmethod
    def generate_invite_code() -> str:
        """生成8位邀请码: LCA + 5位字母数字"""
        import random
        import string
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        return f"LCA{suffix}"

    @staticmethod
    async def get_invite_info(db: AsyncSession, user: User) -> dict:
        if not user.invite_code:
            user.invite_code = UserService.generate_invite_code()
            await db.commit()
            await db.refresh(user)

        # 查询邀请人数
        result = await db.execute(
            select(User).where(User.invited_by == user.id)
        )
        invited_users = result.scalars().all()

        # 查询奖励总额
        from sqlalchemy import func as sa_func
        rewards = await db.execute(
            select(sa_func.coalesce(sa_func.sum(PointTransaction.amount), 0))
            .where(
                PointTransaction.user_id == user.id,
                PointTransaction.type == PointTransactionType.REWARD,
                PointTransaction.reason.like("邀请%"),
            )
        )
        total_rewards = rewards.scalar() or 0

        return {
            "invite_code": user.invite_code,
            "invite_url": f"https://lingchuang.ai/register?invite={user.invite_code}",
            "invited_count": len(invited_users),
            "total_rewards": total_rewards,
        }

    @staticmethod
    async def get_invite_list(db: AsyncSession, user: User) -> list:
        result = await db.execute(
            select(User).where(User.invited_by == user.id)
        )
        users = result.scalars().all()
        invite_reward = await SettingsService.get_config_value(db, "invite_register_reward", 10)
        records = []
        for invited in users:
            from app.models.payment import Order, OrderStatus
            order_result = await db.execute(
                select(Order).where(
                    Order.user_id == invited.id,
                    Order.status == OrderStatus.PAID,
                ).limit(1)
            )
            has_recharged = order_result.first() is not None
            records.append({
                "invited_user": invited.nickname or "用户",
                "registered_at": invited.created_at or 0,
                "recharge_status": "first_done" if has_recharged else "none",
                "reward": invite_reward,
            })
        return records

    @staticmethod
    async def process_invite_reward(db: AsyncSession, new_user: User, invite_code: str):
        """处理邀请奖励"""
        from datetime import date
        from app.core.redis import get_redis_client

        if not invite_code:
            return

        # 查找邀请人
        result = await db.execute(
            select(User).where(User.invite_code == invite_code)
        )
        inviter = result.scalar_one_or_none()
        if not inviter or inviter.id == new_user.id:
            return

        # 关联邀请关系
        new_user.invited_by = inviter.id

        # 每日上限检查
        today = date.today().isoformat()
        redis = get_redis_client()
        daily_key = f"invite:daily:{inviter.id}:{today}"
        daily_count = await redis.get(daily_key)
        daily_limit = await SettingsService.get_config_value(db, "invite_daily_limit", 50)
        if daily_count and int(daily_count) >= daily_limit:
            return

        # 双方各得积分（从系统配置读取）
        invite_reward = await SettingsService.get_config_value(db, "invite_register_reward", 10)
        for u, role in [(new_user, "被邀请人"), (inviter, "邀请人")]:
            u.balance += invite_reward
            db.add(PointTransaction(
                user_id=u.id, amount=invite_reward,
                type=PointTransactionType.REWARD,
                reason=f"邀请奖励({role})",
                balance_before=u.balance - 10,
                balance_after=u.balance,
            ))

        # Redis 记录每日邀请次数
        await redis.incr(daily_key)
        await redis.expire(daily_key, 86400)

        await db.commit()

    @staticmethod
    async def process_invite_recharge_reward(db: AsyncSession, user: User):
        """处理首次充值奖励"""
        from app.models.payment import Order, OrderStatus

        if not user.invited_by:
            return

        # 检查是否首次充值
        order_result = await db.execute(
            select(Order).where(
                Order.user_id == user.id,
                Order.status == OrderStatus.PAID,
            ).limit(1)
        )
        if order_result.first():
            return

        # 奖励邀请人积分（从系统配置读取）
        recharge_reward = await SettingsService.get_config_value(db, "invite_recharge_reward", 20)
        result = await db.execute(select(User).where(User.id == user.invited_by))
        inviter = result.scalar_one_or_none()
        if not inviter:
            return

        inviter.balance += recharge_reward
        db.add(PointTransaction(
            user_id=inviter.id, amount=recharge_reward,
            type=PointTransactionType.REWARD,
            reason="邀请首次充值奖励",
            balance_before=inviter.balance - 20,
            balance_after=inviter.balance,
        ))
        await db.commit()
