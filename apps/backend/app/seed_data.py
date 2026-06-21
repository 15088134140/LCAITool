"""
种子数据脚本

运行方式: cd apps/backend && python -m app.seed_data
"""
import asyncio
import json
import uuid

from sqlalchemy import select, insert, and_
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
            phone="15088134140",
            password_hash=get_password_hash("123456"),
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
    cat_video = uuid.UUID("10000001-0000-0000-0000-000000000006")

    tools = [
        Tool(
            id=uuid.UUID("20000001-0000-0000-0000-000000000001"),
            slug="storybook-generator", name="AI有声绘本生成专家",
            description="输入主题，AI自动生成完整的有声绘本。包括故事创作、插画生成、语音合成、PDF排版打包，一站式完成从创意到可交付绘本的全流程。",
            short_desc="一键生成带插画和配音的精美有声绘本",
            category_id=cat_story, category="故事创作",
            tags=json.dumps(["绘本", "故事", "儿童", "插画", "语音"]),
            base_fee=20, image_fee=2, audio_fee=3, token_fee=0,
            status=1, use_count=128, favorite_count=45, rating_count=32, rating_avg=4.7,
            is_featured=True, usage_modes=["form"],
            executor_key="storybook-generator",
            pricing_schema=json.dumps({
                "version": 1, "currency": "credits", "rounding": "ceil",
                "items": [
                    {"key": "base", "type": "fixed", "label": "绘本生成基础费", "amount_ref": "base_fee"},
                    {"key": "page_images", "type": "per_unit", "label": "插画生成费",
                     "field": "page_count", "unit_amount_ref": "image_fee",
                     "default_quantity": 1, "min_quantity": 1, "max_quantity": 30},
                    {"key": "page_audio", "type": "per_unit", "label": "语音合成费",
                     "field": "page_count", "unit_amount_ref": "audio_fee",
                     "default_quantity": 1, "min_quantity": 1, "max_quantity": 30,
                     "when": {"field": "voiceType", "operator": "ne", "value": "none"}}
                ],
                "display": {"show_breakdown": True, "total_label": "预计消耗", "unit_label": "积分"}
            }),
            param_schema=json.dumps([
                {"key": "_section_basic", "type": "section", "label": "基础信息", "order": 1},
                {"key": "inputMode", "label": "创作方式", "type": "radio", "required": True, "defaultValue": "theme", "uiHint": "card",
                 "options": [
                     {"label": "主题创作", "value": "theme", "icon": "📝", "desc": "输入关键词，AI 自动创作故事"},
                     {"label": "文案改编", "value": "storyContent", "icon": "📖", "desc": "粘贴已有文案，AI 提炼为绘本"}
                 ], "order": 2},
                {"key": "theme", "label": "绘本主题", "type": "text", "required": True, "placeholder": "例如：小兔子的森林冒险", "defaultValue": "小蝌蚪找妈妈", "order": 3,
                 "condition": {"when": {"field": "inputMode", "operator": "eq", "value": "theme"}, "effect": "show"}},
                {"key": "storyContent", "label": "故事文案", "type": "textarea", "required": True, "placeholder": "粘贴您已有的故事文案，AI 将提炼为绘本故事大纲...", "order": 4,
                 "condition": {"when": {"field": "inputMode", "operator": "eq", "value": "storyContent"}, "effect": "show"}},
                {"key": "_section_style", "type": "section", "label": "风格设置", "order": 10},
                {"key": "art_style", "label": "艺术风格", "type": "radio", "required": True, "defaultValue": "cartoon", "uiHint": "card", "allowCustom": True,
                 "options": [
                     {"label": "卡通水彩", "value": "cartoon", "icon": "🎨"},
                     {"label": "梦幻油画", "value": "oil", "icon": "🖼️"},
                     {"label": "日系动漫", "value": "watercolor", "icon": "🌸"},
                     {"label": "扁平插画", "value": "flat", "icon": "💎"}
                 ], "order": 11},
                {"key": "target_age", "label": "目标年龄段", "type": "select", "required": True, "defaultValue": "3-6",
                 "options": [
                     {"label": "3-6岁", "value": "3-6"},
                     {"label": "6-9岁", "value": "6-9"},
                     {"label": "9-12岁", "value": "9-12"}
                 ], "order": 12},
                {"key": "smart_page_count", "label": "智能决策页数", "type": "boolean", "defaultValue": False, "order": 13},
                {"key": "page_count", "label": "绘本页数", "type": "number", "required": False, "min": 1, "max": 30, "defaultValue": 1, "order": 14,
                 "condition": {"when": {"field": "smart_page_count", "operator": "eq", "value": False}, "effect": "enable"}},
                {"key": "_section_audio", "type": "section", "label": "音频设置", "order": 20},
                {"key": "voiceType", "label": "配音音色", "type": "radio", "required": False, "defaultValue": "tongtong", "uiHint": "card",
                 "options": [
                     {"label": "温柔女声", "value": "tongtong", "icon": "👩"},
                     {"label": "磁性男声", "value": "xiaochen", "icon": "👨"},
                     {"label": "可爱童声", "value": "chuichui", "icon": "👧"},
                     {"label": "故事主播", "value": "luodo", "icon": "🧙"},
                     {"label": "不需要", "value": "none", "icon": "🚫"}
                 ], "order": 21},
                {"key": "hasBackgroundMusic", "label": "添加背景音乐", "type": "boolean", "defaultValue": False, "order": 22},
                {"key": "hasSoundEffects", "label": "添加音效", "type": "boolean", "defaultValue": False, "order": 23},
            ]),
        ),
        Tool(
            id=uuid.UUID("20000001-0000-0000-0000-000000000002"),
            slug="ecommerce-detail", name="AI电商商品详情页生成器",
            description="输入商品信息，AI自动生成专业的电商详情页。包括商品主图、详情页分段图片、营销文案、PSD源文件，提升商品转化率。",
            short_desc="智能生成专业级电商详情页",
            category_id=cat_eco, category="电商工具",
            tags=json.dumps(["电商", "详情页", "营销", "主图"]),
            base_fee=12, image_fee=1, audio_fee=1, token_fee=0,
            status=1, use_count=96, favorite_count=32, rating_count=18, rating_avg=4.5,
            is_featured=True, usage_modes=["form"],
            cover_image="https://picsum.photos/seed/ecommerce1/600/400|https://picsum.photos/seed/ecommerce2/600/400|https://picsum.photos/seed/ecommerce3/600/400",
            executor_key="ecommerce-detail",
            pricing_schema=json.dumps({
                "version": 1, "currency": "credits", "rounding": "ceil",
                "items": [
                    {"key": "base", "type": "fixed", "label": "电商详情页基础费", "amount_ref": "base_fee"},
                    {"key": "main_images", "type": "per_unit", "label": "主图生成费",
                     "field": "mainImageCount", "unit_amount_ref": "image_fee",
                     "default_quantity": 3, "min_quantity": 1, "max_quantity": 5},
                    {"key": "detail_images", "type": "per_unit", "label": "详情图生成费",
                     "field": "detailImageCount", "unit_amount_ref": "image_fee",
                     "default_quantity": 3, "min_quantity": 2, "max_quantity": 10}
                ],
                "display": {"show_breakdown": True, "total_label": "预计消耗", "unit_label": "积分"}
            }),
            param_schema=json.dumps([
                {"key": "_section_basic", "type": "section", "label": "商品信息", "order": 1},
                {"key": "productName", "label": "商品名称", "type": "text", "required": True, "placeholder": "请输入商品名称", "order": 2},
                {"key": "productCategory", "label": "商品类目", "type": "select", "required": False,
                 "options": [
                     {"label": "电子产品", "value": "electronics"},
                     {"label": "时尚服饰", "value": "fashion"},
                     {"label": "美妆护肤", "value": "beauty"},
                     {"label": "食品饮料", "value": "food"},
                     {"label": "家居生活", "value": "home"},
                     {"label": "其他", "value": "other"}
                 ], "order": 3},
                {"key": "productFeatures", "label": "核心卖点", "type": "textarea", "required": True, "placeholder": "请输入商品的核心卖点和特色", "order": 4},
                {"key": "targetAudience", "label": "目标人群", "type": "text", "placeholder": "例如：25-35岁都市白领女性", "order": 5},
                {"key": "_section_style", "type": "section", "label": "风格与数量", "order": 10},
                {"key": "imageStyle", "label": "视觉风格", "type": "radio", "required": True, "defaultValue": "professional", "uiHint": "card",
                 "options": [
                     {"label": "专业商务", "value": "professional", "icon": "💼"},
                     {"label": "简约清新", "value": "minimal", "icon": "🌿"},
                     {"label": "生活方式", "value": "lifestyle", "icon": "📸"},
                     {"label": "科技感", "value": "tech", "icon": "⚡"}
                 ], "order": 11},
                {"key": "mainImageCount", "label": "主图数量", "type": "range", "required": False, "defaultValue": 3, "min": 1, "max": 5, "order": 12},
                {"key": "detailImageCount", "label": "详情图数量", "type": "range", "required": False, "defaultValue": 3, "min": 2, "max": 10, "order": 13},
                {"key": "includePsd", "label": "导出PSD源文件", "type": "boolean", "defaultValue": True, "order": 14},
            ]),
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
            executor_key="product-description",
            pricing_schema=json.dumps({
                "version": 1, "currency": "credits", "rounding": "ceil",
                "items": [
                    {"key": "base", "type": "fixed", "label": "营销文案基础费", "amount_ref": "base_fee"}
                ],
                "display": {"show_breakdown": True, "total_label": "预计消耗", "unit_label": "积分"}
            }),
            param_schema=json.dumps([
                {"key": "_section_basic", "type": "section", "label": "基本信息", "order": 1},
                {"key": "productOrBrand", "label": "产品/品牌名称", "type": "text", "required": True, "placeholder": "请输入产品名称或品牌", "order": 2},
                {"key": "keySellingPoints", "label": "核心卖点", "type": "textarea", "required": True, "placeholder": "请输入产品的核心卖点和优势", "order": 3},
                {"key": "_section_style", "type": "section", "label": "风格设置", "order": 10},
                {"key": "targetPlatform", "label": "目标平台", "type": "select", "required": False, "defaultValue": "all",
                 "options": [
                     {"label": "全平台", "value": "all"},
                     {"label": "小红书", "value": "xiaohongshu"},
                     {"label": "微信", "value": "wechat"},
                     {"label": "抖音", "value": "douyin"},
                     {"label": "微博", "value": "weibo"}
                 ], "order": 11},
                {"key": "toneStyle", "label": "文案风格", "type": "radio", "required": True, "defaultValue": "professional", "uiHint": "card",
                 "options": [
                     {"label": "专业正式", "value": "professional", "icon": "💼"},
                     {"label": "亲切友好", "value": "friendly", "icon": "😊"},
                     {"label": "幽默风趣", "value": "humorous", "icon": "😄"},
                     {"label": "高端奢华", "value": "luxury", "icon": "💎"}
                 ], "order": 12},
                {"key": "copyLength", "label": "文案长度", "type": "select", "required": False, "defaultValue": "medium",
                 "options": [
                     {"label": "短文案", "value": "short"},
                     {"label": "中等长度", "value": "medium"},
                     {"label": "长文案", "value": "long"}
                 ], "order": 13},
                {"key": "platformCount", "label": "生成平台数量", "type": "hidden", "defaultValue": 3, "order": 14},
            ]),
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
            is_featured=False,
            param_schema=json.dumps([
                {"key": "enhance_type", "label": "修复类型", "type": "text", "order": 1},
                {"key": "scale_factor", "label": "放大倍数", "type": "number", "order": 2},
            ]),
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
            is_featured=False,
            param_schema=json.dumps([
                {"key": "text", "label": "文本内容", "type": "textarea", "order": 1},
                {"key": "voice_type", "label": "音色", "type": "text", "order": 2},
                {"key": "speed", "label": "语速", "type": "number", "order": 3},
                {"key": "pitch", "label": "音调", "type": "number", "order": 4},
            ]),
        ),
        Tool(
            id=uuid.UUID("20000001-0000-0000-0000-000000000006"),
            slug="creative-video-generator", name="创意视频生成器",
            description="基于 Doubao Seedance 1.5 Pro 生成创意视频，支持文生视频、首帧参考图、首尾帧参考图、智能比例、智能时长和同步音频输出。",
            short_desc="用提示词和首尾帧参考图生成有声创意视频",
            category_id=cat_video, category="视频创作",
            tags=json.dumps(["视频", "Seedance", "首尾帧", "有声视频", "创意生成"]),
            base_fee=10, image_fee=0, audio_fee=0, token_fee=0,
            status=1, use_count=0, favorite_count=0, rating_count=0, rating_avg=0.0,
            is_featured=True, usage_modes=["form"],
            executor_key="creative-video-generator",
            pricing_schema=json.dumps({
                "version": 1, "currency": "credits", "rounding": "ceil",
                "items": [
                    {"key": "base", "type": "fixed", "label": "创意视频生成基础费", "amount_ref": "base_fee"}
                ],
                "display": {"show_breakdown": True, "total_label": "预计消耗", "unit_label": "积分"}
            }),
            param_schema=json.dumps([
                {"key": "_section_media", "type": "section", "label": "参考素材", "order": 1},
                {"key": "first_frame", "label": "首帧参考图", "type": "file", "accept": "image/*", "required": False, "order": 2},
                {"key": "last_frame", "label": "尾帧参考图", "type": "file", "accept": "image/*", "required": False, "order": 3},
                {"key": "prompt", "label": "创意描述", "type": "textarea", "placeholder": "结合图片，输入创意描述（文生视频必填）", "required": False, "order": 4},
                {"key": "_section_video", "type": "section", "label": "视频参数", "order": 10},
                {"key": "ratio", "label": "视频比例", "type": "radio", "defaultValue": "adaptive", "uiHint": "compact-card", "options": [
                    {"label": "21:9", "value": "21:9"}, {"label": "16:9", "value": "16:9"},
                    {"label": "4:3", "value": "4:3"}, {"label": "1:1", "value": "1:1"},
                    {"label": "3:4", "value": "3:4"}, {"label": "9:16", "value": "9:16"},
                    {"label": "智能", "value": "adaptive"}
                ], "order": 11},
                {"key": "resolution", "label": "分辨率", "type": "radio", "defaultValue": "480p", "uiHint": "segmented", "options": [
                    {"label": "480p", "value": "480p"}, {"label": "720p", "value": "720p"}, {"label": "1080p", "value": "1080p"}
                ], "order": 12},
                {"key": "duration_mode", "label": "视频时长", "type": "radio", "defaultValue": "seconds", "uiHint": "segmented", "options": [
                    {"label": "按秒数", "value": "seconds"}, {"label": "智能时长", "value": "smart"}
                ], "order": 13},
                {"key": "duration", "label": "秒数", "type": "range", "min": 4, "max": 12, "defaultValue": 6, "order": 14},
                {"key": "quantity", "label": "选择生成数量", "type": "range", "min": 1, "max": 1, "defaultValue": 1, "helpText": "多条生成即将上线", "order": 15},
                {"key": "generate_audio", "label": "输出声音", "type": "boolean", "defaultValue": True, "order": 16},
                {"key": "sample_preview", "label": "样片速览", "type": "action", "action": "open_demo_preview", "order": 17}
            ]),
        ),
    ]
    count = 0
    for tool in tools:
        existing = await db.execute(select(Tool).where(Tool.slug == tool.slug))
        existing_tool = existing.scalar_one_or_none()
        if not existing_tool:
            db.add(tool)
            count += 1
        else:
            # 更新已有的工具定价
            existing_tool.base_fee = tool.base_fee
            existing_tool.image_fee = tool.image_fee
            existing_tool.audio_fee = tool.audio_fee
            existing_tool.token_fee = tool.token_fee
            existing_tool.name = tool.name
            existing_tool.description = tool.description
            existing_tool.short_desc = tool.short_desc
            existing_tool.tags = tool.tags
            existing_tool.status = tool.status
            existing_tool.is_featured = tool.is_featured
            existing_tool.usage_modes = tool.usage_modes
            existing_tool.cover_image = tool.cover_image
            existing_tool.param_schema = tool.param_schema
            existing_tool.executor_key = tool.executor_key
            existing_tool.pricing_schema = tool.pricing_schema
            count += 1
    await db.commit()
    print(f"  ✓ 已同步 {count} 个工具")


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
            input_params={"theme": "勇敢的小兔子", "style": "温馨卡通", "page_count": 5, "target_age": "3-6岁", "language": "中文", "prompt": "一只勇敢的小兔子在森林里探险，遇到了各种有趣的动物朋友"},
        ),
        ToolDemo(
            tool_id=tool_storybook,
            title="太空探险记",
            description="小朋友探索太空的科幻冒险故事",
            demo_type="image", sort_order=2, is_active=True,
            input_params={"theme": "太空探险", "style": "科幻", "page_count": 8, "target_age": "6-12岁", "language": "中文", "prompt": "小朋友乘坐宇宙飞船探索太空，发现神秘星球的故事"},
        ),
        ToolDemo(
            tool_id=tool_ecommerce,
            title="护肤精华液详情页",
            description="高端护肤品牌精华液的完整详情页案例",
            demo_type="image", sort_order=1, is_active=True,
            input_params={"product_name": "修护精华液", "product_features": "深层保湿、修复屏障、淡化细纹", "brand_style": "高端简约", "target_audience": "25-40岁轻熟女性", "image_count": 6},
        ),
        ToolDemo(
            tool_id=tool_ecommerce,
            title="智能手表详情页",
            description="科技感智能手表的产品详情页案例",
            demo_type="image", sort_order=2, is_active=True,
            input_params={"product_name": "智能运动手表Pro", "product_features": "心率监测、GPS定位、防水50米、续航14天", "brand_style": "科技感", "target_audience": "运动爱好者、商务人士", "image_count": 8},
        ),
    ]
    for demo in demos:
        db.add(demo)
    await db.commit()
    print(f"  ✓ 已创建 {len(demos)} 个演示案例")


async def seed_packages(db: AsyncSession):
    """创建充值套餐（PRD 3.5.2 标准档位）"""
    # 先停用旧的套餐（按名称匹配旧档位名）
    old_names = ["体验包", "基础包", "进阶包", "专业包", "旗舰包"]
    for old_name in old_names:
        result = await db.execute(
            select(RechargePackage).where(
                and_(RechargePackage.name == old_name, RechargePackage.is_active == True)
            )
        )
        old_pkg = result.scalar_one_or_none()
        if old_pkg:
            old_pkg.is_active = False
            print(f"  ⏹️  停用旧套餐: {old_name}")

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


async def seed_ai_providers(db: AsyncSession):
    """配置 AI 提供商信息（幂等更新，保留已有密钥）。"""
    from app.models.system import AiProvider

    provider_defaults = [
        {
            "slug": "volcano",
            "name": "火山方舟(豆包)",
            "provider_type": "volcano",
            "sort_order": 1,
            "config": {
                "base_url": "https://ark.cn-beijing.volces.com/api/v3",
                "model": "doubao-seed-2-0-lite-260428",
                "image_model": "doubao-seedream-4-5-251128",
                "image_size": "1920x1920",
                "video_model": "doubao-seedance-1-5-pro-251215",
            },
        },
        {
            "slug": "zhipu",
            "name": "智谱AI",
            "provider_type": "openai",
            "sort_order": 2,
            "config": {
                "base_url": "https://open.bigmodel.cn/api/paas/v4",
                "model": "GLM-4-Flash",
                "image_model": "glm-image",
                "audio_model": "glm-tts",
            },
        },
        {
            "slug": "deepseek",
            "name": "DeepSeek",
            "provider_type": "openai",
            "sort_order": 3,
            "config": {
                "base_url": "https://api.deepseek.com/v1",
                "model": "deepseek-chat",
            },
        },
        {
            "slug": "dify",
            "name": "Dify",
            "provider_type": "dify",
            "sort_order": 4,
            "config": {
                "base_url": "https://api.dify.ai/v1",
                "workflow_id": "",
            },
        },
    ]

    created = 0
    updated = 0
    for item in provider_defaults:
        result = await db.execute(select(AiProvider).where(AiProvider.slug == item["slug"]))
        provider = result.scalar_one_or_none()
        if provider:
            changed = False
            for field in ("name", "provider_type", "sort_order"):
                if getattr(provider, field) != item[field]:
                    setattr(provider, field, item[field])
                    changed = True
            config = dict(provider.config or {})
            for key, value in item["config"].items():
                if key not in config or config.get(key) is None:
                    config[key] = value
                    changed = True
            if changed:
                provider.config = config
                updated += 1
            continue

        db.add(AiProvider(
            slug=item["slug"],
            name=item["name"],
            provider_type=item["provider_type"],
            config=item["config"],
            is_active=True,
            sort_order=item["sort_order"],
        ))
        created += 1

    await db.commit()
    print(f"  ✓ 已创建 {created} 个、更新 {updated} 个 AI 提供商配置")


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
        await seed_ai_providers(db)
    print("\n✅ 种子数据初始化完成！\n")


if __name__ == "__main__":
    asyncio.run(main())
