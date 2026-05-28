"""
有声绘本 HTML 生成 Prompt 模板

在 StorybookExecutor Step 5 中调用 LLM 生成精美绘本 HTML 时使用。
LLM 负责生成 HTML 的 结构 / CSS / JS（即"阅读器壳"），
图片和音频使用占位符，Python 后续替换为真实服务器 URL。

使用方式：
    from app.prompts.storybook_html import build_html_generation_prompt

    system_prompt, user_prompt = build_html_generation_prompt(outline, pages)
    response = await deepseek_provider.generate_text(
        prompt=user_prompt,
        system_prompt=system_prompt,
        thinking=True              # thinking 模式生成更高质量的 HTML
    )
    # response.content 即完整 HTML，占位符后续由 _inject_asset_urls() 替换
"""

import json
from typing import Dict, Any, List, Tuple


def _placeholder_tag(page_num: int, asset_type: str) -> str:
    """
    生成占位符标签，后续由 Python 替换为真实服务器 URL

    Args:
        page_num: 页码（从 1 开始）
        asset_type: "image" 或 "audio"

    Returns:
        占位符字符串，如 "__PAGE_1_IMAGE__"
    """
    return f"__PAGE_{page_num}_{asset_type.upper()}__"


def build_html_generation_prompt(
    outline: Dict[str, Any],
    pages: List[Dict[str, Any]],
) -> Tuple[str, str]:
    """
    构建用于 LLM 生成绘本 HTML 的 system_prompt 和 user_prompt

    Args:
        outline: 故事大纲，包含 title, story 等
        pages: 页面列表，每页含 text_snippet, image_url, audio_url, title, page_number 等

    Returns:
        (system_prompt, user_prompt) 可直接传给 AIProvider.generate_text()
    """
    system_prompt = _build_system_prompt()
    user_prompt = _build_user_prompt(outline, pages)
    return system_prompt, user_prompt


def build_placeholder_map(pages: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    构建占位符 → 最终 URL 的映射表，供 Python 后处理替换使用。

    调用方在获得所有 WorkFile ID 后，用实际 URL 填充此映射，
    然后对 HTML 做 string replace。

    Returns:
        {占位符: "描述信息"} 的字典，等待调用方填充 URL
    """
    mapping = {}
    for i, page in enumerate(pages):
        pn = page.get("page_number", i + 1)
        mapping[_placeholder_tag(pn, "image")] = ""
        if page.get("audio_url"):
            mapping[_placeholder_tag(pn, "audio")] = ""
    return mapping


def inject_asset_urls(
    html: str,
    asset_map: Dict[str, str],
) -> str:
    """
    将 HTML 中的占位符替换为真实服务器 URL（完整绝对路径）

    替换后的 URL 格式为 `{PUBLIC_URL}/api/v1/files/works/{uuid}`，确保 HTML
    下载到本地用 file:/// 打开时图片和音频仍能通过公网地址加载。

    Args:
        html: LLM 生成的原始 HTML（含 __PAGE_N_IMAGE__ 等占位符）
        asset_map: 占位符 → 完整 URL 的映射
                    如 {"__PAGE_1_IMAGE__": "http://localhost:8000/api/v1/files/works/{uuid}"}

    Returns:
        替换后的 HTML
    """
    for placeholder, url in asset_map.items():
        html = html.replace(placeholder, url)
    return html


def _build_system_prompt() -> str:
    """构建 System Prompt：设计规范 + 约束规则"""
    return """你是一位顶级的 Web 前端开发者，专精于儿童绘本交互设计。
请根据用户提供的绘本数据，生成一个完整的、可直接在浏览器中打开的 HTML 文件。

## 设计规范

### 整体风格
- **风格**: Soft & Playful（柔和玩趣），暖色调，圆角，柔和阴影
- **氛围**: 温暖、亲切、安全、充满想象力
- **目标用户**: 3-8 岁儿童（亲子共读）和 8-12 岁（自主阅读）

### 色彩系统
- 页面底色: #FFF8F0（暖白，模仿绘本纸张）
- 文字色: #2D3436（深灰，非纯黑，温和不刺眼）
- 半透明文字背景: rgba(45, 52, 54, 0.45) 或 rgba(255, 255, 255, 0.85)
- 主按钮色: #FF6B6B（珊瑚橙）
- 辅助色: #4ECDC4（薄荷绿）、#FFE66D（暖阳黄）、#6CB4EE（天空蓝）
- 封面背景: 根据故事主题选择暖色渐变
- 翻页阴影: box-shadow: -5px 0 25px rgba(0,0,0,0.15)

### 字体
- Google Fonts: Quicksand (西文) + Noto Sans SC (中文)
- 字号: 封面标题 clamp(2rem, 5vw, 3.5rem) | 正文 clamp(1.1rem, 2.2vw, 1.5rem)
- 正文行距: 1.8，宽松舒适

### 布局：翻页绘本（Flipbook）
- **封面页**: 大标题 + 装饰元素（纯 CSS/SVG 实现）+ "开始阅读"按钮
- **正文页**: 全屏插图背景 (object-fit: cover) + 底部半透明文字卡片 + 音频播放按钮
- **封底页**: "故事讲完啦" + "重新阅读"按钮
- **导航**: 左右翻页按钮（桌面端）+ 页码指示器（当前页/总页数）
- **适配**: 桌面居中（最大宽 800px），平板/手机全屏

### 交互
- 点击左半屏/← 上一页，点击右半屏/→/Space 下一页
- 触控设备: 左右滑动翻页
- 翻页动画: CSS 3D transform，0.4s cubic-bezier(0.4, 0, 0.2, 1)
- 音频: 点击小喇叭播放当前页配音，翻页自动停止前页音频
- 所有可点击元素: cursor: pointer，悬停放大 1.05x
- 触控目标 ≥ 48px
- 尊重 prefers-reduced-motion

### 反模式（严格禁止）
1. ❌ 暗色模式 — 始终保持暖白/浅色底
2. ❌ 霓虹/荧光色 — 只用指定暖色调
3. ❌ emoji 替代图标 — 使用内联 SVG 图标（翻页箭头、喇叭、星星装饰等）
4. ❌ 纯黑色 #000 文字 — 使用 #2D3436
5. ❌ 复杂/晕眩动效 — 只用平滑过渡
6. ❌ 小于 14px 的字
7. ❌ 自动播放音频（未经首次交互授权） — 首次点击后激活音频上下文
8. ❌ 密集文字 — 短段落、宽松行距
9. ❌ 外部依赖（除 Google Fonts） — 不引用 CDN、外部库、框架

### 图片和音频引用规则（非常重要）
- 图片 src 使用占位符: `__PAGE_N_IMAGE__` （N 为页码，从 1 开始）
- 音频 src 使用占位符: `__PAGE_N_AUDIO__` （N 为页码，从 1 开始）
- 示例: <img src="__PAGE_1_IMAGE__" alt="第1页插图">
- 示例: <audio src="__PAGE_1_AUDIO__"></audio>
- 无音频的页面：不显示音频按钮，也不放 audio 占位符
- 背景图片也使用占位符: style="background-image: url('__PAGE_1_IMAGE__')"

### 技术约束
1. 单文件 HTML，所有 CSS/JS 内嵌
2. 纯 HTML + CSS + Vanilla JS，零外部依赖（除 Google Fonts）
3. Google Fonts 使用 @import，加载失败时回退系统字体
4. 图片使用 <img> 标签或 CSS background-image + object-fit: cover
5. UTF-8 编码，含 viewport meta
6. 输出仅为 <!DOCTYPE html> 开头的完整 HTML
7. 不要用 ```html 包裹，不要加任何说明文字

### 质量检查清单（输出前逐项核对）
- [ ] 封面标题正确显示
- [ ] 所有图片使用 __PAGE_N_IMAGE__ 占位符
- [ ] 有音频的页使用 __PAGE_N_AUDIO__ 占位符
- [ ] 翻页动画平滑
- [ ] 音频可播放，翻页停止前页音频
- [ ] 页码指示器正确（含封面封底）
- [ ] 封底有"重新阅读"按钮
- [ ] 触控滑动翻页
- [ ] 键盘 ← → 翻页
- [ ] 响应式：桌面居中、移动全屏
- [ ] 无 emoji 图标、无外部依赖
"""


def _build_user_prompt(outline: Dict[str, Any], pages: List[Dict[str, Any]]) -> str:
    """构建 User Prompt：绘本具体数据"""
    title = outline.get("title", "有声绘本")
    story_summary = outline.get("story", outline.get("synopsis", ""))

    # 构建页面数据
    page_data = []
    for i, page in enumerate(pages):
        pn = page.get("page_number", i + 1)
        page_data.append({
            "page_number": pn,
            "title": page.get("title", f"第{pn}页"),
            "text_snippet": page.get("text_snippet", page.get("text", "")),
            "description": page.get("description", ""),
            "image_placeholder": _placeholder_tag(pn, "image"),
            "has_audio": bool(page.get("audio_url")),
            "audio_placeholder": _placeholder_tag(pn, "audio") if page.get("audio_url") else "",
        })

    sections = []
    sections.append("请根据以下绘本数据，生成一个完整的 HTML 文件。\n")

    # 故事信息
    sections.append("## 故事信息")
    sections.append(f"标题：{title}")
    if story_summary:
        sections.append(f"故事梗概：{story_summary.strip()[:200]}")
    sections.append("")

    # 页面数据（JSON 格式）
    sections.append("## 页面数据")
    sections.append("```json")
    sections.append(json.dumps({
        "title": title,
        "total_pages": len(page_data),
        "pages": page_data,
    }, ensure_ascii=False, indent=2))
    sections.append("```")
    sections.append("")

    # 生成要点
    sections.append("## 生成要点提醒")
    sections.append("1. 图片使用占位符: __PAGE_N_IMAGE__ — 直接放在 <img src='...'> 或 background-image: url('...') 中")
    sections.append("2. 音频使用占位符: __PAGE_N_AUDIO__ — 直接放在 <audio src='...'> 或 <source src='...'> 中")
    sections.append("3. 无音频的页不显示音频按钮，不放 audio 元素")
    sections.append("4. 有音频的页显示小喇叭 SVG 按钮，点击播放")
    sections.append("5. 封面页要有装饰性设计（纯 CSS/SVG 几何装饰，不用图片）")
    sections.append("6. 封底页显示「故事讲完啦，谢谢聆听」和「重新阅读」按钮")
    sections.append("7. 页码指示器格式: \"2/14\"（封面=1，正文页，封底=总页数+2）")
    sections.append("8. 输出的 HTML 以 <!DOCTYPE html> 开头，不要 ```html 包裹，不要额外说明")
    sections.append("")

    # JS 翻页逻辑
    sections.append("## JavaScript 翻页逻辑框架")
    sections.append("以下是一个参考框架，请完善并直接使用：")
    sections.append("""
const state = {
    currentPage: 0,
    totalPages: N  // N = pages.length + 2 (封面+封底)
};

function goToPage(index) {
    if (index < 0 || index >= state.totalPages) return;
    state.currentPage = index;
    // 切换 .page 的 active 状态
    document.querySelectorAll('.page').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });
    // 更新页码指示器
    document.getElementById('pageIndicator').textContent =
        (index + 1) + '/' + state.totalPages;
    // 停止当前音频
    // 如果目标页有音频，播放
}

// 页面点击翻页（左右半屏）
document.getElementById('app').addEventListener('click', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX < rect.left + rect.width / 2)
        goToPage(state.currentPage - 1);
    else
        goToPage(state.currentPage + 1);
});

// 键盘翻页
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goToPage(state.currentPage - 1);
    if (e.key === 'ArrowRight' || e.key === ' ')
        goToPage(state.currentPage + 1);
});

// 触控滑动
let touchStartX = 0;
document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
});
document.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
        diff > 0 ? goToPage(state.currentPage + 1)
                 : goToPage(state.currentPage - 1);
    }
});""")

    return "\n".join(sections)
