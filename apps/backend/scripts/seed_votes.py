"""
生成构思工具投票测试数据
为已有构思生成测试用户的投票记录，以便在前端展示真实投票用户头像

使用方式:
    cd apps/backend
    python scripts/seed_votes.py
"""
import asyncio
import sys
import os
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, func
from app.core.security import get_password_hash
from app.models.user import User
from app.models.system import IdeaSubmission, IdeaVote
from app.core.database import AsyncSessionLocal as async_session

# 测试用户数据（带头像）
TEST_USERS = [
    {"nickname": "创意设计师", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=designer1"},
    {"nickname": "数字游民小明", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=ming"},
    {"nickname": "AI探索者", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=explorer"},
    {"nickname": "产品经理小李", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=pmli"},
    {"nickname": "自由画师", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=artist"},
    {"nickname": "技术控阿强", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=qiang"},
    {"nickname": "运营小能手", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=operator"},
    {"nickname": "视频创作者", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=videomaker"},
    {"nickname": "自媒体达人", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=mediapro"},
    {"nickname": "效率工具控", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=toolfan"},
    {"nickname": "编程爱好者", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=coder"},
    {"nickname": "设计思维者", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=thinker"},
]


async def seed_votes():
    """生成测试投票数据"""
    print("=" * 70)
    print("构思工具投票测试数据生成脚本")
    print("=" * 70)

    try:
        async with async_session() as db:
            # 获取所有已审核通过的创意
            result = await db.execute(
                select(IdeaSubmission).where(IdeaSubmission.status == "approved")
            )
            ideas = result.scalars().all()

            if not ideas:
                print("\n[Warn]  没有已审核通过的创意，尝试获取所有创意...")
                result = await db.execute(select(IdeaSubmission))
                ideas = result.scalars().all()

            if not ideas:
                print("\n[Error] 数据库中没有任何创意，请先提交创意再运行此脚本")
                sys.exit(1)

            print(f"\n[Info]  找到 {len(ideas)} 个创意")

            # 创建或更新测试用户
            created_users = []
            for user_data in TEST_USERS:
                nickname = user_data["nickname"]
                result = await db.execute(
                    select(User).where(User.nickname == nickname)
                )
                user = result.scalar_one_or_none()

                if not user:
                    user = User(
                        nickname=nickname,
                        avatar=user_data["avatar"],
                        password_hash=get_password_hash("123456"),
                        balance=1000,
                        status=1,
                        id_card_verified=True,  # 标记为已实名认证，允许投票
                        real_name=nickname,
                        phone=f"138{nickname}",
                    )
                    db.add(user)
                    await db.flush()
                    await db.refresh(user)
                    print(f"[Create] 用户: {nickname}")
                else:
                    # 确保已实名认证
                    if not user.id_card_verified:
                        user.id_card_verified = True
                        user.real_name = nickname
                    if not user.avatar:
                        user.avatar = user_data["avatar"]
                    await db.flush()
                    print(f"[Exist]  用户: {nickname}")

                created_users.append(user)

            print(f"\n[Info]  共 {len(created_users)} 个测试用户可用于投票")

            # 为每个创意生成投票（每个创意分配不同数量的投票）
            total_votes = 0
            for idea in ideas:
                # 每个创意的投票人数在 3~12 之间随机
                vote_count = random.randint(3, len(created_users))
                # 随机选择投票用户
                voters = random.sample(created_users, vote_count)

                for user in voters:
                    # 检查是否已投票
                    existing = await db.execute(
                        select(IdeaVote).where(
                            IdeaVote.idea_id == idea.id,
                            IdeaVote.user_id == user.id,
                        )
                    )
                    if existing.scalar_one_or_none():
                        continue

                    vote = IdeaVote(
                        idea_id=idea.id,
                        user_id=user.id,
                        vote_type="up",
                    )
                    db.add(vote)
                    total_votes += 1

                # 更新创意投票数
                result = await db.execute(
                    select(func.count()).select_from(
                        select(IdeaVote).where(IdeaVote.idea_id == idea.id).subquery()
                    )
                )
                actual_vote_count = result.scalar()
                idea.vote_count = actual_vote_count

                print(f"[Vote]  「{idea.title}」: {actual_vote_count} 票")

            await db.commit()
            print(f"\n{'=' * 70}")
            print(f"✅ 完成！共生成了 {total_votes} 条投票记录")
            print(f"   测试用户数: {len(created_users)}")
            print(f"   创意数: {len(ideas)}")
            print(f"\n测试用户登录密码: 123456")
            print(f"{'=' * 70}")

    except Exception as e:
        print(f"\n[Error] 生成失败: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(seed_votes())
