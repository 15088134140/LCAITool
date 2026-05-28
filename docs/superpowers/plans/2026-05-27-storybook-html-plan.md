<!-- /autoplan restore point: /Users/mark/.gstack/projects/15088134140-LCAITool/main-autoplan-restore-20260527-173439.md -->
# 有声绘本 HTML 版 — 实施计划

> 基于 `docs/superpowers/specs/2026-05-27-storybook-html-design.md` 设计规范

## 背景

当前绘本生成在第 5 步使用 ReportLab 生成 PDF，排版简陋、无翻页交互、用户体验差。
改为：在第 5 步调用 LLM 生成精美 HTML 翻页绘本，第 6 步注入图片/音频的服务器 URL。

## 实现步骤

### 步骤 0：已创建 — 基础配置 + 提示词模板

**文件**：

- `apps/backend/app/core/config.py` — 新增 `PUBLIC_URL: str = "http://localhost:8000"`，用于构造完整 URL
- `apps/backend/app/prompts/storybook_html.py` — 提示词模板模块，导出三个函数供步骤 2/3 调用

---

### 步骤 1：文件服务支持 HTML 类型

**文件**：`apps/backend/app/api/v1/endpoints/files.py`

在 `media_type_map` 增加一行：

```python
"html": "text/html; charset=utf-8",
```

---

### 步骤 2：修改 StorybookExecutor 步骤 5 — 替换 PDF 生成为 LLM HTML 生成

**文件**：`apps/backend/app/executors/storybook.py`

#### 2a. 新增 `_generate_html()` 方法，替换 `_generate_pdf_and_zip()`

```python
async def _generate_html(self, result_data, works_dir):
    from app.prompts.storybook_html import build_html_generation_prompt

    outline = result_data['outline']
    pages = result_data['pages']

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

#### 2b. 修改 `execute()` 中步骤 5 调用

将 `files = await self._generate_pdf_and_zip(result_data, works_dir)` 改为调用 `_generate_html`。

#### 2c. 移除 `PDFGenerator` 依赖

- 删除 `__init__` 中的 `self.pdf_generator = PDFGenerator()`
- 删除文件顶部的 `from app.utils.pdf_generator import PDFGenerator`

---

### 步骤 3：修改步骤 6 — 注入资产 URL + 注册 HTML WorkFile

**文件**：`apps/backend/app/executors/storybook.py`

修改 `_create_work_record()` 方法。原本的逻辑是：
1. 创建 Work 记录
2. 注册 PDF WorkFile
3. 循环创建图片/音频 WorkFile
4. flush → 更新 cover_image
5. commit

改为：
1. 创建 Work 记录
2. 循环创建图片/音频 WorkFile，同时保存对象引用
3. flush → 获取所有图片/音频 ID
4. 更新 cover_image
5. 用 `build_placeholder_map()` + `inject_asset_urls()` 替换 HTML 占位符
6. 注册 HTML WorkFile
7. commit

具体代码变更：

```python
async def _create_work_record(self, params: Dict[str, Any], result_data: Dict[str, Any]) -> Any:
    """创建成果记录"""
    task = await TaskService.get_by_id(self.db, self.task_id)
    outline = result_data.get('outline', {})
    pages = result_data.get('pages', [])
    files = result_data.get('files', {})

    work_in = WorkCreate(...)
    work = await WorkService.create_work(self.db, work_in)

    # 收集 WorkFile 对象引用
    first_image_file = None
    created_files = []  # [(page_number, image_file, audio_file), ...]

    for page in pages:
        page_num = page.get('page_number', 0) or (pages.index(page) + 1)
        img_file = None
        audio_file = None

        image_url = page.get('image_url')
        if image_url:
            img_file = WorkFile(...)  # 同现有逻辑
            self.db.add(img_file)
            if first_image_file is None:
                first_image_file = img_file

        audio_url = page.get('audio_url')
        if audio_url:
            audio_file = WorkFile(...)  # 同现有逻辑
            self.db.add(audio_file)

        created_files.append((page_num, img_file, audio_file))

    # flush 获取 ID
    await self.db.flush()

    if first_image_file:
        work.cover_image = f"/api/v1/files/works/{first_image_file.id}"

    # 注入资产 URL 到 HTML
    from app.core.config import settings
    from app.prompts.storybook_html import inject_asset_urls, build_placeholder_map

    asset_map = build_placeholder_map(pages)
    base = settings.PUBLIC_URL
    for pn, img_file, audio_file in created_files:
        if img_file:
            asset_map[f"__PAGE_{pn}_IMAGE__"] = \
                f"{base}/api/v1/files/works/{img_file.id}"
        if audio_file:
            asset_map[f"__PAGE_{pn}_AUDIO__"] = \
                f"{base}/api/v1/files/works/{audio_file.id}"

    html_path = files.get('html_path')
    if html_path:
        async with aiofiles.open(html_path, 'r', encoding='utf-8') as f:
            content = await f.read()
        final_html = inject_asset_urls(content, asset_map)
        async with aiofiles.open(html_path, 'w', encoding='utf-8') as f:
            await f.write(final_html)

        self.db.add(WorkFile(**WorkFileCreate(
            work_id=work.id,
            file_type="html",
            file_name=f"{work.title}.html",
            file_url="storybook.html",
            file_size=len(final_html.encode('utf-8')),
            mime_type="text/html; charset=utf-8",
        ).model_dump()))

    # 注册 prompts.md 为 WorkFile（如果存在）
    await self._register_prompts_md_workfile(work.id)

    await self.db.commit()
    return work
```

对应的移除：
- 删除原有 PDF WorkFile 注册代码块（`pdf_path = files.get('pdf_path')` 及其后续 10 行）

---

### 步骤 4：Mock 模式改为生成 HTML 占位

**文件**：`apps/backend/app/executors/base.py`

`_mock_execute()` 中（约第 452-465 行），将 PDF 占位改为生成简易 HTML：

```python
html_rel = "storybook.html"
html_abs = os.path.join(task_dir, html_rel)
os.makedirs(os.path.dirname(html_abs), exist_ok=True)
with open(html_abs, "w", encoding="utf-8") as f:
    f.write(
        '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
        f'<title>{title}</title></head>'
        '<body style="background:#FFF8F0;display:flex;align-items:center;'
        'justify-content:center;min-height:100vh;font-family:sans-serif;">'
        '<h1 style="color:#2D3436">Mock 有声绘本</h1></body></html>'
    )

self.db.add(WorkFile(**WorkFileCreate(
    work_id=work.id,
    file_name=f"{title}.html",
    file_url=html_rel,
    file_type="html",
    mime_type="text/html; charset=utf-8",
).model_dump()))
```

---

### 步骤 5：前端 — 预览 Tab 增加 HTML "打开" 按钮

**文件**：`apps/frontend-user/src/app/works/detail/[id]/page.tsx`

1. 预览 Tab：在图片预览区域之后，增加 HTML "打开" 按钮，新页签打开
2. `getFileIcon()` 增加 `case 'html'` 分支

---

---

## /autoplan 审核 — 第一阶段：CEO 审核（战略与范围）

### 决策审计日志

| # | 阶段 | 决策 | 分类 | 原则 | 理由 | 否决项 |
|---|------|------|------|------|------|--------|
| 1 | CEO | 固定 HTML 模板 vs LLM 生成 HTML | 前提审查 | — | LLM 生成 HTML/CSS/JS 不可靠；固定模板更可维护 | — |
| 2 | CEO | 保留 PDF 作为并行输出 | 品味决策 | P1, P2 | PDF 服务于微信分享/打印；HTML 和 PDF 满足不同需求。两个模型都表达了担忧 | — |
| 3 | CEO | 增加自动化占位符验证 | 机械决策 | P1, P3 | 实施成本低；防止静默输出损坏 | — |
| 4 | CEO | 承认离线限制 | 机械决策 | P3 | ZIP 下载已覆盖离线场景；无需改动 | — |
| 5 | CEO | 增加 LLM 输出的重试策略 + HTML 校验器 | 机械决策 | P5, P3 | 轻量校验 + 修正提示词防止下游失败 | — |
| 6 | CEO | 不对竞争风险做改动 | 机械决策 | P6 | V1 改进；交付并迭代 | — |
| 7 | CEO | 增加功能开关 + 成功指标 | 机械决策 | P1, P6 | 功能开关实现安全发布；指标衡量实际改进 | — |

### CLAUDE 子代理（CEO — 战略独立性）

**发现 1（严重）：LLM 生成 HTML 是错误架构**
使用 LLM（DeepSeek，8192 tokens）一次性生成完整的交互式 HTML/CSS/JS 翻页书非常脆弱。每次生成都可能出现 HTML 格式错误、JS 错误、CSS 不一致、占位符误用和 token 限制超标。LLM 应该生成**内容**（文本、主题、描述），而 UI 应该由确定性的手工模板消费 JSON 数据。

**发现 2（高）：无声移除 PDF，未做用户分析**
PDF 服务于微信分享、打印和离线存储——这些都是中国家长的关键使用场景。计划假设"HTML 更好"而没有证明用户认同。6个月后悔：用户要求恢复 PDF，而 HTML 完成率很低。

**发现 3（高）：占位符替换存在未承认的失败率**
LLM 经常改变占位符文本（大小写变化、多余空格）。没有自动化验证。如果 `__PAGE_1_IMAGE__` 变成 `__page_1_image__`，图片将静默失败。

**发现 4（中）：离线/下载场景描述不准确**
`file:///` 下使用 `localhost:8000` URL 无法工作。Google Fonts 在 `file:///` 下失败。真正的离线需要 base64 嵌入（被明确禁止）或本地文件夹结构。

**发现 5（中）：提示词脆弱且成本高**
82 行系统提示词 + 8192 max_tokens + 思考模式 = 每次生成成本高。没有 HTML 生成的测试套件。没有重试策略。

**发现 6（中）：来自原生前端应用的竞争风险**
竞争对手（斑马AI、叫叫阅读）使用专业渲染，而非 LLM 生成 HTML。HTML 翻页书会明显不够精致。

**发现 7（中）：缺少成功指标和发布策略**
没有功能开关，没有 A/B 测试计划，没有回滚计划，没有定义成功指标。

### CEO 共识表

```
CEO 双模型 — 共识表：
═══════════════════════════════════════════════════════════════
  维度                              Claude  Codex  共识
  ───────────────────────────────── ─────── ─────── ─────────
  1. 前提是否成立？                   否      N/A    有分歧（发现 1）
  2. 解决的是否正确问题？             部分    N/A    需要前提确认
  3. 范围校准是否合理？               部分    N/A    有分歧（发现 2）
  4. 替代方案是否充分探索？           否      N/A    有分歧（发现 1）
  5. 竞争/市场风险是否覆盖？          否      N/A    有分歧（发现 6）
  6. 6个月发展轨迹是否合理？          部分    N/A    需要前提确认
═══════════════════════════════════════════════════════════════
确认 = 双方同意。有分歧 = 模型不同（→ 品味决策）。
缺失模型 = N/A（非确认）。任一模型的单个严重发现 = 无论是否标记。
```

[codex-unavailable: 未找到二进制文件] — 仅使用 Claude 子代理继续。

### 不在范围内（已推迟）
| 项目 | 原因 |
|------|------|
| 微信小程序版本 | 需要单独的平台开发；P2 |
| 离线优先 HTML（base64 内联图片） | 与设计规范冲突；成本过高 |
| 微信分享深度链接 | 仅 UI 考虑；可后续添加 |
| A/B 测试框架 | 平台级功能；非单功能所需 |

### 已有内容
| 子问题 | 已有方案 |
|--------|----------|
| 文件服务提供图片/音频 | `files.py` 端点按 UUID 提供 |
| Work 记录创建 + WorkFile 注册 | `_create_work_record()` in storybook.py |
| ZIP 下载 | `handleDownloadAll` in frontend page |
| Mock 执行模式 | `_mock_execute()` in base.py |

### 完成总结
第一阶段完成。Codex：不可用。Claude 子代理：7 个发现（1 严重，2 高，4 中）。
共识：0/6 确认，6 项分歧 → 在最终关卡提出。
1 个前提挑战和 1 个品味决策需要用户输入。

**第一阶段完成。** 进入第二阶段（设计审核）。

---

## /autoplan 审核 — 第二阶段：设计审核

### 决策审计日志（续）

| # | 阶段 | 决策 | 分类 | 原则 | 理由 | 否决项 |
|---|------|------|------|------|------|--------|
| 8 | 设计 | 在交互元素（音频按钮、导航按钮）上添加 stopPropagation | 机械决策 | P5, P1 | 关键错误：点击音频按钮也会触发翻页。在提示词模板中修复 | — |
| 9 | 设计 | 增加图片加载策略（预加载、背景占位、加载状态） | 机械决策 | P1 | 1920x1920 图片需要 1-5 秒加载；翻页时空白屏幕破坏沉浸感 | — |
| 10 | 设计 | 非静默音频自动播放错误处理 + 视觉反馈 | 机械决策 | P1 | 静默 .catch() 意味着用户永远不知道音频播放失败 | — |
| 11 | 设计 | 增加生成后占位符验证扫描 + 重试 | 机械决策 | P1, P3 | LLM 会改变占位符格式；先验证再继续 | — |
| 12 | 设计 | 保留 PDF 作为并行输出 | 品味决策 | P1, P2 | 同 CEO 发现 2。PDF/HTML 服务不同使用场景 | — |
| 13 | 设计 | ZIP 下载应包含相对路径的 HTML 版本 | 机械决策 | P1 | 服务器 URL 离线无法工作；ZIP 用户期望离线使用 | — |
| 14 | 设计 | 增加 max_tokens 到 16384 + 添加文档结束验证 | 机械决策 | P3, P1 | 8192 tokens 可能截断完整绘本 HTML；增加完整性检查 | — |
| 15 | 设计 | 在提示词模板中添加可访问性规则（aria、键盘、stopPropagation） | 机械决策 | P1 | 空格键与音频按钮冲突；未指定 aria 角色 | — |
| 16 | 设计 | 收紧颜色引导：强制暖色调，无论故事主题 | 机械决策 | P5 | "LLM 选择主题色"表述模糊 → 与"始终暖色/亮色"冲突 | — |

### 设计评分卡

| 维度 | 分数 | 说明 |
|------|------|------|
| 1. 信息层级 | 7/10 | 设计规范布局很棒；实现缺少加载/错误状态 |
| 2. 缺失状态 | 4/10 | 加载（图片）、错误（音频）、空（无图片）——全部未指定 |
| 3. 交互精确度 | 5/10 | stopPropagation 错误（严重），音频自动播放静默失败（高） |
| 4. 响应式行为 | 8/10 | 设计规范覆盖桌面/平板/手机良好；提示词模板需要加强 |
| 5. 可访问性 | 3/10 | 无 aria 角色，音频按钮无键盘事件保护，空格键冲突 |
| 6. 离线/弹性 | 4/10 | ZIP 下载中的服务器 URL 有误导性；字体在 file:/// 下失败 |
| 7. 提示词精确度 | 6/10 | 82 行系统提示词很详细，但缺少加载状态、stopPropagation、aria 规则 |

### 实现者最头疼的问题
3 个最可能在实现中造成混淆的设计决策：
1. **交互元素的 stopPropagation** — LLM 生成的 JS 如果没有这个，点击音频按钮也会触发翻页
2. **图片加载状态** — 没有预加载或背景占位，用户每次翻页看到空白 + 文本 1-5 秒
3. **音频自动播放浏览器策略** — 静默 .catch() 意味着孩子翻阅页面时听不到音频，没人知道为什么

**第二阶段完成。** 仅子代理（Codex 不可用）。10 个发现（2 严重，2 高，5 中，1 低）。
评分：5.3/10 平均分。进入第三阶段（工程审核）。

---

## /autoplan 审核 — 第三阶段：工程审核

### 决策审计日志（续）

| # | 阶段 | 决策 | 分类 | 原则 | 理由 | 否决项 |
|---|------|------|------|------|------|--------|
| 17 | 工程 | LLM 生成 HTML 是 UI 组件的错误架构 | 前提审查 | — | 匹配 CEO 发现 1。LLM 应生成内容，而非代码 | — |
| 18 | 工程 | LLM 输出后增加占位符验证关卡 | 机械决策 | P1, P3 | 扫描 `__PAGE_\d+_(IMAGE\|AUDIO)__` 模式；不匹配则拒绝并重试 | — |
| 19 | 工程 | 增加生成后 HTML 完整性检查 | 机械决策 | P1 | 验证关闭 `</html>` 标签，验证所有预期元素存在 | — |
| 20 | 工程 | HTML 生成时关闭 `thinking=True` | 机械决策 | P3 | HTML 生成是格式化任务，非推理；节省成本和延迟 | — |
| 21 | 工程 | 增加 HTML 消毒（剥离 `<script>`、`on*=` 属性） | 机械决策 | P1, 安全 | 用户故事内容可能包含由 LLM 传播的 XSS 向量 | — |
| 22 | 工程 | 保留 PDF 作为并行输出 | 品味决策 | P1, P2 | 匹配 CEO 发现 2 / 设计发现 8。PDF 是便携格式 | — |
| 23 | 工程 | 为 ZIP 下载增加离线 HTML 变体 | 机械决策 | P1 | 服务器 URL 在 `file:///` 下无效；为 ZIP 生成相对路径版本 | — |
| 24 | 工程 | 为失败的 HTML 验证增加带修正的重试 | 机械决策 | P3 | 单次失败 = 任务失败过于严格；带针对性修正重试 | — |
| 25 | 工程 | 增加快照格式兼容性检查 | 机械决策 | P1 | 旧快照有 `pdf_path`，新快照有 `html_path`；使用前检查 | — |
| 26 | 工程 | 为 inject_asset_urls + build_placeholder_map 增加单元测试 | 机械决策 | P1 | 这些是关键数据流函数，测试覆盖率为零 | — |
| 27 | 工程 | 为完整 HTML 管道增加集成测试 | 机械决策 | P1 | 使用模拟 LLM 输出的端到端测试验证整个流程 | — |
| 28 | 工程 | 接受 LLM HTML 生成 30-90 秒延迟 | 机械决策 | P3 | 步骤 3-4 已经需要几分钟；步骤 5 的 90 秒可接受 | — |
| 29 | 工程 | 记录快照格式兼容性风险（未来关注） | 机械决策 | P3 | 仅影响部署期间正在进行的任务；作为文档记录接受 | — |

### CLAUDE 子代理（工程 — 独立审核）

**发现（共 20 项：4 严重，6 高，10 中）**

严重：
- LLM 生成前端代码是错误架构层（前提关卡）
- Token 截断产生损坏且不可检测的 HTML — 无完整性检查
- 无生成后占位符验证（匹配 CEO 发现 3）
- JS 翻页逻辑是不简单的前端应用；单次 LLM 生成不可靠

高：
- 占位符约定是字符串化类型 — LLM 和注入器之间无类型化契约
- 部分音频/图片故障产生占位符不匹配（audio_url 是文件路径，非布尔值）
- URL 注入逻辑无单元测试
- 完整 HTML 管道无集成测试
- ZIP 下载离线体验损坏（file:/// 下使用服务器 URL）
- 移除 PDF 是微信分享和打印的功能退化

中：
- LLM 输出无 JavaScript 语法验证
- HTML 生成无重试策略
- file_url 是相对路径还是绝对路径时静默失败
- 两阶段架构原则上合理但实现脆弱
- 快照恢复在格式变更时损坏
- HTML 生成使用 `thinking=True` 浪费资源
- HTML 输出中用户内容未消毒（XSS 向量）
- Mock 模式 HTML 未经测试
- 占位符完整性未经测试
- 安全：无新的认证暴露但无输出消毒

### 工程共识表

```
工程 双模型 — 共识表：
═══════════════════════════════════════════════════════════════
  维度                              Claude  Codex  共识
  ───────────────────────────────── ─────── ─────── ─────────
  1. 架构是否合理？                   否      N/A    有分歧（发现 1.1）
  2. 测试覆盖是否充分？               否      N/A    有分歧（发现 7.1-7.4）
  3. 性能风险是否已处理？             部分    N/A    部分处理（发现 5.1-5.2）
  4. 安全威胁是否已覆盖？             部分    N/A    部分处理（发现 6.1）
  5. 错误路径是否已处理？             否      N/A    有分歧（发现 3.1-3.3）
  6. 部署风险是否可控？               部分    N/A    需要验证关卡
═══════════════════════════════════════════════════════════════
确认 = 双方同意。有分歧 = 模型不同（→ 品味决策）。
缺失模型 = N/A（非确认）。任一模型的单个严重发现 = 无论是否标记。
```

[codex-unavailable] — 仅 Claude 子代理。

### 架构图

```
┌────────────────────────────────────────────────────────────────┐
│                      提议的数据流                               │
│                                                                │
│  步骤 1-4（不变）：                                              │
│  ┌──────┐  ┌──────┐  ┌──────────┐  ┌──────────┐               │
│  │故事  │→ │插画  │→ │生成图片  │→ │生成音频  │               │
│  │大纲  │  │提示词│  │          │  │          │               │
│  └──────┘  └──────┘  └──────────┘  └──────────┘               │
│                                      │                         │
│  步骤 5（原 PDF，现 HTML）：          ▼                         │
│  ┌─────────────────────────────────────┐                       │
│  │ LLM 生成 HTML（thinking=True）      │ ← 脆弱：82 行系统      │
│  │ 输出：含 __PAGE_N_... 占位符的      │   提示词，非确定性      │
│  │ 原始 HTML                           │                       │
│  └──────────────┬──────────────────────┘                       │
│                 ▼                                              │
│  ┌─────────────────────────────────────┐                       │
│  │ [缺失] 占位符验证                   │ ← 尚不存在扫描         │
│  │ [缺失] HTML 完整性检查              │ ← 无 </html> 检查      │
│  │ [缺失] HTML 消毒                    │ ← 无 XSS 防护          │
│  └──────────────┬──────────────────────┘                       │
│                 ▼                                              │
│  步骤 6（已修改）：                                             │
│  ┌─────────────────────────────────────┐                       │
│  │ 创建 Work 记录                      │                       │
│  │ 创建图片/音频 WorkFile              │                       │
│  │ flush() → 获取 UUID                 │                       │
│  │ 通过字符串替换注入资产 URL           │                       │
│  │ [缺失] 验证无 __PAGE_ 残留          │ ← 无替换后验证         │
│  │ 注册 HTML WorkFile                  │                       │
│  └─────────────────────────────────────┘                       │
└────────────────────────────────────────────────────────────────┘
```

### 测试计划

| 测试 | 类型 | 验证内容 | 优先级 |
|------|------|---------|--------|
| `test_inject_asset_urls_normal` | 单元 | 所有占位符被正确替换 | P0 |
| `test_inject_asset_urls_missing` | 单元 | 缺失占位符 = 无崩溃，无操作 | P0 |
| `test_inject_asset_urls_case` | 单元 | 大小写敏感的替换 | P0 |
| `test_build_placeholder_map` | 单元 | 映射匹配设置了 audio_url 的页面 | P0 |
| `test_build_html_generation_prompt` | 单元 | 提示词包含预期的章节 | P1 |
| `test_html_pipeline_integration` | 集成 | Mock LLM → 注入 → 验证最终 HTML 有效 | P0 |
| `test_generate_html_success` | 单元 | Mock LLM 返回有效 HTML | P1 |
| `test_generate_html_llm_failure` | 单元 | LLM 失败抛出 RuntimeError | P1 |
| `test_generate_html_truncated` | 单元 | LLM 返回截断 HTML → 完整性检查捕获 | P0 |
| `test_placeholder_validation` | 单元 | 检测到缺失占位符；检测到意外占位符 | P0 |
| `test_html_sanitization` | 单元 | 从 LLM 输出中剥离 `<script>` 标签 | P1 |
| `test_mock_mode_html` | 单元 | Mock 执行器创建有效的 HTML WorkFile | P1 |
| `test_snapshot_compatibility` | 单元 | 旧快照格式被优雅处理 | P2 |

### 不在范围内（工程）
| 项目 | 原因 |
|------|------|
| HTML 输出的自动化视觉回归测试 | 需要截图基础设施；P2 |
| 离线 HTML 缓存的 Service Worker | V1 范围外；P2 |
| 微信小程序原生渲染 | 单独平台；P2 |
| 性能基准测试套件 | 平台级工具；非单功能所需 |

### 已有内容（工程）
| 子问题 | 已有方案 |
|--------|----------|
| 文件服务按 UUID 提供文件 | `files.py` 端点 |
| Work 记录创建 + WorkFile 注册 | `_create_work_record()` |
| 快照保存/恢复模式 | `save_snapshot()` / `get_snapshot()` in base executor |
| Mock 执行模式 | `_mock_execute()` in base.py |

### 故障模式注册表
| 故障模式 | 概率 | 影响 | 检测 | 缓解措施 |
|---------|------|------|------|---------|
| LLM 生成截断的 HTML（token 限制） | 中 | 严重 | 当前：无。修复：增加 `</html>` 检查 | 完整性扫描 + 使用更高限制重试 |
| LLM 改变了占位符 | 中 | 高 | 当前：无。修复：增加正则扫描 | 注入前验证；不匹配时重试 |
| LLM 生成无效 JS | 中 | 高 | 当前：无。修复：增加 JS 语法检查 | 可通过运行时 try/catch 或正则检测 |
| 用户内容被注入为 XSS | 低 | 中 | 当前：无。修复：增加消毒 | 剥离 `<script>` 和 `on*=` 属性 |
| 快照格式不兼容 | 低 | 中 | 部署后第一个任务失败 | 检查 `html_path` 是否存在；回退 |
| 音频自动播放静默失败 | 高 | 中 | 用户听不到任何声音，无错误提示 | 非静默 catch + 视觉反馈 |
| 图片加载空白屏幕 | 高 | 中 | 用户 1-5 秒仅看到文字 | 预加载 + 背景色占位 |

**第三阶段完成。** 仅子代理（Codex 不可用）。20 个发现（4 严重，6 高，10 中）。
进入第四阶段（最终批准关卡）。

---

## /autoplan 审核 — 跨阶段主题

**主题 1：LLM 生成 HTML 是错误架构** — 在 CEO（发现 1，严重）、设计（多个关于提示词脆弱性的发现）、工程（发现 1.1，严重）中均被标记。**高置信度信号**：三个独立审核都集中在此。LLM 应该生成内容（JSON 故事数据），而非代码（HTML/CSS/JS）。

**主题 2：占位符替换需要验证关卡** — 在 CEO（发现 3，高）、设计（发现 4，高）、工程（发现 3.1，严重）中均被标记。共同发现：`str.replace()` 没有前置或后置验证保证静默资产失败。通过正则扫描容易修复。

**主题 3：移除 PDF 是功能退化** — 在 CEO（发现 2，高）、设计（发现 8，中）、工程（发现 8.3，高）中均被标记。PDF 服务于不同的使用场景（微信分享、打印、离线）。共识：保留 PDF 作为并行输出。

**主题 4：离线 ZIP 体验受损** — 在 CEO（发现 4，中）、设计（发现 6，中）、工程（发现 8.2，高）中均被标记。服务器 URL 在 `file:///` 下无法工作。共识：为 ZIP 生成相对路径的 HTML。

**主题 5：缺少自动化测试** — 在工程（发现 7.1-7.4）中标记。新的关键代码路径（URL 注入、占位符验证、HTML 完整性）没有测试。发布前必须添加。

### 实施任务（跨阶段汇总）

- [ ] **P1（人工：2h / CC：30min）— 架构** — 将 LLM 生成 HTML 替换为固定模板方案：LLM 输出 JSON 故事数据，确定性模板渲染 HTML
  - 来源：第一阶段（CEO）— 发现 1 — LLM 生成 HTML 是错误架构
  - 文件：apps/backend/app/prompts/storybook_html.py，apps/backend/app/executors/storybook.py

- [ ] **P1（人工：30min / CC：5min）— 验证** — 增加占位符验证关卡：用正则扫描 HTML 中的 `__PAGE_\d+_(IMAGE|AUDIO)__`，与预期集合比较，不匹配则拒绝并重试
  - 来源：第一阶段（CEO），第二阶段（设计），第三阶段（工程）— 发现 3 / 发现 4 / 发现 3.1
  - 文件：apps/backend/app/prompts/storybook_html.py

- [ ] **P1（人工：30min / CC：5min）— 验证** — 增加 HTML 完整性检查：验证关闭 `</html>` 标签和所有预期的 `.page` 元素存在；截断时用更高的 token 限制重试
  - 来源：第三阶段（工程）— 发现 2.1
  - 文件：apps/backend/app/executors/storybook.py

- [ ] **P1（人工：15min / CC：2min）— 性能** — HTML 生成步骤中关闭 `thinking=True`（格式化任务，非推理）
  - 来源：第三阶段（工程）— 发现 5.2
  - 文件：apps/backend/app/executors/storybook.py

- [ ] **P1（人工：15min / CC：2min）— 安全** — 增加 HTML 消毒：从 LLM 输出中剥离 `<script>` 标签和 `on*=` 事件处理器属性
  - 来源：第三阶段（工程）— 发现 6.1
  - 文件：apps/backend/app/executors/storybook.py

- [ ] **P2（人工：1h / CC：10min）— 功能** — 保留 PDF 作为并行输出：在步骤 5 中同时运行 `_generate_html()` 和 `_generate_pdf_and_zip()`，两者都注册为 WorkFile
  - 来源：第一阶段（CEO），第二阶段（设计），第三阶段（工程）— 发现 2 / 发现 8 / 发现 8.3
  - 文件：apps/backend/app/executors/storybook.py

- [ ] **P2（人工：1h / CC：10min）— 功能** — 为 ZIP 增加离线 HTML 变体：为 ZIP 下载生成相对路径 HTML（`images/page_001.png`，`audio/page_001.mp3`）
  - 来源：第一阶段（CEO），第二阶段（设计），第三阶段（工程）— 发现 4 / 发现 6 / 发现 8.2
  - 文件：apps/backend/app/executors/storybook.py，apps/backend/app/prompts/storybook_html.py

- [ ] **P1（人工：30min / CC：5min）— 错误处理** — 增加带修正的重试：验证失败时，将验证错误作为反馈重新提示 LLM
  - 来源：第三阶段（工程）— 发现 3.2
  - 文件：apps/backend/app/executors/storybook.py

- [ ] **P1（人工：30min / CC：5min）— 测试** — 为 inject_asset_urls、build_placeholder_map、占位符验证添加单元测试
  - 来源：第三阶段（工程）— 发现 7.1
  - 文件：tests/（新测试模块）

- [ ] **P1（人工：1h / CC：10min）— 测试** — 为完整 HTML 管道添加集成测试（Mock LLM → 注入 → 验证最终 HTML）
  - 来源：第三阶段（工程）— 发现 7.2
  - 文件：tests/（新测试模块）

- [ ] **P2（人工：30min / CC：5min）— 提示词工程** — 在提示词模板中添加交互元素的 stopPropagation、图片加载状态、非静默音频错误处理、aria 角色
  - 来源：第二阶段（设计）— 发现 1、2、3、9
  - 文件：apps/backend/app/prompts/storybook_html.py

- [ ] **P2（人工：15min / CC：2min）— 配置** — 增加功能开关 `STORYBOOK_USE_HTML` 默认关闭
  - 来源：第一阶段（CEO）— 发现 7
  - 文件：apps/backend/app/core/config.py，apps/backend/app/executors/storybook.py

---

## 无需改动的地方

| 模块 | 原因 |
|------|------|
| ZIP 下载 | `os.walk` 遍历全目录，`storybook.html` 自动被打包 |
| 文件 Tab 下载 | 已有通用 `handleDownload(file)`，HTML 文件直接用 |
| Model/Schema | `file_type` 是 String 列，直接写 `"html"` 即可 |

## 改动清单

| # | 文件 | 改动 |
|---|------|------|
| 0 | `apps/backend/app/prompts/storybook_html.py` | **已创建** — 提示词模板 + 替换工具 |
| 1 | `apps/backend/app/core/config.py` | **已创建** — 新增 `PUBLIC_URL` 配置 |
| 2 | `apps/backend/app/api/v1/endpoints/files.py` | `media_type_map` 加 `html` |
| 2 | `apps/backend/app/executors/storybook.py` | 新增 `_generate_html()`，修改步骤 5 调用 |
| 3 | `apps/backend/app/executors/storybook.py` | 修改 `_create_work_record()` 注入 URL + 注册 HTML |
| 4 | `apps/backend/app/executors/storybook.py` | 移除 `PDFGenerator` 依赖 |
| 5 | `apps/backend/app/executors/base.py` | Mock 模式 PDF → HTML |
| 6 | `apps/frontend-user/src/app/works/detail/[id]/page.tsx` | 预览 Tab + 打开按钮，getFileIcon + html |
