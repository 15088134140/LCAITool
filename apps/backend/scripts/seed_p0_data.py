"""
P0 功能种子数据脚本
插入默认系统配置、AI 提供商、示例评价、示例反馈
幂等执行：先检查后插入，可安全重复运行

使用方式:
    cd apps/backend
    python scripts/seed_p0_data.py
"""
import asyncio
import sys
import os
import uuid
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal as async_session
from app.models.system import SystemConfig, AiProvider, Feedback
from app.models.tool import Tool, ToolRating
from app.models.user import User


# ---------------------------------------------------------------------------
# SystemConfig
# ---------------------------------------------------------------------------
SYSTEM_CONFIG_DEFAULTS = [
    # (key, value, group, label, type)
    ("site_name",           "灵创AI工具箱",         "basic",    "站点名称",               "string"),
    ("site_slogan",         "专业场景AI工具集合平台", "basic",    "站点Slogan",             "string"),
    ("site_icp",            "沪ICP备xxxxxx号",      "basic",    "ICP备案号",              "string"),
    ("contact_email",       "support@lingchuang.ai","basic",    "联系邮箱",               "string"),
    ("contact_phone",       "",                     "basic",    "联系电话",               "string"),
    ("checkin_base_points",  "1",                   "business", "签到基础积分",           "number"),
    ("checkin_streak_bonus", "5",                   "business", "满7天额外奖励",         "number"),
    ("invite_register_reward",  "10",               "business", "邀请注册奖励",           "number"),
    ("invite_recharge_reward",  "20",               "business", "邀请充值奖励",           "number"),
    ("invite_daily_limit",      "50",               "business", "每日邀请奖励上限",       "number"),
    ("register_bonus_points",   "50",               "business", "注册赠送积分",           "number"),
    ("verify_bonus_points",     "50",               "business", "实名认证奖励积分",       "number"),
    ("rating_text_reward",      "2",                "business", "评价奖励(文字)",         "number"),
    ("rating_image_reward",     "5",                "business", "评价奖励(带图)",         "number"),
    ("points_per_yuan",         "10",               "business", "1元兑积分比例",          "number"),
]


async def seed_system_configs(db):
    """插入默认系统配置（幂等）"""
    inserted = 0
    for key, value, group, label, type_ in SYSTEM_CONFIG_DEFAULTS:
        result = await db.execute(
            select(SystemConfig).where(SystemConfig.key == key)
        )
        if not result.scalar_one_or_none():
            db.add(SystemConfig(
                key=key,
                value=value,
                group=group,
                label=label,
                type=type_,
            ))
            inserted += 1
    await db.commit()
    print(f"  [SystemConfig] {inserted} inserted ({len(SYSTEM_CONFIG_DEFAULTS)} total defaults)")


# ---------------------------------------------------------------------------
# AiProvider
# ---------------------------------------------------------------------------
AI_PROVIDER_DEFAULTS = [
    {
        "slug": "volcano",
        "name": "火山方舟",
        "provider_type": "volcano",
        "config": {"model": "doubao-pro-32k"},
        "sort_order": 1,
    },
    {
        "slug": "dify",
        "name": "Dify",
        "provider_type": "dify",
        "config": {},
        "sort_order": 2,
    },
    {
        "slug": "deepseek",
        "name": "DeepSeek",
        "provider_type": "openai",
        "config": {"model": "deepseek-chat"},
        "sort_order": 3,
    },
]

async def seed_ai_providers(db):
    """插入默认 AI 提供商（幂等）"""
    inserted = 0
    for p in AI_PROVIDER_DEFAULTS:
        result = await db.execute(
            select(AiProvider).where(AiProvider.slug == p["slug"])
        )
        if not result.scalar_one_or_none():
            db.add(AiProvider(**p))
            inserted += 1
    await db.commit()
    print(f"  [AiProvider] {inserted} inserted ({len(AI_PROVIDER_DEFAULTS)} total defaults)")


# ---------------------------------------------------------------------------
# ToolRating (示例评价)
# ---------------------------------------------------------------------------
async def seed_sample_ratings(db):
    """插入示例评价（幂等，依赖已有用户和工具）"""
    # 获取用户
    users = (await db.execute(select(User).limit(2))).scalars().all()
    if len(users) < 2:
        print("  [ToolRating] SKIP - need at least 2 users, have %d" % len(users))
        return

    # 获取已上线的工具
    tools = (await db.execute(
        select(Tool).where(Tool.status == 1).limit(3)
    )).scalars().all()
    if not tools:
        print("  [ToolRating] SKIP - no active tools found")
        return

    # 按工具构建评价数据
    ratings_to_create = []

    # 工具0：AI有声绘本
    ratings_to_create.append((tools[0], users[0].id, 5, "生成的绘本质量很高，插图风格统一，孩子很喜欢！"))
    ratings_to_create.append((tools[0], users[1].id, 4, "故事逻辑不错，部分插图细节可以更好"))

    if len(tools) > 1:
        ratings_to_create.append((tools[1], users[0].id, 5, "详情页排版专业，省去了很多设计时间"))
        ratings_to_create.append((tools[1], users[1].id, 4, "文案需要稍微调整，但整体效果很不错"))

    if len(tools) > 2:
        ratings_to_create.append((tools[2], users[0].id, 5, "文案质量超出预期，稍作修改就能用"))

    inserted = 0
    for tool, user_id, rating, content in ratings_to_create:
        # 用 tool_id + user_id + content 判断是否已存在
        result = await db.execute(
            select(ToolRating).where(
                ToolRating.tool_id == tool.id,
                ToolRating.user_id == user_id,
                ToolRating.content == content,
            )
        )
        if not result.scalar_one_or_none():
            db.add(ToolRating(
                user_id=user_id,
                tool_id=tool.id,
                task_id=uuid.uuid4(),       # task_id 是 unique 非空字段
                rating=rating,
                content=content,
                status=1,                   # 1=显示
            ))
            inserted += 1

    await db.commit()
    print(f"  [ToolRating] {inserted} inserted")


# ---------------------------------------------------------------------------
# Feedback (示例反馈)
# ---------------------------------------------------------------------------
FEEDBACK_SAMPLES = [
    {
        "type": "feature",
        "title": "希望增加批量生成功能",
        "description": "如果有批量生成功能，可以一次性生成多个绘本，效率会大大提高",
        "status": "resolved",
        "admin_reply": "感谢您的建议，批量生成功能已纳入P2开发计划，敬请期待！",
    },
    {
        "type": "bug",
        "title": "生成结果偶尔会丢失图片",
        "description": "在使用过程中发现大约10%的生成结果会缺少一张图片",
        "status": "processing",
        "admin_reply": None,
    },
    {
        "type": "consult",
        "title": "生成的图片可以商用吗",
        "description": "请问通过平台生成的图片是否有版权问题？是否可以用于商业用途？",
        "status": "resolved",
        "admin_reply": "通过平台生成的内容版权归用户所有，您可以放心用于商业用途。",
    },
]

async def seed_sample_feedbacks(db):
    """插入示例反馈（幂等，依赖已有用户）"""
    users = (await db.execute(select(User).limit(1))).scalars().all()
    if not users:
        print("  [Feedback] SKIP - no users found")
        return

    user = users[0]
    inserted = 0
    now = int(time.time())

    for fb in FEEDBACK_SAMPLES:
        result = await db.execute(
            select(Feedback).where(Feedback.title == fb["title"])
        )
        if not result.scalar_one_or_none():
            feedback = Feedback(
                user_id=user.id,
                type=fb["type"],
                title=fb["title"],
                description=fb["description"],
                status=fb["status"],
                admin_reply=fb["admin_reply"],
                replied_by=user.id if fb["admin_reply"] else None,
                replied_at=now if fb["admin_reply"] else None,
            )
            db.add(feedback)
            inserted += 1

    await db.commit()
    print(f"  [Feedback] {inserted} inserted")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
async def main():
    print("=" * 60)
    print("P0 种子数据脚本")
    print("=" * 60)

    try:
        async with async_session() as db:
            await seed_system_configs(db)
            await seed_ai_providers(db)
            await seed_sample_ratings(db)
            await seed_sample_feedbacks(db)
        print("\nAll done!")
    except Exception as e:
        print(f"\n[Error] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
