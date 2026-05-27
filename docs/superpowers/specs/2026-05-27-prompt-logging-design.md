# 提示词记录功能设计文档

## 概述

为工具增加"提示词记录开关"（工具级别，默认开启），当开启时自动记录生成过程中发送给大模型的提示词和文本响应，保存到成果根目录的 `prompts.md` 文件中，随 ZIP 打包一起下载。

## 数据模型改动

### Tool 表新增字段

文件：`apps/backend/app/models/tool.py`

```python
is_prompt_logging_enabled = Column(
    Boolean, default=True, nullable=False,
    comment="是否记录提示词（prompt/response 会写入成果目录的 prompts.md）"
)
```

与 `is_mock_enabled` 模式一致，Boolean 类型，默认 True，通过 Alembic migration 生效。

## 执行链路

```
Admin 后台编辑工具 → 切换 [记录提示词] 开关
        ↓
Tool.is_prompt_logging_enabled → tool_config 传递
        ↓
BaseToolExecutor._tool_config 接收
        ↓
执行器在每次 LLM 调用后调用 _record_llm_interaction()
        ↓
写入 {works_dir}/prompts.md
        ↓
用户下载 ZIP → prompts.md 自动打包
```

### tool_config 传递

文件：`apps/backend/app/workers/tasks.py`

`_execute_with_async_session()` 中 `tool_config` 新增：

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

## BaseToolExecutor 新增方法

文件：`apps/backend/app/executors/base.py`

```python
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
    extra_info: Optional[Dict[str, Any]] = None,
) -> None:
```

逻辑：
1. 检查 `self._tool_config.get('is_prompt_logging_enabled', True)`，False 则直接返回
2. 获取 `works_dir`（调用 `self.get_works_dir()`）
3. 如果 `prompts.md` 不存在，写入文件头
4. 构建 Markdown section 并追加写入
5. `response_type="text"` 记录完整响应内容，`response_type="image"|"audio"` 只记录"响应为文件数据，详见 XX 文件"

### 文件头格式

```markdown
# 提示词记录

工具：{tool_name}
任务：{task_id}
执行时间：{timestamp}

---
```

### 每次交互的 Section 格式

```markdown
## Step {index}: {step_name}

- **模型**: {model}
- **耗时**: {duration}s
{f"- **Token数**: 输入 {usage['input']} / 输出 {usage['output']}" if usage}
{f"- **类型**: {response_type}" if response_type != "text"}

{system_prompt_section}
### User Prompt / Text
{prompt}

### Response
{response_content}

---
```

- `response_type="text"` 时，response_content = AI 返回的完整文本
- `response_type="image"` 时，response_content = `图片生成完成 → images/page_NNN.png\n（响应内容为图片数据，不记录）`
- `response_type="audio"` 时，response_content = `语音生成完成 → audio/page_NNN.mp3\n（响应内容为音频数据，不记录）`
- 有 `system_prompt` 时，在 User Prompt 前面插入 `### System Prompt\n{system_prompt}` 段落
- 有 `extra_info` 时（如"第 3/5 张"），在模型行后追加一行 `{extra_info}`

## 各执行器接入

### StorybookExecutor

| 调用位置 | step_name | model | response_type |
|---------|-----------|-------|---------------|
| `_generate_story_outline()` 中的 `generate_text()` | 故事大纲生成 | deepseek-v4-pro (或 v4-flash) | text |
| `_generate_illustration_prompts()` 中的 `generate_text()` | 插画提示词生成 | deepseek-v4-flash | text |
| `_generate_images_serial()` 中的 `generate_image()` | 批量插画生成 | doubao-seedream-4.5 | image |
| `_generate_audio_serial()` 中的 `generate_audio()` | 语音合成 | zhipu-glm-tts | audio |

image/audio 类型需要传入 `extra_info=f"第 {n}/{total} 张"`。

记录代码跟在 LLM 调用行之后，通过 duration 变量传递耗时。

### EcommerceExecutor

Dify 流式调用，最终从 Dify 响应中提取文本结果。在 workflow_finished 事件后，记录 input_params 和 Dify 返回的文本输出。

### MarketingExecutor

回调驱动，在外部系统回调 `POST /tasks/{id}/progress` 时，由外部传入提示词和响应文本。记录时机在回调处理逻辑中。

## 自动纳入 ZIP 下载

现有 `GET /works/{work_id}/download` 走 `os.walk(work_dir)` 打包整个 work 目录。`prompts.md` 放置在 work 目录根目录，自然被包含。无需修改下载逻辑。

## Admin 前端改动

在工具创建/编辑表单的"工具配置"区域增加开关：

```
□ 启用 Mock 执行模式
□ 启用提示词记录（默认开启）  ← 新增
```

位置紧跟在 `is_mock_enabled` 下方。

## 文件清单

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `apps/backend/app/models/tool.py` | 修改 | 加字段 |
| `apps/backend/app/executors/base.py` | 修改 | 加 `_record_llm_interaction()` 方法 |
| `apps/backend/app/workers/tasks.py` | 修改 | tool_config 传递新字段 |
| `apps/backend/app/executors/storybook.py` | 修改 | 4 处 LLM 调用加记录 |
| `apps/backend/app/executors/ecommerce.py` | 修改 | Dify 响应后记录文本 |
| `apps/backend/app/executors/marketing.py` | 修改 | 回调处理加记录 |
| `apps/frontend-admin/src/pages/tools/index.tsx` | 修改 | 列表显示记录状态 |
| `apps/frontend-admin/src/pages/tools/create.tsx` | 修改 | 创建表单加开关 |
| `apps/frontend-admin/src/pages/tools/edit.tsx` | 修改 | 编辑表单加开关 |
| alembic 迁移文件 | 新增 | 字段 DDL |
