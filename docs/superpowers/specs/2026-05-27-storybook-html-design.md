# 有声绘本 HTML 版设计规范

> 基于 UI-UX-Pro-Max 设计系统提取，面向"儿童教育 / 绘本阅读"领域
> 版本：v1.0 | 日期：2026-05-27

---

## 1. 领域分析

| 维度 | 分析结果 |
|------|---------|
| **产品类型** | 儿童有声绘本 (Children's Picture Book with Audio) |
| **目标用户** | 3-8 岁儿童（亲子共读），或 8-12 岁（自主阅读） |
| **使用场景** | 浏览器全屏阅读，iPad/平板触控，桌面端键盘+鼠标 |
| **核心体验** | 沉浸式翻页阅读 + 逐页配音朗读 |

### 用户心智模型

儿童读者打开绘本时预期：
1. 大画面、大文字，像真正的纸质绘本
2. 翻页要有"翻书"的感觉
3. 每页都有声音（会自动朗读或点击播放）
4. 色彩丰富、温暖、可爱
5. 操作简单（点/滑就能翻页）

---

## 2. UI 风格推荐

| 维度 | 推荐 | 原因 |
|------|------|------|
| **主风格** | Soft & Playful（柔和玩趣） | 符合儿童审美，降低认知负担 |
| **子风格** | Warm Illustration Style | 与绘本插画（水彩/蜡笔/童话风）呼应 |
| **装饰风格** | 圆角、柔和阴影、渐变底色 | 增强"绘本"的质感 |
| **避免** | Glassmorphism, Brutalism, Neumorphism | 这些风格不适合儿童产品 |

### 风格关键词
`暖色` `圆润` `柔和` `明亮` `安全` `亲切` `有趣`

---

## 3. 色彩系统

### 3.1 主色调（暖白基调）

| 用途 | 色值 | 色块 | 说明 |
|------|------|------|------|
| **页面底色** | `#FFF8F0` | 暖白 | 模仿绘本质感纸张 |
| **封面底色** | 从故事主题色渐变 | 动态 | LLM 根据故事主题选择 |
| **文字底色** | `#2D3436` | 深灰 | 非纯黑，温和不刺眼 |
| **半透明遮罩** | `rgba(45, 52, 54, 0.45)` | 半透明 | 图片上方文字区背景 |
| **卡片背景** | `rgba(255, 255, 255, 0.85)` | 半透白 | 文字卡片区 |

### 3.2 辅助色（温暖活泼）

| 用途 | 色值 | 说明 |
|------|------|------|
| **珊瑚橙（主按钮）** | `#FF6B6B` | 翻页按钮、音频播放按钮 |
| **薄荷绿（成功/完成）** | `#4ECDC4` | 加载完成、封底装饰 |
| **暖阳黄（强调）** | `#FFE66D` | 高亮、小点缀、星星装饰 |
| **天空蓝（链接/辅助）** | `#6CB4EE` | 页码指示、辅助信息 |
| **薰衣草紫（装饰）** | `#DDA0DD` | 封面装饰、分隔线 |

### 3.3 渐变方案（供 LLM 参考）

```
封面背景: linear-gradient(135deg, #FFE8D6 0%, #FFD6A5 50%, #FFB4A2 100%)
按钮悬停: 亮度提升 10%，加阴影 depth
翻页阴影: box-shadow: -5px 0 25px rgba(0,0,0,0.15)
```

---

## 4. 字体系统

### 4.1 西文字体

| 用途 | 字体 | 权重 | 说明 |
|------|------|------|------|
| **封面标题** | `Quicksand` | 700 (Bold) | 圆润亲切 |
| **页码/按钮** | `Quicksand` | 600 (SemiBold) | 清晰可读 |
| **装饰文字** | `Quicksand` | 400 (Regular) | 辅助信息 |

### 4.2 中文字体

| 用途 | 字体 | 权重 | 说明 |
|------|------|------|------|
| **故事正文** | `Noto Sans SC` | 400 (Regular) | 清晰、屏显优化 |
| **封面标题** | `Noto Sans SC` | 700 (Bold) | 醒目 |
| **页码/小字** | `Noto Sans SC` | 400 (Regular) | 辅助文本 |

### 4.3 字号层级

```
封面标题:  clamp(2rem, 5vw, 3.5rem)   // 大号醒目
故事正文:  clamp(1.1rem, 2.2vw, 1.5rem) // 大字号，方便阅读
页码:      clamp(0.85rem, 1.5vw, 1rem)
按钮文字:  clamp(0.9rem, 1.8vw, 1.1rem)
页标题:    clamp(0.8rem, 1.5vw, 1rem)  // 小号，不抢眼
行距:      1.8 (宽松)
```

---

## 5. 布局模式

### 5.1 翻页绘本 (Flipbook) — 核心布局

```
┌─────────────────────────────────────────────────┐
│                                                   │
│  封面页 (可点击/滑动进入正文)                     │
│  ┌──────────────────────────────────────┐        │
│  │        绘本标题（大号）              │        │
│  │                                      │        │
│  │  ┌────────────────────────────┐     │        │
│  │  │   装饰插图/几何装饰         │     │        │
│  │  └────────────────────────────┘     │        │
│  │                                      │        │
│  │  "开始阅读" 按钮                    │        │
│  └──────────────────────────────────────┘        │
│                                                   │
├─────────────────────────────────────────────────┤
│                                                   │
│  正文页                                           │
│  ┌──────────────────────────────────────┐        │
│  │                                      │        │
│  │   全屏插图作为背景（铺满）           │        │
│  │   (1920x1920 居中裁剪)               │        │
│  │                                      │        │
│  │  ┌────────────────────────────┐     │        │
│  │  │   故事文本（半透明白底）    │     │        │
│  │  │   "..."                    │     │        │
│  │  │   🔊 小喇叭播放按钮        │     │        │
│  │  └────────────────────────────┘     │        │
│  │                                      │        │
│  └──────────────────────────────────────┘        │
│                                                   │
│  ◀ 1/12 ▶                                       │
│                                                   │
├─────────────────────────────────────────────────┤
│                                                   │
│  封底页                                           │
│  ┌──────────────────────────────────────┐        │
│  │                                      │        │
│  │      "故事讲完啦" 📖                 │        │
│  │      再来一次 / 关闭                 │        │
│  │                                      │        │
│  └──────────────────────────────────────┘        │
└─────────────────────────────────────────────────┘
```

### 5.2 适配策略

| 设备 | 布局调整 |
|------|---------|
| **桌面 (≥1024px)** | 居中容器，最大宽度 800px，两侧留白 |
| **平板 (768-1023px)** | 接近全屏，图片占满 |
| **手机 (<768px)** | 全屏，文字区域更大占比，翻页改为滑动 |
| **横屏/竖屏** | 始终以图片为背景，文字区域自适应 |

---

## 6. 交互设计

### 6.1 翻页交互

| 操作 | 触控设备 | 桌面端 |
|------|---------|--------|
| **下一页** | 点击右半屏 / 左滑 | 点击右侧 / 按 → / 按 Space |
| **上一页** | 点击左半屏 / 右滑 | 点击左侧 / 按 ← / 按 Backspace |
| **跳到指定页** | 点击页码区域弹出导航 | 点击页码区域弹出导航 |
| **翻页动画** | CSS 3D transform 水平翻转 | 同左 |

### 6.2 翻页动画规范

```css
/* 翻页过渡 */
.page-flip {
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    transform-style: preserve-3d;
    perspective: 1200px;
}

/* 翻页时当前页向左滑出 */
.page-exit {
    transform: translateX(-30%) rotateY(-5deg);
    opacity: 0;
}

/* 新页从右侧滑入 */
.page-enter {
    transform: translateX(0) rotateY(0deg);
    opacity: 1;
}

/* 尊重无障碍 */
@media (prefers-reduced-motion: reduce) {
    .page-flip {
        transition: none;
    }
}
```

### 6.3 音频交互

| 场景 | 行为 |
|------|------|
| **首次进入页面** | 自动播放当前页音频（需用户首次点击授权后） |
| **翻页后** | 停止前页音频，自动播放新页音频 |
| **用户点击🔊按钮** | 重新播放当前页音频 |
| **音频播放中** | 🔊 图标旋转/脉冲动画 |
| **音频加载失败** | 🔇 灰显，提示"音频暂不可用" |
| **无音频（用户选择无配音）** | 🔊 隐藏，文本区域扩大 |

### 6.4 其他交互细节

- 所有可点击元素：`cursor: pointer`，悬停放大 1.05x
- 翻页按钮：半透明悬浮，悬停不透明度提升
- 加载/转场：骨架屏或渐变过渡（避免闪烁）
- 触控 target 大小 ≥ 48px

---

## 7. 设计反模式（必须避免）

| ❌ 反模式 | 说明 | ✅ 正确做法 |
|-----------|------|------------|
| **暗色模式** | 儿童绘本禁用暗色背景 | 始终暖白/浅色底 |
| **霓虹/荧光色** | 刺眼、不专业 | 柔和温暖色系 |
| **emoji 作为图标** | 分辨率不一致、风格不统一 | 内联 SVG 图标 |
| **纯黑色文字** `#000` | 对比度过高、生硬 | 深灰 `#2D3436` |
| **复杂动效** | 晕眩、分散注意力 | 平滑简单过渡 |
| **小于 14px 的字** | 儿童看不清 | 最小字号 `clamp(1rem, ...)` |
| **自动播放音频（未经授权）** | 浏览器拦截、体验差 | 首次点击后激活 |
| **密集文字排版** | 儿童无法集中注意力 | 宽松行距、短段落 |
| **广告/弹窗样式** | 破坏沉浸感 | 无模态弹窗 |
| **不明确的点击区域** | 儿童操作精度低 | 触控区域 ≥ 48px |

---

## 8. 架构设计：两阶段生成

```
┌─────────────────────────────────────────────────────────┐
│                    两阶段架构                             │
│                                                         │
│  第一阶段（Step 5 — LLM 生成）                            │
│  ┌─────────────────────────────────────┐                │
│  │  LLM 接收：设计规范 + 故事数据       │                │
│  │  LLM 输出：完整 HTML（含占位符）     │                │
│  │  图片 → __PAGE_1_IMAGE__            │                │
│  │  音频 → __PAGE_1_AUDIO__            │                │
│  │  文本 → 直接写入 HTML               │                │
│  └──────────┬──────────────────────────┘                │
│             ↓                                           │
│  第二阶段（Step 6 — Python 后处理）                      │
│  ┌─────────────────────────────────────┐                │
│  │  1. 创建 WorkFile 记录（图片/音频）   │                │
│  │  2. flush 获取各文件 UUID            │                │
│  │  3. 构建映射:                        │                │
│  │     __PAGE_1_IMAGE__ → /api/v1/...   │                │
│  │  4. 替换 HTML 中占位符               │                │
│  │  5. 保存最终 HTML → 注册 WorkFile    │                │
│  └─────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────┘
```

### 8.1 文件结构

生成的 HTML 文件位于 `{works_dir}/`（即 `storage/works/{task_id}/`），同目录下：

```
storage/works/{task_id}/
├── storybook.html          ← 生成的 HTML 文件（含占位符→最终版本）
├── images/
│   ├── page_001.png        ← 各页插图（1920x1920 PNG）
│   ├── page_002.png
│   └── ...
├── audio/
│   ├── page_001.mp3        ← 各页配音（可选）
│   ├── page_002.mp3
│   └── ...
```

> ⚠️ HTML 不引用本地文件路径，所有媒体通过**完整绝对 URL** 加载：
> 图片 → `__PAGE_1_IMAGE__` → `http://localhost:8000/api/v1/files/works/{uuid}`
> 音频 → `__PAGE_1_AUDIO__` → `http://localhost:8000/api/v1/files/works/{uuid}`
> 使用完整 URL 确保用户下载 HTML 到本地用 `file:///` 打开时，图片和音频仍能加载。
> 服务器地址通过 `settings.PUBLIC_URL` 配置。

### 8.2 HTML 文件要求

| 要求 | 说明 |
|------|------|
| **单文件** | 单个 `.html`，所有 CSS/JS 内嵌 |
| **媒体引用** | 使用 `__PAGE_N_IMAGE__` / `__PAGE_N_AUDIO__` 占位符 |
| **Google Fonts** | `@import url()` 内嵌（运行时需联网） |
| **字体回退** | Google Fonts 加载失败时回退系统字体 |
| **无框架** | 纯 HTML + CSS + Vanilla JS |
| **UTF-8** | `<meta charset="utf-8">` |
| **Viewport** | `<meta name="viewport" content="width=device-width, initial-scale=1.0">` |
| **HTML 大小** | ≤ 100KB（仅含文本 + CSS + JS） |

### 8.3 图片处理

- 原始图片 1920x1920 PNG → 通过服务器 API 返回
- CSS 中 `object-fit: cover` + `object-position: center` 裁剪适配
- 禁止 base64 嵌入图片
- 使用 `<img loading="lazy">` 优化加载

### 8.4 兼容性

| 浏览器 | 支持要求 |
|--------|---------|
| Chrome 90+ | ✅ 完全支持 |
| Safari 15+ | ✅ 完全支持 |
| Firefox 90+ | ✅ 完全支持 |
| iOS Safari 15+ | ✅ 触控优化 |
| 微信内置浏览器 | ✅ 基础功能可用 |

### 8.5 文件服务扩展

文件服务 `/api/v1/files/works/{file_id}` 需要增加 `html` 类型支持：

```python
media_type_map = {
    "image": "image/png",
    "audio": "audio/wav",
    "pdf": "application/pdf",
    "html": "text/html; charset=utf-8",    # ← 新增
    ...
}
```

---

## 9. 数据 Schema & 占位符

### 9.1 LLM 收到的数据

```json
{
  "title": "勇敢的小兔子",
  "total_pages": 5,
  "pages": [
    {
      "page_number": 1,
      "title": "小兔子的家",
      "text_snippet": "从前，在一片美丽的森林里，住着一只勇敢的小兔子...",
      "description": "森林小木屋场景，阳光透过树叶洒下",
      "image_placeholder": "__PAGE_1_IMAGE__",
      "has_audio": true,
      "audio_placeholder": "__PAGE_1_AUDIO__"
    },
    {
      "page_number": 2,
      "title": "遇到困难",
      "text_snippet": "一天，小兔子发现森林里的小溪干涸了...",
      "description": "干涸的小溪，小兔子困惑的表情",
      "image_placeholder": "__PAGE_2_IMAGE__",
      "has_audio": false,
      "audio_placeholder": ""
    }
  ]
}
```

### 9.2 占位符格式

| 占位符 | 含义 | 最终替换为 |
|--------|------|-----------|
| `__PAGE_1_IMAGE__` | 第 1 页图片 | `{PUBLIC_URL}/api/v1/files/works/{uuid}` |
| `__PAGE_1_AUDIO__` | 第 1 页配音 | `{PUBLIC_URL}/api/v1/files/works/{uuid}` |
| `__PAGE_2_IMAGE__` | 第 2 页图片 | `{PUBLIC_URL}/api/v1/files/works/{uuid}` |
| ... | ... | ... |

占位符规则：
- `__PAGE_N_IMAGE__` — N 从 1 开始，与 `page_number` 一致
- `__PAGE_N_AUDIO__` — 仅 `has_audio=true` 的页有此占位符
- 无音频的页面：不放 audio 元素，不显示播放按钮
- 占位符出现在 `<img src="...">` 或 `background-image: url('...')` 中

### 9.3 占位符替换流程（Python）

```python
from app.core.config import settings

# 1. 收集映射（完整绝对 URL）
base = settings.PUBLIC_URL
asset_map = {
    "__PAGE_1_IMAGE__": f"{base}/api/v1/files/works/{image_file_1_id}",
    "__PAGE_1_AUDIO__": f"{base}/api/v1/files/works/{audio_file_1_id}",
    "__PAGE_2_IMAGE__": f"{base}/api/v1/files/works/{image_file_2_id}",
}

# 2. 替换
from app.prompts.storybook_html import inject_asset_urls
final_html = inject_asset_urls(raw_html, asset_map)

# 3. 保存
with open("storage/works/{task_id}/storybook.html", "w") as f:
    f.write(final_html)
```

---

## 10. HTML 结构骨架（供 LLM 参考）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>绘本标题</title>
    <!-- Google Fonts -->
    <style>
        /* 所有 CSS */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #FFF8F0;
            font-family: 'Noto Sans SC', 'Quicksand', system-ui, sans-serif;
        }
        /* 翻页动画 3D */
        /* 响应式布局 */
        /* SVG 图标（非 emoji） */
    </style>
</head>
<body>
    <div id="app">
        <!-- 封面页 -->
        <div class="page active" data-page="0">
            <div class="cover">
                <h1 class="cover-title">绘本标题</h1>
                <!-- SVG 装饰元素 -->
                <button class="start-btn" onclick="goToPage(1)">开始阅读</button>
            </div>
        </div>

        <!-- 正文页（LLM 为每页生成一个 .page） -->
        <div class="page" data-page="1">
            <img class="page-image" src="__PAGE_1_IMAGE__" alt="第1页插图" loading="lazy">
            <div class="text-card">
                <p class="story-text">从前，在一片美丽的森林里...</p>
                <button class="audio-btn" onclick="playAudio('__PAGE_1_AUDIO__')">
                    <svg><!-- 喇叭 SVG 图标 --></svg>
                </button>
            </div>
        </div>

        <!-- ... 更多正文页 ... -->

        <!-- 封底页 -->
        <div class="page" data-page="last">
            <div class="end-page">
                <h2>故事讲完啦</h2>
                <p>谢谢聆听</p>
                <button class="restart-btn" onclick="goToPage(1)">重新阅读</button>
            </div>
        </div>
    </div>

    <!-- 导航栏 -->
    <nav id="nav">
        <span id="pageIndicator">1/N</span>
        <!-- 左右翻页由点击半屏触发，导航栏只显示页码 -->
    </nav>

    <script>
        /* 翻页逻辑 */
        /* 音频控制 */
        /* 触控支持 */
        /* 键盘支持 */
        /* prefers-reduced-motion 检测 */
    </script>
</body>
</html>
```

### 10.1 翻页 JavaScript API 设计

```javascript
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null; // 首次点击用户交互时激活

const state = {
    currentPage: 0,
    totalPages: N,    // N = pages.length + 2（封面+封底）
    currentAudio: null,
};

function goToPage(index) {
    if (index < 0 || index >= state.totalPages) return;
    // 1. 切换 active 状态
    document.querySelectorAll('.page').forEach((el, i) =>
        el.classList.toggle('active', i === index));
    // 2. 更新页码
    document.getElementById('pageIndicator').textContent =
        `${index + 1}/${state.totalPages}`;
    // 3. 停止当前音频
    if (state.currentAudio) { state.currentAudio.pause(); state.currentAudio = null; }
    // 4. 播放新页音频
    const page = document.querySelector(`.page[data-page="${index}"]`);
    const audioEl = page?.querySelector('audio');
    if (audioEl) { state.currentAudio = audioEl; audioEl.play().catch(() => {}); }
    state.currentPage = index;
}

// 首次用户点击时，激活 AudioContext（浏览器策略）
function initAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
}

// 页面点击：左半屏上一页，右半屏下一页
document.getElementById('app').addEventListener('click', (e) => {
    initAudio();
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX < rect.left + rect.width / 2) goToPage(state.currentPage - 1);
    else goToPage(state.currentPage + 1);
});
```

---

## 11. 质量验收标准

一份合格的绘本 HTML 必须通过以下检查：

### 11.1 占位符检查（LLM 输出后立即检查）
- [ ] 所有页面图片使用 `__PAGE_N_IMAGE__` 格式占位符（N 从 1 递增）
- [ ] 有音频的页使用 `__PAGE_N_AUDIO__` 格式占位符
- [ ] 无音频的页不包含 audio 元素
- [ ] 占位符出现在 `<img src>`、`background-image: url()`、`<audio src>` 等位置

### 11.2 视觉效果检查（最终 HTML 打开浏览器验）
- [ ] 封面标题正确显示
- [ ] 所有页面图片正常加载（服务器 URL 返回 200）
- [ ] 翻页动画流畅（≤ 400ms）
- [ ] 音频按钮可点击，音频正常播放
- [ ] 翻页时停止前页音频、自动播新页音频
- [ ] 页码指示器格式正确（含封面封底，如 "2/14"）
- [ ] 封底页有"重新阅读"按钮
- [ ] 触控设备左右滑动翻页
- [ ] 键盘 ← → / Space 翻页
- [ ] 响应式：桌面居中，移动端全屏
- [ ] 无 emoji 图标（使用 SVG）
- [ ] 无外部依赖（Google Fonts 除外）
- [ ] `prefers-reduced-motion` 生效后动画消失

---

## 12. 设计参考示例

### 12.1 色彩搭配示例（暖调童话风）

```
渐变背景: #FFF3E0 → #FFE0B2
点缀色:    #FF7043 (珊瑚), #66BB6A (草绿), #42A5F5 (天蓝)
按钮:      #FF6B6B 悬停 → #FF5252
文字:      #4A3728 (暖棕)
遮罩:      rgba(255, 243, 224, 0.85)
```

### 12.2 装饰元素

- 封面上方: 几何星星/圆点装饰（纯 CSS 实现，或用内联 SVG）
- 页码两侧: 小圆点或波浪线装饰
- 翻页按钮: 大圆按钮，带微妙的发光阴影
- 封底: 星星飘落动画（CSS @keyframes）

### 12.3 导航装饰 SVG（供 LLM 参考）

```html
<!-- 喇叭图标（替换 emoji 🔊） -->
<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M11 5L6 9H2v6h4l5 4V5z"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
</svg>

<!-- 翻页箭头（替换 emoji ◀ ▶） -->
<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="15 18 9 12 15 6"/>
</svg>
```

---

## 13. 附录：服务端集成指南

### 13.1 Step 5 修改（storybook.py）

```python
# 替换原有的 _generate_pdf_and_zip()
async def _generate_html(self, result_data, works_dir):
    from app.prompts.storybook_html import build_html_generation_prompt

    outline = result_data.get('outline', {})
    pages = result_data.get('pages', [])

    # 调用 LLM 生成 HTML（含占位符）
    system_prompt, user_prompt = build_html_generation_prompt(outline, pages)
    response = await self.deepseek_provider.generate_text(
        prompt=user_prompt,
        system_prompt=system_prompt,
        thinking=True,
        max_tokens=8192,
    )

    if not response.success:
        raise RuntimeError(f"HTML 生成失败: {response.error}")

    raw_html = response.content
    html_path = os.path.join(works_dir, 'storybook.html')
    async with aiofiles.open(html_path, 'w', encoding='utf-8') as f:
        await f.write(raw_html)

    return {'html_path': html_path, 'html_size': len(raw_html.encode('utf-8'))}
```

### 13.2 Step 6 后处理（_create_work_record）

```python
from app.core.config import settings
from app.prompts.storybook_html import inject_asset_urls, build_placeholder_map

base = settings.PUBLIC_URL  # 如 "http://localhost:8000"
asset_map = build_placeholder_map(pages)
for pn, image_file_id, audio_file_id in collected_ids:
    asset_map[f"__PAGE_{pn}_IMAGE__"] = \
        f"{base}/api/v1/files/works/{image_file_id}"
    if audio_file_id:
        asset_map[f"__PAGE_{pn}_AUDIO__"] = \
            f"{base}/api/v1/files/works/{audio_file_id}"

# 读取原始 HTML，替换占位符为完整绝对 URL
async with aiofiles.open(raw_html_path, 'r', encoding='utf-8') as f:
    content = await f.read()
final_html = inject_asset_urls(content, asset_map)
async with aiofiles.open(raw_html_path, 'w', encoding='utf-8') as f:
    await f.write(final_html)

# 注册 HTML 为 WorkFile
html_file = WorkFile(
    work_id=work.id,
    file_type="html",
    file_name=f"{work.title}.html",
    file_url="storybook.html",
    file_size=len(final_html.encode('utf-8')),
    mime_type="text/html; charset=utf-8"
)
db.add(html_file)
```

### 13.3 文件服务扩展

在 `apps/backend/app/api/v1/endpoints/files.py` 的 `media_type_map` 中增加：

```python
"html": "text/html; charset=utf-8",
```

### 13.4 前端集成

成果详情页（`/works/detail/[id]`）无需特殊改造，遵循通用文件处理逻辑：

**预览 Tab**
- 查询 WorkFile 列表时，若有 `file_type="html"` 的记录，在预览区域显示「打开」按钮
- 点击在新页签打开 `/api/v1/files/works/{html_file_id}`
- 与现有的图片预览 / 音频播放并列

```tsx
// 伪代码：预览区域
{htmlFile && (
    <a
        href={`/api/v1/files/works/${htmlFile.id}`}
        target="_blank"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg
                   bg-gradient-to-r from-[#059669] to-[#10B981] text-white
                   text-sm font-medium hover:shadow-lg transition-all"
    >
        <svg><!-- 打开图标 --></svg>
        打开
    </a>
)}
```

**文件 Tab**
- HTML 文件作为普通文件条目展示，与其他类型（PDF/图片/音频）并列
- 提供标准的「下载」按钮（复用现有单个文件下载逻辑）
- 文件名为 `{title}.html`

**下载全部**
- 现有的 ZIP 打包逻辑已遍历 `storage/works/{task_id}/` 目录
- HTML 文件 `storybook.html` 已在该目录下，自动被包含
- 无需额外改动

---

## 14. Prompt 模板参考

详细 prompt 模板见 `apps/backend/app/prompts/storybook_html.py`。

核心接口：

```python
# 生成 prompt（Step 5 调用 LLM 前）
system_prompt, user_prompt = build_html_generation_prompt(outline, pages)

# 构建占位符映射（Step 6 获取 WorkFile ID 前）
asset_map = build_placeholder_map(pages)

# 注入真实 URL（Step 6 获取 WorkFile ID 后）
final_html = inject_asset_urls(raw_html, asset_map)
```
