"""
种子数据脚本

运行方式: cd apps/backend && python -m app.seed_data
"""
import asyncio
import json
import uuid

from sqlalchemy import select, insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.system import IdeaSubmission
from app.models.user import User, Role, user_roles
from app.models.tool import ToolCategory, Tool, ToolDemo
from app.models.payment import RechargePackage


async def seed_users(db: AsyncSession):
    """创建基础用户和管理员角色"""
    # 检查系统用户是否已存在
    result = await db.execute(
        select(User).where(User.id == uuid.UUID("00000000-0000-0000-0000-000000000001"))
    )
    if result.scalar_one_or_none():
        print("  ✓ 系统用户已存在，跳过")
        return

    # 创建管理员角色
    admin_role = Role(
        id=uuid.UUID("00000000-0000-0000-0000-000000000010"),
        name="admin",
        description="系统管理员",
        permissions=json.dumps(["*"]),
    )
    db.add(admin_role)

    users = [
        User(
            id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            nickname="系统用户",
            phone="13800000000",
            password_hash=get_password_hash("test123456"),
            balance=10000,
            status=1,
            roles=[admin_role],
        ),
    ]
    for user in users:
        db.add(user)
    await db.commit()
    print(f"  ✓ 已创建 {len(users)} 个基础用户和管理员角色")

async def seed_categories(db: AsyncSession):
    """创建工具分类"""
    categories = [
        ToolCategory(
            id=uuid.UUID("10000001-0000-0000-0000-000000000001"),
            slug="story", name="故事创作", icon="📖",
            description="AI故事创作、绘本生成等", sort_order=1,
            is_active=True, is_featured=True, tool_count=1,
        ),
        ToolCategory(
            id=uuid.UUID("10000001-0000-0000-0000-000000000002"),
            slug="ecommerce", name="电商工具", icon="🛒",
            description="商品详情、营销文案生成", sort_order=2,
            is_active=True, is_featured=True, tool_count=1,
        ),
        ToolCategory(
            id=uuid.UUID("10000001-0000-0000-0000-000000000003"),
            slug="image", name="图片处理", icon="🎨",
            description="AI图片生成、编辑、优化", sort_order=3,
            is_active=True, is_featured=False, tool_count=1,
        ),
        ToolCategory(
            id=uuid.UUID("10000001-0000-0000-0000-000000000004"),
            slug="copywriting", name="文案写作", icon="✍️",
            description="营销文案、创意写作、标题生成", sort_order=4,
            is_active=True, is_featured=False, tool_count=1,
        ),
        ToolCategory(
            id=uuid.UUID("10000001-0000-0000-0000-000000000005"),
            slug="audio", name="音频处理", icon="🎵",
            description="语音合成、配乐生成、音频编辑", sort_order=5,
            is_active=True, is_featured=False, tool_count=1,
        ),
        ToolCategory(
            id=uuid.UUID("10000001-0000-0000-0000-000000000006"),
            slug="video", name="视频创作", icon="🎬",
            description="AI视频生成、剪辑辅助", sort_order=6,
            is_active=True, is_featured=False, tool_count=0,
        ),
        ToolCategory(
            id=uuid.UUID("10000001-0000-0000-0000-000000000007"),
            slug="design", name="设计工具", icon="🖌️",
            description="UI设计、海报制作、视觉创意", sort_order=7,
            is_active=True, is_featured=False, tool_count=0,
        ),
        ToolCategory(
            id=uuid.UUID("10000001-0000-0000-0000-000000000008"),
            slug="office", name="办公效率", icon="📊",
            description="文档处理、数据分析、PPT生成", sort_order=8,
            is_active=True, is_featured=False, tool_count=0,
        ),
        ToolCategory(
            id=uuid.UUID("10000001-0000-0000-0000-000000000009"),
            slug="education", name="教育教学", icon="📚",
            description="课件生成、试题制作、学习辅导", sort_order=9,
            is_active=True, is_featured=False, tool_count=0,
        ),
        ToolCategory(
            id=uuid.UUID("10000001-0000-0000-0000-000000000010"),
            slug="marketing", name="营销推广", icon="📢",
            description="社交媒体、广告创意、SEO优化", sort_order=10,
            is_active=False, is_featured=False, tool_count=0,
        ),
        ToolCategory(
            id=uuid.UUID("10000001-0000-0000-0000-000000000011"),
            slug="development", name="编程开发", icon="💻",
            description="代码生成、API开发、自动化脚本", sort_order=11,
            is_active=False, is_featured=False, tool_count=0,
        ),
    ]
    created = 0
    updated = 0
    for cat in categories:
        existing = await db.execute(select(ToolCategory).where(ToolCategory.slug == cat.slug))
        existing_row = existing.scalar_one_or_none()
        if not existing_row:
            db.add(cat)
            created += 1
        else:
            existing_row.name = cat.name
            existing_row.icon = cat.icon
            existing_row.description = cat.description
            existing_row.sort_order = cat.sort_order
            existing_row.is_active = cat.is_active
            existing_row.is_featured = cat.is_featured
            existing_row.tool_count = cat.tool_count
            updated += 1
    await db.commit()
    print(f"  ✓ 已创建 {created} 个分类，更新 {updated} 个分类")


async def seed_tools(db: AsyncSession):
    """创建工具"""
    cat_story = uuid.UUID("10000001-0000-0000-0000-000000000001")
    cat_eco = uuid.UUID("10000001-0000-0000-0000-000000000002")
    cat_img = uuid.UUID("10000001-0000-0000-0000-000000000003")
    cat_copy = uuid.UUID("10000001-0000-0000-0000-000000000004")
    cat_audio = uuid.UUID("10000001-0000-0000-0000-000000000005")

    tools = [
        Tool(
            id=uuid.UUID("20000001-0000-0000-0000-000000000001"),
            slug="ai-storybook", name="AI有声绘本生成专家",
            description="输入主题，AI自动生成完整的有声绘本。包括故事创作、插画生成、语音合成、PDF排版打包，一站式完成从创意到可交付绘本的全流程。",
            short_desc="一键生成带插画和配音的精美有声绘本",
            category_id=cat_story, category="故事创作",
            tags=json.dumps(["绘本", "故事", "儿童", "插画", "语音"]),
            base_fee=20, image_fee=2, audio_fee=3, token_fee=0,
            status=1, use_count=128, favorite_count=45, rating_count=32, rating_avg=4.7,
            is_featured=True, usage_modes=["form"],
        ),
        Tool(
            id=uuid.UUID("20000001-0000-0000-0000-000000000002"),
            slug="ecommerce-detail", name="AI电商商品详情页生成器",
            description="输入商品信息，AI自动生成专业的电商详情页。包括商品主图、详情页分段图片、营销文案、PSD源文件，提升商品转化率。",
            short_desc="智能生成专业级电商详情页",
            category_id=cat_eco, category="电商工具",
            tags=json.dumps(["电商", "详情页", "营销", "主图"]),
            base_fee=0, image_fee=2, audio_fee=1, token_fee=0,
            status=1, use_count=96, favorite_count=32, rating_count=18, rating_avg=4.5,
            is_featured=True, usage_modes=["form"],
            cover_image="https://picsum.photos/seed/ecommerce1/600/400|https://picsum.photos/seed/ecommerce2/600/400|https://picsum.photos/seed/ecommerce3/600/400",
        ),
        Tool(
            id=uuid.UUID("20000001-0000-0000-0000-000000000003"),
            slug="product-description", name="AI商品文案生成器",
            description="输入商品关键词和卖点，AI自动生成多版本商品标题、卖点描述、详情文案，支持不同平台风格的适配。",
            short_desc="智能生成高转化商品文案",
            category_id=cat_copy, category="文案写作",
            tags=json.dumps(["文案", "电商", "营销", "标题"]),
            base_fee=5, image_fee=0, audio_fee=0, token_fee=0,
            status=1, use_count=200, favorite_count=60, rating_count=45, rating_avg=4.6,
            is_featured=True, usage_modes=["form"],
        ),
        Tool(
            id=uuid.UUID("20000001-0000-0000-0000-000000000004"),
            slug="image-enhance", name="AI图片高清修复",
            description="使用AI技术对低分辨率图片进行高清修复和增强，支持人像修复、老照片上色、图片放大等。",
            short_desc="AI智能修复和增强图片画质",
            category_id=cat_img, category="图片处理",
            tags=json.dumps(["图片", "修复", "高清", "增强"]),
            base_fee=3, image_fee=2, audio_fee=0, token_fee=0,
            status=1, use_count=320, favorite_count=88, rating_count=67, rating_avg=4.8,
        ),
        Tool(
            id=uuid.UUID("20000001-0000-0000-0000-000000000005"),
            slug="text-to-speech", name="AI语音合成器",
            description="将文本转换为自然流畅的语音，支持多种音色选择和语速调节，适用于配音、有声书、广告等场景。",
            short_desc="多音色AI语音合成",
            category_id=cat_audio, category="音频处理",
            tags=json.dumps(["语音", "配音", "合成", "有声"]),
            base_fee=2, image_fee=0, audio_fee=1, token_fee=1,
            status=1, use_count=450, favorite_count=120, rating_count=89, rating_avg=4.5,
        ),
    ]
    count = 0
    for tool in tools:
        existing = await db.execute(select(Tool).where(Tool.slug == tool.slug))
        if not existing.scalar_one_or_none():
            db.add(tool)
            count += 1
    await db.commit()
    print(f"  ✓ 已创建 {count} 个工具")


async def seed_demos(db: AsyncSession):
    """创建演示案例"""
    tool_storybook = uuid.UUID("20000001-0000-0000-0000-000000000001")
    tool_ecommerce = uuid.UUID("20000001-0000-0000-0000-000000000002")

    demos = [
        ToolDemo(
            tool_id=tool_storybook,
            title="森林小兔子的冒险",
            description="一个关于勇敢小兔子探索森林的温馨故事",
            demo_type="image", sort_order=1, is_active=True,
            input_params={"theme": "勇敢的小兔子", "style": "温馨卡通", "pages": 5},
        ),
        ToolDemo(
            tool_id=tool_storybook,
            title="太空探险记",
            description="小朋友探索太空的科幻冒险故事",
            demo_type="image", sort_order=2, is_active=True,
            input_params={"theme": "太空探险", "style": "科幻", "pages": 8},
        ),
        ToolDemo(
            tool_id=tool_ecommerce,
            title="护肤精华液详情页",
            description="高端护肤品牌精华液的完整详情页案例",
            demo_type="image", sort_order=1, is_active=True,
            input_params={"product": "精华液", "brand_style": "高端简约"},
        ),
        ToolDemo(
            tool_id=tool_ecommerce,
            title="智能手表详情页",
            description="科技感智能手表的产品详情页案例",
            demo_type="image", sort_order=2, is_active=True,
            input_params={"product": "智能手表", "brand_style": "科技感"},
        ),
    ]
    for demo in demos:
        db.add(demo)
    await db.commit()
    print(f"  ✓ 已创建 {len(demos)} 个演示案例")


async def seed_packages(db: AsyncSession):
    """创建充值套餐（PRD 3.5.2 标准档位）"""
    packages = [
        RechargePackage(
            name="入门档", description="适合初次体验",
            original_price=30.00, sale_price=30.00,
            base_points=300, bonus_points=20, bonus_percentage=0,
            is_popular=False, sort_order=1, is_active=True,
        ),
        RechargePackage(
            name="进阶档", description="日常使用推荐",
            original_price=100.00, sale_price=100.00,
            base_points=1000, bonus_points=100, bonus_percentage=10,
            is_popular=True, sort_order=2, is_active=True,
        ),
        RechargePackage(
            name="专业档", description="高频用户首选",
            original_price=300.00, sale_price=300.00,
            base_points=3000, bonus_points=400, bonus_percentage=13,
            is_popular=True, sort_order=3, is_active=True,
        ),
        RechargePackage(
            name="企业档", description="团队/企业使用",
            original_price=1000.00, sale_price=1000.00,
            base_points=10000, bonus_points=2000, bonus_percentage=20,
            is_popular=False, sort_order=4, is_active=True,
        ),
    ]
    created = 0
    for pkg in packages:
        existing = await db.execute(
            select(RechargePackage).where(RechargePackage.name == pkg.name)
        )
        if not existing.scalar_one_or_none():
            db.add(pkg)
            created += 1
    await db.commit()
    print(f"  ✓ 已创建 {created} 个充值套餐")


async def seed_ideas(db: AsyncSession):
    """创建示例构思工具"""
    import time
    now = int(time.time())
    # 使用固定 UUID 作为系统默认用户
    system_user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    ideas = [
        IdeaSubmission(
            user_id=system_user_id,
            title="AI简历优化助手",
            description="上传简历，AI根据目标岗位智能优化简历内容，一键生成专业排版简历。",
            category="文案写作",
            tags=json.dumps(["简历", "求职", "优化"]),
            vote_count=15, view_count=230, status="approved",
            created_at=now - 86400 * 3,
        ),
        IdeaSubmission(
            user_id=system_user_id,
            title="AI PPT生成器",
            description="输入主题，AI自动生成完整的PPT演示文稿，支持多种模板风格。",
            category="视频创作",
            tags=json.dumps(["PPT", "演示", "办公"]),
            vote_count=12, view_count=180, status="approved",
            created_at=now - 86400 * 5,
        ),
        IdeaSubmission(
            user_id=system_user_id,
            title="AI Logo设计师",
            description="输入品牌名称和行业，AI生成多种Logo设计方案，支持在线编辑调整。",
            category="图片处理",
            tags=json.dumps(["Logo", "设计", "品牌"]),
            vote_count=10, view_count=150, status="pending",
            created_at=now - 86400 * 2,
        ),
        IdeaSubmission(
            user_id=system_user_id,
            title="AI社交媒体内容工厂",
            description="一键生成适合各大社交平台的营销内容，支持图文、短视频脚本等多种格式。",
            category="内容创作", tags=json.dumps([]),
            vote_count=368, view_count=5200, status="approved",
            created_at=now - 86400 * 30,
        ),
        IdeaSubmission(
            user_id=system_user_id,
            title="AI智能合同审查助手",
            description="上传合同文档，AI自动识别风险条款、标注异常内容，生成审查报告。",
            category="办公效率", tags=json.dumps([]),
            vote_count=285, view_count=4300, status="approved",
            created_at=now - 86400 * 28,
        ),
        IdeaSubmission(
            user_id=system_user_id,
            title="AI儿童故事绘本生成",
            description="根据主题和年龄段自动生成图文并茂的儿童绘本，支持中英文双语。",
            category="内容创作", tags=json.dumps([]),
            vote_count=312, view_count=4800, status="approved",
            created_at=now - 86400 * 25,
        ),
        IdeaSubmission(
            user_id=system_user_id,
            title="AI产品摄影后期处理",
            description="自动去除背景、调色、添加水印、生成多尺寸适配图。",
            category="设计工具", tags=json.dumps([]),
            vote_count=198, view_count=3500, status="approved",
            created_at=now - 86400 * 22,
        ),
        IdeaSubmission(
            user_id=system_user_id,
            title="AI视频自动剪辑大师",
            description="AI自动识别精彩片段，添加字幕、转场特效和背景音乐，一键出片。",
            category="视频音频", tags=json.dumps([]),
            vote_count=420, view_count=6800, status="approved",
            created_at=now - 86400 * 20,
        ),
        IdeaSubmission(
            user_id=system_user_id,
            title="AI Logo智能设计工坊",
            description="输入品牌名称和行业，AI生成多种风格Logo方案，支持矢量格式导出。",
            category="设计工具", tags=json.dumps([]),
            vote_count=256, view_count=4100, status="approved",
            created_at=now - 86400 * 18,
        ),
        IdeaSubmission(
            user_id=system_user_id,
            title="AI论文摘要生成器",
            description="AI自动提取核心观点、研究方法、实验数据和结论，生成结构化摘要。",
            category="办公效率", tags=json.dumps([]),
            vote_count=178, view_count=2900, status="approved",
            created_at=now - 86400 * 15,
        ),
        IdeaSubmission(
            user_id=system_user_id,
            title="AI短视频口播文案生成",
            description="AI生成吸引人的口播脚本，支持多种人设和语气风格。",
            category="内容创作", tags=json.dumps([]),
            vote_count=345, view_count=5500, status="approved",
            created_at=now - 86400 * 12,
        ),
        IdeaSubmission(
            user_id=system_user_id,
            title="AI室内设计效果图生成",
            description="上传户型图或现场照片，AI生成多种风格的室内设计效果图。",
            category="设计工具", tags=json.dumps([]),
            vote_count=220, view_count=3800, status="approved",
            created_at=now - 86400 * 10,
        ),
        IdeaSubmission(
            user_id=system_user_id,
            title="AI声音克隆与配音",
            description="上传30秒语音样本，AI克隆声音后可用于配音。",
            category="视频音频", tags=json.dumps([]),
            vote_count=156, view_count=2600, status="approved",
            created_at=now - 86400 * 8,
        ),
        IdeaSubmission(
            user_id=system_user_id,
            title="AI周报/月报自动生成",
            description="根据工作日志和项目进度，AI自动生成结构化的周报/月报。",
            category="办公效率", tags=json.dumps([]),
            vote_count=132, view_count=2100, status="approved",
            created_at=now - 86400 * 7,
        ),
        IdeaSubmission(
            user_id=system_user_id,
            title="AI表情包生成器",
            description="输入文字或上传图片，AI自动生成个性化表情包。",
            category="设计工具", tags=json.dumps([]),
            vote_count=98, view_count=1800, status="approved",
            created_at=now - 86400 * 6,
        ),
        IdeaSubmission(
            user_id=system_user_id,
            title="AI会议纪要智能整理",
            description="上传会议录音或文字记录，AI自动提取议题、决议和待办事项。",
            category="办公效率", tags=json.dumps([]),
            vote_count=275, view_count=4200, status="approved",
            created_at=now - 86400 * 5,
        ),
        IdeaSubmission(
            user_id=system_user_id,
            title="AI商品短视频生成",
            description="输入商品链接或图片，AI自动生成商品展示短视频。",
            category="视频音频", tags=json.dumps([]),
            vote_count=190, view_count=3100, status="approved",
            created_at=now - 86400 * 4,
        ),
        IdeaSubmission(
            user_id=system_user_id,
            title="AI简历优化与面试模拟",
            description="上传简历PDF，AI诊断问题并优化，提供模拟面试功能。",
            category="办公效率", tags=json.dumps([]),
            vote_count=160, view_count=2400, status="approved",
            created_at=now - 86400 * 3,
        ),
    ]
    for idea in ideas:
        existing = await db.execute(
            select(IdeaSubmission).where(IdeaSubmission.title == idea.title)
        )
        if not existing.scalar_one_or_none():
            db.add(idea)
    await db.commit()
    print(f"  ✓ 已创建 {len(ideas)} 个构思示例")


async def seed_admin_role(db: AsyncSession):
    """创建管理员角色并分配给系统用户"""
    # 检查管理员角色是否存在
    result = await db.execute(
        select(Role).where(Role.name == "admin")
    )
    admin_role = result.scalar_one_or_none()
    if not admin_role:
        admin_role = Role(
            id=uuid.UUID("00000000-0000-0000-0000-000000000010"),
            name="admin",
            description="系统管理员",
            permissions=json.dumps(["*"]),
        )
        db.add(admin_role)
        await db.flush()
        print("  ✓ 已创建管理员角色")
    else:
        print("  ✓ 管理员角色已存在")

    # 确保系统用户有 admin 角色（直接操作关联表）
    result = await db.execute(
        select(user_roles).where(
            user_roles.c.user_id == uuid.UUID("00000000-0000-0000-0000-000000000001"),
            user_roles.c.role_id == admin_role.id,
        )
    )
    if not result.one_or_none():
        await db.execute(
            insert(user_roles).values(
                user_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
                role_id=admin_role.id,
            )
        )
        await db.commit()
        print("  ✓ 已为系统用户分配管理员角色")
    else:
        print("  ✓ 系统用户已有管理员角色")


async def main():
    print("\n🌱 开始初始化种子数据...\n")
    async with AsyncSessionLocal() as db:
        await seed_users(db)
        await seed_admin_role(db)
        await seed_categories(db)
        await seed_tools(db)
        await seed_demos(db)
        await seed_ideas(db)
        await seed_packages(db)
    print("\n✅ 种子数据初始化完成！\n")


if __name__ == "__main__":
    asyncio.run(main())
