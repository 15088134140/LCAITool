<!-- /autoplan restore point: /Users/mark/.gstack/projects/15088134140-LCAITool/main-autoplan-restore-20260527-153647.md -->
# 提示词记录功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为工具增加提示词记录开关，开关开启时将每次 LLM 调用的 prompt 和 text response 记录到成果目录的 prompts.md 中，随 ZIP 下载包含。

**Architecture:** Tool model 增加 `is_prompt_logging_enabled` 字段 → tool_config 传入执行器 → `BaseToolExecutor._record_llm_interaction()` 写入 prompts.md → 各执行器在 LLM 调用后追加记录。注意：_record_llm_interaction 使用 asyncio.Lock 保证并发安全，BaseToolExecutor.__init__ 显式接收 tool 参数存储 _tool_config。

**Tech Stack:** Python/FastAPI/SQLAlchemy, React/TypeScript, Alembic

---

### Task 1: 后端 Model + Migration

**Files:**
- Modify: `apps/backend/app/models/tool.py:56`
- Create: `apps/backend/alembic/versions/014_add_tool_is_prompt_logging_enabled.py`
- Modify: `apps/backend/app/workers/tasks.py:356-362`

- [ ] **Step 1: 在 Tool model 加字段**

在 `apps/backend/app/models/tool.py` 的 `is_mock_enabled` 后追加：

```python
is_prompt_logging_enabled = Column(
    Boolean, default=False, nullable=False,
    comment="是否记录提示词（prompt/response 会写入成果目录的 prompts.md，默认关闭以避免存量工具意外开启）"
)
```

- [ ] **Step 2: 创建 Alembic migration**

创建 `apps/backend/alembic/versions/014_add_tool_is_prompt_logging_enabled.py`：

```python
"""add is_prompt_logging_enabled to tools

Revision ID: 014_add_tool_is_prompt_logging_enabled
Revises: 013_add_work_soft_delete
Create Date: 2026-05-27

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '014_add_tool_is_prompt_logging_enabled'
down_revision: Union[str, None] = '013_add_work_soft_delete'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tools', sa.Column('is_prompt_logging_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false'), comment='是否记录提示词'))
    op.alter_column('tools', 'is_prompt_logging_enabled', server_default=None)


def downgrade() -> None:
    op.drop_column('tools', 'is_prompt_logging_enabled')
```

- [ ] **Step 3: tool_config 传递新字段**

在 `apps/backend/app/workers/tasks.py` 的 `_execute_with_async_session()` 中，找到 tool_config 构建处（约第 356 行），加上：

```python
tool_config = {
    'base_fee': tool.base_fee,
    'image_fee': tool.image_fee,
    'audio_fee': tool.audio_fee,
    'token_fee': tool.token_fee,
    'is_mock_enabled': tool.is_mock_enabled,
    'is_prompt_logging_enabled': tool.is_prompt_logging_enabled,  # 新增
}
```

- [ ] **Step 4: BaseToolExecutor.__init__ 增加 tool 参数**（关键修复：否则 _record_llm_interaction 会 AttributeError）

在 `apps/backend/app/executors/base.py` 的 `__init__` 签名中增加 `tool` 参数：

```python
def __init__(
    self,
    task_id: uuid.UUID,
    db: AsyncSession,
    tool: Optional[Dict[str, Any]] = None,  # 新增
    progress_callback: Optional[Callable[[int, str, Optional[Dict[str, Any]]], Awaitable[None]]] = None
):
    ...
    self._tool_config = tool or {}  # 新增
    self._prompts_lock = asyncio.Lock()  # 新增：用于保护 prompts.md 并发写入
```

同时更新 storybook.py 中 `StorybookExecutor.__init__` 改为调用 `super().__init__(**kwargs)` 模式，避免重复定义 tool 参数。

- [ ] **Step 5: 后端 API Schema 加 is_prompt_logging_enabled**

在后端的 Tool Pydantic Schema（如 `apps/backend/app/schemas/tool.py`）中，在 ToolResponse 和 CreateToolParams/UpdateToolParams 中加入 `is_prompt_logging_enabled: bool = False`。

- [ ] **Step 6: 验证编译**

```bash
cd apps/backend && python -c "from app.executors.base import BaseToolExecutor; print('OK')"
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/models/tool.py apps/backend/alembic/versions/014_add_tool_is_prompt_logging_enabled.py apps/backend/app/workers/tasks.py
git commit -m "feat: add is_prompt_logging_enabled field to Tool model (Task 1)"
```

---

### Task 2: BaseToolExecutor 新增 `_record_llm_interaction()` 方法

**Files:**
- Modify: `apps/backend/app/executors/base.py`

- [ ] **Step 1: 在 class BaseToolExecutor 中新增方法**

在 `get_works_dir()` 方法后（第 150 行后）新增 `_build_prompts_header()` 和 `_record_llm_interaction()`：

```python
def _build_prompts_header(self) -> str:
    """构建 prompts.md 文件头"""
    now = datetime.now(timezone.utc).astimezone().strftime('%Y-%m-%d %H:%M:%S')
    return (
        "# 提示词记录\n\n"
        f"任务：{str(self.task_id)}\n"
        f"执行时间：{now}\n\n"
        "---\n"
    )

def _build_llm_section(
    self,
    step_name: str,
    model: str,
    prompt: str,
    response: Any,
    response_type: str = "text",
    system_prompt: Optional[str] = None,
    duration: Optional[float] = None,
    usage: Optional[Dict[str, Any]] = None,
    extra_info: Optional[Dict[str, Any]] = None,
) -> str:
    """构建单次 LLM 交互的 Markdown section"""
    lines = [f"\n## {step_name}\n"]
    lines.append(f"- **模型**: {model}")
    if duration is not None:
        lines.append(f"- **耗时**: {duration:.1f}s")
    if usage and 'input' in usage:
        input_tokens = usage.get('input', '?')
        output_tokens = usage.get('output', '?')
        lines.append(f"- **Token数**: 输入 {input_tokens} / 输出 {output_tokens}")
    if response_type != "text":
        lines.append(f"- **类型**: {'图片' if response_type == 'image' else '音频'}")
    if extra_info:
        lines.append(f"- **{extra_info}**")
    lines.append("")

    if system_prompt:
        lines.append("### System Prompt\n")
        lines.append(system_prompt)
        lines.append("")

    if response_type == "text":
        if system_prompt:
            lines.append("### User Prompt\n")
        else:
            lines.append("### Prompt\n")
        lines.append(prompt)
        lines.append("")
        lines.append("### Response\n")
        response_text = response.content if hasattr(response, 'content') else str(response)
        lines.append(response_text)
    elif response_type == "image":
        lines.append("### Prompt\n")
        lines.append(prompt)
        lines.append("")
        lines.append("### Response\n")
        lines.append("（响应内容为图片数据，不记录）")
    elif response_type == "audio":
        lines.append("### Text\n")
        lines.append(prompt)
        lines.append("")
        lines.append("### Response\n")
        lines.append("（响应内容为音频数据，不记录）")

    lines.append("\n---")
    return "\n".join(lines)

async def _record_llm_interaction(
    self,
    step_name: str,
    model: str,
    prompt: str,
    response: Any,
    response_type: str = "text",
    system_prompt: Optional[str] = None,
    duration: Optional[float] = None,
    usage: Optional[Dict[str, Any]] = None,
    extra_info: Optional[str] = None,  # 改为 str 类型（原为 Dict，与实际使用矛盾）
) -> None:
    """
    记录一次 LLM 交互到 prompts.md（线程安全，使用 asyncio.Lock）

    :param step_name: 步骤名称，如 "故事大纲生成"
    :param model: 模型名称，如 "deepseek-v4-pro"
    :param prompt: 发送给模型的提示词文本
    :param response: 模型响应
    :param response_type: "text" | "image" | "audio"
    :param system_prompt: 可选的 system prompt
    :param duration: 调用耗时（秒）
    :param usage: Token 用量 {"input": N, "output": N}
    :param extra_info: 额外信息字符串，如 "第 3/5 张图片"
    """
    if not self._tool_config.get('is_prompt_logging_enabled', False):
        return

    async with self._prompts_lock:  # 并发安全：防止并行协程写交错
        works_dir = self.get_works_dir()
        filepath = os.path.join(works_dir, 'prompts.md')

        if not os.path.exists(filepath):
            header = self._build_prompts_header()
            async with aiofiles.open(filepath, 'w', encoding='utf-8') as f:
                await f.write(header)

        section = self._build_llm_section(
            step_name=step_name,
            model=model,
            prompt=prompt,
            response=response,
            response_type=response_type,
            system_prompt=system_prompt,
            duration=duration,
            usage=usage,
            extra_info=extra_info,
        )
        async with aiofiles.open(filepath, 'a', encoding='utf-8') as f:
            await f.write(section)
```

需要加的 import（在文件顶部）：

```python
import time
from datetime import datetime, timezone
import aiofiles
```

注意 `aiofiles` 已经从 storybook.py 中 import 了，需要在 base.py 中也引入。

同时在 `_build_prompts_header()` 中修复两个问题：
1. 使用 `datetime.now(timezone.utc).astimezone()` 代替 `datetime.now()`（时区感知）
2. 使用 `str(self.task_id)` 避免 UUID 对象被格式化为 `UUID('xxx')` 形式

- [ ] **Step 2: 运行测试确保 base 模块可正常导入**

```bash
cd apps/backend && python -c "from app.executors.base import BaseToolExecutor; print('OK')"
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/app/executors/base.py
git commit -m "feat: add _record_llm_interaction method to BaseToolExecutor (Task 2)"
```

---

### Task 3: StorybookExecutor 接入记录

**Files:**
- Modify: `apps/backend/app/executors/storybook.py`

- [ ] **Step 1: 在 `_generate_story_outline()` 中加记录**

在 `_generate_story_outline()` 的 `generate_text()` 调用后（第 260-267 行），加耗时计算和记录调用：

```python
_t0 = time.time()
response = await self.deepseek_provider.generate_text(
    prompt=user_prompt,
    system_prompt=system_prompt,
    thinking=True
)
_t1 = time.time()

await self._record_llm_interaction(
    step_name="故事大纲生成",
    model="deepseek-v4-pro" if 'thinking' in str(self.deepseek_provider.__class__) else "deepseek-v4-flash",
    prompt=user_prompt,
    system_prompt=system_prompt,
    response=response,
    response_type="text",
    duration=_t1 - _t0,
    usage={"input": response.usage.input_tokens, "output": response.usage.output_tokens}
        if response.usage else None,
)
```

- [ ] **Step 2: 在 `_generate_illustration_prompts()` 中加记录**

在 `_generate_illustration_prompts()` 的 `generate_text()` 调用后：

```python
_t0 = time.time()
response = await self.deepseek_provider.generate_text(
    prompt=user_prompt,
    system_prompt=system_prompt,
    thinking=False
)
_t1 = time.time()

await self._record_llm_interaction(
    step_name="插画提示词生成",
    model="deepseek-v4-flash",
    prompt=user_prompt,
    system_prompt=system_prompt,
    response=response,
    response_type="text",
    duration=_t1 - _t0,
    usage={"input": response.usage.input_tokens, "output": response.usage.output_tokens}
        if response.usage else None,
)
```

- [ ] **Step 3: 在 `_generate_images_serial()` 中加记录**（⚠️ 注意：此方法内 generate_single 使用信号量并发，多个协程同时调用 _record_llm_interaction，因该方法内部已使用 asyncio.Lock，写入安全）

在 `generate_single()` 内部调用 `generate_image()` 后：

```python
_t0 = time.time()
response = await self.doubao_provider.generate_image(prompt=prompt, size="1920x1920")
_t1 = time.time()

await self._record_llm_interaction(
    step_name="批量插画生成",
    model="doubao-seedream-4.5",
    prompt=prompt,
    response=response,
    response_type="image",
    duration=_t1 - _t0,
    extra_info=f"第 {index + 1}/{total_pages} 张",
)
```

- [ ] **Step 4: 在 `_generate_audio_serial()` 中加记录**（同样使用信号量并发，asyncio.Lock 保证安全）

在 `generate_single()` 内部调用 `generate_audio()` 后：

```python
_t0 = time.time()
response = await self.zhipu_provider.generate_audio(text=text, voice=voice)
_t1 = time.time()

await self._record_llm_interaction(
    step_name="语音合成",
    model="zhipu-glm-tts",
    prompt=text,
    response=response,
    response_type="audio",
    duration=_t1 - _t0,
    extra_info=f"第 {index + 1}/{total_pages} 段",
)
```

需要加的 import（文件顶部已有 `time` 则无需加，如无则加 `import time`）。

- [ ] **Step 5: Mock 模式也写入 prompts.md 说明**

在 `apps/backend/app/executors/base.py` 的 `_mock_execute()` 中，在创建成果前（第 230 行后），添加一条模拟记录：

```python
if self._tool_config.get('is_prompt_logging_enabled', False):
    await self._record_llm_interaction(
        step_name="模拟执行说明",
        model="mock",
        prompt="（模拟执行模式，未实际调用 AI）",
        response=type('obj', (object,), {'content': '此任务使用模拟数据执行，不涉及真实 AI 调用。如需真实记录，请关闭 Mock 执行模式。'})(),
        response_type="text",
    )
```

- [ ] **Step 6: Commit**

```bash
git add apps/backend/app/executors/storybook.py
git commit -m "feat: add prompt logging to StorybookExecutor (Task 3)"
```

---

### Task 4: Admin 前端 - API 类型 + 创建/编辑表单

**Files:**
- Modify: `apps/frontend-admin/src/api/tool.ts`
- Modify: `apps/frontend-admin/src/pages/tools/create.tsx`
- Modify: `apps/frontend-admin/src/pages/tools/[id]/edit.tsx`

- [ ] **Step 1: API 类型加 `is_prompt_logging_enabled`**

在 `apps/frontend-admin/src/api/tool.ts` 的 `Tool` 接口中 `is_mock_enabled` 后加：

```typescript
is_prompt_logging_enabled?: boolean;
```

在 `CreateToolParams` 接口中 `is_mock_enabled` 后加：

```typescript
is_prompt_logging_enabled?: boolean;
```

在 `UpdateToolParams` 接口中 `is_mock_enabled` 后加：

```typescript
is_prompt_logging_enabled?: boolean;
```

- [ ] **Step 2: 创建表单加 checkbox + 视觉状态**

⚠️ **不要放在 Mock 执行模式下方**。因为 Mock 是开发人员开关，而提示词记录是数据治理开关，放一起会误导管理员。应在 Mock checkbox 所在的 `</div>` 之后，新建一个带标题的分组区域。

在 `apps/frontend-admin/src/pages/tools/create.tsx` 中，找到 Mock 执行模式 checkbox 所在 div 后（第 314 行后），追加新分组：

```tsx
</div> {/* 结束 Mock 所在的 col-span-2 原有分组 */}

{/* ===== 数据与调试 分组 ===== */}
<div className="col-span-2 border-t border-gray-200 pt-6 mt-4">
  <h3 className="text-md font-semibold text-gray-800 mb-3">数据与调试</h3>

  <div className="flex items-center gap-3">
    <input
      type="checkbox"
      id="is_prompt_logging_enabled"
      checked={formData.is_prompt_logging_enabled !== false}
      onChange={(e) => handleInputChange('is_prompt_logging_enabled', e.target.checked)}
      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
    />
    <label htmlFor="is_prompt_logging_enabled" className="text-sm font-medium text-gray-700 cursor-pointer">
      启用提示词记录
    </label>
  </div>
  <p className="text-xs text-gray-500 mt-1 ml-7">
    开启后，每次 AI 调用的输入输出将记录到成果 ZIP 中，便于调试和审计
  </p>

  {/* 关闭状态的提示 */}
  {!formData.is_prompt_logging_enabled && (
    <p className="text-xs text-amber-600 mt-2 ml-7">
      关闭后，AI 调用的提示词和响应将不会被记录到成果目录中
    </p>
  )}

  {/* Mock + 记录同时开启的提示 */}
  {formData.is_mock_enabled && formData.is_prompt_logging_enabled && (
    <p className="text-xs text-amber-600 mt-2 ml-7">
      提示：Mock 模式下记录的是模拟数据，非真实 AI 调用结果
    </p>
  )}
</div>
```

并且 `formData` 的初始值加 `is_prompt_logging_enabled: false`（默认关闭，管理员手动开启）。

⚠️ **关键：提交时如果从开启变为关闭，需要确认弹窗**：

在提交处理函数中（约第 230 行 `handleSubmit`），加确认逻辑：

```typescript
const handleSubmit = async () => {
  // 如果之前是开启，现在改为关闭 -> 确认
  if (previousValue?.is_prompt_logging_enabled === true && formData.is_prompt_logging_enabled === false) {
    const confirmed = window.confirm(
      '关闭提示词记录后，后续任务的 AI 调用将不再生成 prompts.md 文件。\n' +
      '已有任务的记录不会被删除。确定要关闭吗？'
    );
    if (!confirmed) return;
  }
  // ... 原有提交逻辑
};
```

- [ ] **Step 3: 编辑表单加 checkbox + 加载初始值**

编辑表单在同样的位置（Mock 所在分组闭合 `</div>` 后）添加与创建表单相同的"数据与调试"分组代码（包括关闭提示、Mock+记录组合提示）。

`loadTool()` 中 `setFormData` 加 `is_prompt_logging_enabled: data.is_prompt_logging_enabled !== false`。

保存一个 `previousValue` 引用用于提交确认弹窗（见 Step 2 的逻辑）。

- [ ] **Step 4: Commit**

```bash
git add apps/frontend-admin/src/api/tool.ts apps/frontend-admin/src/pages/tools/create.tsx apps/frontend-admin/src/pages/tools/[id]/edit.tsx
git commit -m "feat: add prompt logging toggle to admin tool forms (Task 4)"
```

---

### Task 5: EcommerceExecutor + MarketingExecutor 接入记录

**Files:**
- Modify: `apps/backend/app/executors/ecommerce.py`
- Modify: `apps/backend/app/executors/marketing.py`

- [ ] **Step 1: EcommerceExecutor 记录 Dify 输入输出**

⚠️ **注意**：不要用 `type('obj', ...)` 构造伪对象——这是脆弱的 hack。应使用数据类或 dataclass。

在 `apps/backend/app/executors/base.py` 中（或在 ecommerce.py 中）定义一个轻量记录响应数据类：

```python
@dataclass
class RecordedResponse:
    """用于记录 LLM 交互的轻量响应包装"""
    content: str
    usage: Optional[Dict[str, Any]] = None
```

然后在 ecommerce.py 中使用：

```python
# execute() 方法开始时设置 _t0（避免在回调内部引用越界）
_t0 = time.time()
dify_inputs = {
    "product_name": params.get("product_name", ""),
    "product_description": params.get("product_description", ""),
    "main_image_count": params.get("main_image_count", 3),
    "detail_image_count": params.get("detail_image_count", 3),
}

# ... （原有 Dify 调用代码，在 workflow_finished 事件中记录 _t1）

# 在 workflow_finished 事件处理后（第 123 行后），取 outputs 中的文本内容记录
_t1 = time.time()
copywriting = outputs.get("copywriting", {})
text_output = json.dumps(copywriting, ensure_ascii=False, indent=2) if copywriting else "（无文本输出）"

await self._record_llm_interaction(
    step_name="Dify 工作流",
    model="dify-workflow",
    prompt=json.dumps(dify_inputs, ensure_ascii=False, indent=2),
    response_type="text",
    response=RecordedResponse(content=text_output),
    duration=_t1 - _t0,
)
```

需要加 import：`import time`（json 已有）。从 base.py 引入 `RecordedResponse`。

- [ ] **Step 2: MarketingExecutor 记录回调输入**

阅读 `apps/backend/app/executors/marketing.py`，在其进度回调处理或 `execute()` 末尾加上记录（从回调 data 中提取 prompt 和 response）：

```python
# 在 execute() 方法的最后，保存前记录
await self._record_llm_interaction(
    step_name="营销文案生成",
    model="external-callback",
    prompt=json.dumps(params, ensure_ascii=False, indent=2),
    response_type="text",
    response=RecordedResponse(content=result_data.get('copywriting', '（无文本输出）')),
)
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/app/executors/ecommerce.py apps/backend/app/executors/marketing.py
git commit -m "feat: add prompt logging to Ecommerce and Marketing executors (Task 5)"
```

---

### Task 6: Admin 工具列表显示记录状态

**Files:**
- Modify: `apps/frontend-admin/src/pages/tools/index.tsx`

- [ ] **Step 1: 列表 Mock 列后加「记录」列**

在工具列表表格的 Mock 列后（第 208 行的 th 之后），加一个 `<th>`：

```tsx
<th className="text-left px-6 py-4 text-sm font-semibold text-gray-600" title="每次 AI 调用的提示词和响应是否记录到 prompts.md 中">提示词记录</th>
```

在每行的 Mock 状态单元格后（第 282 行后的 td），加一个 `<td>`（使用蓝色徽章与 Mock 列的紫色徽章区分）：

```tsx
<td className="px-6 py-4">
  {tool.is_prompt_logging_enabled === false ? (
    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-500" title="提示词记录已关闭">
      <svg className="inline w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
      关闭
    </span>
  ) : (
    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700" title="开启：AI 调用记录将写入 prompts.md">
      <svg className="inline w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
      开启
    </span>
  )}
</td>
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend-admin/src/pages/tools/index.tsx
git commit -m "feat: show prompt logging status in admin tool list (Task 6)"
```

---

### Task 7: 验证执行 + 清理策略

- [ ] **Step 1: 验证后端 Schema 暴露**

确认 `apps/backend/app/schemas/tool.py` 中 ToolResponse 包含 `is_prompt_logging_enabled: bool`。

```bash
cd apps/backend && python -c "
from app.schemas.tool import ToolResponse
assert 'is_prompt_logging_enabled' in ToolResponse.model_fields
print('OK: is_prompt_logging_enabled in response schema')
"
```

- [ ] **Step 2: 运行后端测试**

```bash
cd apps/backend && python -m pytest tests/ -x -v 2>&1 | head -50
```

- [ ] **Step 3: 编译前端类型检查**

```bash
cd apps/frontend-admin && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: 确认 prompts.md 自动纳入 ZIP**

验证：`GET /works/{work_id}/download` 使用 `os.walk(work_dir)` 打包，prompts.md 在 work 目录根目录，无需修改即自动包含。

- [ ] **Step 5: 确认 prompts.md 清理策略**

考虑将来将 prompts.md 纳入 `cleanup_expired_results` 任务（当前只清理数据库字段，不清理文件系统）。或者添加独立的 retention 策略：超过 30 天的 prompts.md 文件自动删除。当前阶段可延迟到 P2，但需要知悉此限制。

- [ ] **Step 6: PII 审核备注**

由于 prompts.md 可能包含用户输入的敏感信息（故事主题、产品详情等），虽然目前只是在 ZIP 中提供给创作者自己，但仍需注意：管理员后台应提供"清理所有提示词记录"功能，以及在用户侧公示"使用此功能将记录 AI 交互过程"。

- [ ] **Step 7: 最终 commit（如果有修复）**

```bash
git add -A
git commit -m "fix: address review issues (Task 7)"
```


---

## GSTACK REVIEW REPORT

### 审查概况

| 维度 | 结果 | 说明 |
|------|------|------|
| CEO 审查 | 8 个发现 (1 严重/4 高/3 中) | 框架偏移、隐私风险、透明化机会 |
| 设计审查 | 9 个发现 (1 严重/3 高/5 中) | 信息层级、缺失状态、列标识 |
| 工程审查 | 11 个发现 (2 严重/3 高/4 中/2 低) | 并发写入、基类架构、PII 风险 |
| 合计 | 28 个发现 | 5 严重 + 10 高 + 12 中 + 2 低 |

### 跨阶段主题

**主题 1: `default=True` 对存量工具的数据隐私风险** — 在 CEO/Eng/Design 三个视角中均被独立标记。所有模型一致认为应改为 `default=False`（opt-in 模式）。已采纳，已将 model 和 migration 的默认值改为 `False`。

**主题 2: 并发文件写入竞态** — Eng 审查发现 storybook 的 `_generate_images_serial` 和 `_generate_audio_serial` 使用信号量并行，同时写 prompts.md 会导致数据交错。已在 `_record_llm_interaction` 中添加 `asyncio.Lock`。

**主题 3: `BaseToolExecutor.__init__` 缺少 `_tool_config`** — CEO 和 Eng 均发现此问题，将导致 `AttributeError`。已添加 `tool` 参数和 `self._tool_config`。

### 关键修改清单（已写入本计划）

| # | 位置 | 修改内容 |
|---|------|---------|
| 1 | Task 1, Step 1 | model `default=True` → `default=False` |
| 2 | Task 1, Step 2 | migration `server_default=sa.text('true')` → `sa.text('false')` |
| 3 | Task 1, Step 4 (新增) | `BaseToolExecutor.__init__` 加 `tool` 参数 + `_prompts_lock` |
| 4 | Task 1, Step 5 (新增) | 后端 Pydantic Schema 加 `is_prompt_logging_enabled` |
| 5 | Task 2, Step 1 | `_record_llm_interaction` 包裹 `async with self._prompts_lock` |
| 6 | Task 2, Step 1 | `_build_prompts_header` 使用时区感知时间 + `str(self.task_id)` |
| 7 | Task 2, Step 1 | `extra_info` 类型 `Dict[str, Any]` → `str` |
| 8 | Task 2, Step 1 | `_record_llm_interaction` 默认值 `True` → `False` |
| 9 | Task 3, Step 5 (新增) | Mock 模式写入 prompts.md 说明 |
| 10 | Task 4, Step 2 | 新增"数据与调试"分组，分离 Mock 和记录开关 |
| 11 | Task 4, Step 2 | 缩短标签文案、加关闭提示、加 Mock+记录组合警告 |
| 12 | Task 4, Step 2 | 提交确认弹窗（从开启→关闭时） |
| 13 | Task 4, Step 3 | 编辑表单同样改造，`formData` 默认 `false` |
| 14 | Task 5, Step 1 | 用 `RecordedResponse` dataclass 替代 `type('obj', ...)` |
| 15 | Task 5, Step 2 | Marketing 同样使用 `RecordedResponse` |
| 16 | Task 6, Step 1 | 列标题"记录"→"提示词记录"，加 tooltip 和图标 |
| 17 | Task 6, Step 1 | 徽章颜色绿色→蓝色（与 Mock 列紫色区分） |
| 18 | Task 7, Step 5 (新增) | 添加清理策略备注 |
| 19 | Task 7, Step 6 (新增) | PII 审核备注 |

### 已确定自动决策

| # | 阶段 | 决策 | 分类 | 原则 | 说明 |
|---|------|------|------|------|------|
| 1 | CEO | 接受所有 premises | 机制 | P6 | 计划前提合理，无需修改 |
| 2 | CEO | `default=True` → `False` | 机制 | P1 | 隐私安全优先，opt-in 更安全 |
| 3 | CEO | 不扩展用户端功能 | 品味 | P3 | "透明化"功能值得做，但应单独计划，不在此次范围 |
| 4 | 设计 | checkbox 从 Mock 后移出 | 机制 | P5 | 功能用途不同，不应放在一起 |
| 5 | 设计 | 列标题+图标区分 | 品味 P1 | 避免混淆，易用性 |
| 6 | 工程 | 添加 asyncio.Lock | 机制 | P1 | 不修复则生产环境数据损坏 |
| 7 | 工程 | 修复 BaseExecutor.__init__ | 机制 | P1 | 不修复则 AttributeError 崩溃 |
| 8 | 工程 | 模拟对象用 dataclass | 机制 | P5 | 清晰胜过 hack |
| 9 | 工程 | 清理策略延迟到 P2 | 品味 | P6 | 不影响核心功能，可延迟 |

### 未纳入范围

- 用户端"查看 AI 过程"功能（CEO 建议——单独计划处理）
- prompts.md 自动清理策略（记录为 P2）
- 跨任务提示词搜索/分析（记录为 P2）
- 用户端提示词记录公示（后续迭代）
