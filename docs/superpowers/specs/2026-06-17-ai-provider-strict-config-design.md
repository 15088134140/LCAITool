# AI Provider 严格配置（去除默认值）— 设计文档

> 状态：待 user 评审  
> 日期：2026-06-17  
> 关联：[`docs/superpowers/plans/2026-06-17-creative-video-generator.md`](../plans/2026-06-17-creative-video-generator.md) Task 9 验收暴露 Seedance 401，根因诊断后扩大范围至此重构。

## 背景

执行 Task 9 时，Celery worker 调用 Seedance 返回 `401 AuthenticationError`。诊断结论：

1. `BaseAIProvider` 在 `__init__` 用 `or` 给 `api_base`/`model` 赋默认值；各 provider 又在 `kwargs.get("model", "<硬编码>")` 处叠了一层默认。
2. 数据库 `ai_providers.config` 已经写好 `base_url`、`video_model` 等字段，但代码里大都没读，依赖了硬编码 fallback。
3. 创意视频执行器硬编码 `model="doubao-seedance-1-5-pro-251215"`，与 DB 中 `video_model="doubao-seedance-1.5-pro"` 不一致；外部 API `/api/v1/external/video/generations` 又完全不传 model，依赖 provider 默认。两条调用路径取到的 model 不同源，违反“DB 唯一真相”原则。

## 目标

让 AI Provider 调用链的**身份与模型选型**唯一来源是数据库 `ai_providers.config`：
- 缺失 `api_key` / `base_url` → provider 初始化抛 `ConfigurationError`，不允许任何 fallback。
- 调用 `generate_text/image/video/audio` 时缺失对应 `text_model/image_model/video_model/audio_model` → 返回 `AIResponse(success=False, error=...)`，不允许 fallback。
- 调用方传入的 `model=` 参数被 provider **静默忽略**（不报错，方便存量代码渐进清理）。

## 非目标

- 业务参数（`temperature`/`max_tokens`/`n`/`watermark`/`duration`/`resolution`/`image_size`/`*_timeout` 等）**不在本次范围**，照旧由调用方传或保留代码默认。
- Frontend、admin UI、Celery 调度本次不动。
- 不重写 `docs/superpowers/plans/2026-06-17-creative-video-generator.md`，仅本 spec 与对应实现 plan 记录变化。

## 真相源契约

`ai_providers.config` JSON 列存储以下字段（DB 列类型 `JSONType`）：

| key | 必填 | 用途 | 缺失行为 |
| --- | --- | --- | --- |
| `api_key` | 是 | 鉴权 token / AK | provider `__init__` 抛 `ConfigurationError` |
| `base_url` | 是 | API 根地址 | provider `__init__` 抛 `ConfigurationError` |
| `text_model` | 调用 `generate_text` 时必填 | 文本模型（迁移前 DB 写作 `model`） | `generate_text` 返 `AIResponse(success=False, error="provider <slug> 未配置 text_model")` |
| `image_model` | 调用 `generate_image` 时必填 | 图像模型 | 同上 |
| `video_model` | 调用 `generate_video` 时必填 | 视频模型 | 同上 |
| `audio_model` | 调用 `generate_audio` 时必填 | 语音模型 | 同上 |
| `image_size`/`image_timeout`/`video_timeout`/`timeout` 等 | 可选 | 业务参数 | 不在本次范围，保留现状 |

调用方传入的 `model=` kwargs：**provider 接收但不读取**，按上表行为。

## 数据库迁移

DB schema 不动列，仅迁移 `ai_providers.config` 这个 JSONType 列内部的 key：

| 旧 key | 新 key |
| --- | --- |
| `model` | `text_model` |

`base_url` 在 DB 中保持原名，业务代码统一改用 `base_url`（不再使用 `api_base`），与行业惯例（OpenAI SDK / httpx / axios）一致。

新增 Alembic 迁移文件：`apps/backend/alembic/versions/018_rename_ai_provider_model_key.py`，依赖 head `017_add_user_uploads`。

迁移逻辑（`upgrade()` / `downgrade()` 对称）：

```python
"""Rename ai_providers.config key: model -> text_model."""
from alembic import op

revision = "018_rename_ai_provider_model_key"
down_revision = "017_add_user_uploads"

def upgrade() -> None:
    op.execute("""
        UPDATE ai_providers
        SET config = jsonb_set(config::jsonb, '{text_model}', config::jsonb->'model') - 'model'
        WHERE config IS NOT NULL AND config::jsonb ? 'model';
    """)

def downgrade() -> None:
    op.execute("""
        UPDATE ai_providers
        SET config = jsonb_set(config::jsonb, '{model}', config::jsonb->'text_model') - 'text_model'
        WHERE config IS NOT NULL AND config::jsonb ? 'text_model';
    """)
```

> **注意**：Alembic 迁移**先于代码部署**执行，避免代码上线后还在读旧 key。

## 代码改动

### 1. 新增异常 `app/core/exceptions.py`

```python
class ConfigurationError(Exception):
    """AI Provider 必需配置项缺失。"""
```

不继承 `BusinessException`，避免被 FastAPI 全局 handler 当业务异常处理；让它原样冒泡到 `_resolve_provider`/Celery 错误流。

### 2. `app/providers/ai/base.py`

`BaseAIProvider.__init__`：

```python
def __init__(self, **config):
    api_key = config.get("api_key")
    base_url = config.get("base_url")
    if not api_key:
        raise ConfigurationError(f"ai provider 未配置 api_key: {config.get('slug', '<unknown>')}")
    if not base_url:
        raise ConfigurationError(f"ai provider 未配置 base_url: {config.get('slug', '<unknown>')}")
    self.api_key = api_key
    self.base_url = base_url.rstrip("/")
    self.text_model = config.get("text_model")
    self.image_model = config.get("image_model")
    self.video_model = config.get("video_model")
    self.audio_model = config.get("audio_model")
    self.timeout = config.get("timeout", 60)
    self.image_timeout = config.get("image_timeout", 300)
    self.video_timeout = config.get("video_timeout", 600)
```

- 移除 `self.model` 字段；移除 `self.api_base` 字段（统一改名为 `self.base_url`）。
- 4 个分项 model 允许为 `None`，调用阶段再校验。
- `slug` 由 factory 显式塞入 config 用于错误信息。

### 3. `app/providers/ai/__init__.py`

`AIProviderFactory.get_provider_from_db`：

```python
config = dict(provider.config or {})
api_key = config.get("api_key")
if api_key:
    try:
        config["api_key"] = aes_decrypt(api_key)
    except Exception:
        pass
config["slug"] = provider.slug
return cls.get_provider(provider.slug, **config)
```

- 删除原有 `if not config.get("api_key"): raise ValueError(...)`，让 `BaseAIProvider.__init__` 的 `ConfigurationError` 处理。
- 不再补 `base_url`/`model` 等字段。

### 4. `app/providers/ai/doubao.py`

`__init__` 改为：

```python
def __init__(self, **config):
    super().__init__(**config)
```

各方法去 fallback 并把 `self.api_base` 全部替换为 `self.base_url`：

```python
async def generate_text(self, prompt, system_prompt=None, **kwargs):
    if not self.text_model:
        return AIResponse(success=False, content="", raw_response={},
                          error="provider 'volcano' 未配置 text_model")
    payload = {
        "model": self.text_model,
        "messages": ...,
        "temperature": kwargs.get("temperature", 0.7),
        "max_tokens": kwargs.get("max_tokens", 2048),
        ...
    }
```

`generate_image`：

```python
if not self.image_model:
    return AIResponse(success=False, ..., error="provider 'volcano' 未配置 image_model")
payload = {"model": self.image_model, ...}
```

`generate_video`：

```python
if not self.video_model:
    return AIResponse(success=False, ..., error="provider 'volcano' 未配置 video_model")
payload = {"model": self.video_model, ...}
# 调用方传的 kwargs.get("model") 不再读取
```

`generate_audio`：保持现有 `"Audio generation not implemented for Doubao provider"`。

存量调用点中 `kwargs.get("model")` **被忽略不报错**（不写入 payload，也不抛错）。

### 5. `app/providers/ai/zhipu.py`

- 删除 `self.api_base = self.api_base or "..."`、`self.model = self.model or "GLM-4-Flash"`，统一改读 `self.base_url`。
- `generate_text` 用 `self.text_model`，缺失返错。
- `generate_image` 用 `self.image_model`。
- `generate_audio` 用 `self.audio_model`。

### 6. `app/providers/ai/deepseek.py`

- 删除 `self.api_base = self.api_base or "..."`、`self.model = self.model or "deepseek-v4-flash"`，统一改读 `self.base_url`。
- `generate_text` 用 `self.text_model`。

### 7. `app/providers/ai/dify.py`

- 删除 `self.api_base = self.api_base or "https://api.dify.ai/v1"`，统一改读 `self.base_url`。
- Dify 使用 `workflow_id` 而非 `model`，本次不归类，但同样要求 `workflow_id` 来自 DB（已是这样）。

### 8. `app/executors/creative_video.py`

`execute()` 调 `self.doubao_provider.generate_video(...)` 时**移除** `model="doubao-seedance-1-5-pro-251215"` 参数。其它参数不变。

### 9. `app/executors/storybook.py` / `ecommerce.py` / `marketing.py`

`model="..."` 参数**保留不删**（最小范围原则；provider 端会忽略）。在 commit message 与 spec 风险章节注明。

### 10. `app/api/v1/endpoints/external.py`

无改动。其调用本来就不传 model，现在改完后正好和 DB 唯一真相一致。

`_resolve_provider` 已 `try: ... except ValueError`，需扩展捕获 `ConfigurationError`：

```python
async def _resolve_provider(db, provider_slug):
    try:
        return await AIProviderFactory.get_provider_from_db(db, provider_slug)
    except (ValueError, ConfigurationError) as e:
        raise HTTPException(status_code=502, detail=str(e))
```

### 11. 测试

#### 修改

`tests/unit/providers/test_ai_providers.py`：
- 所有 `DoubaoProvider(api_key="test_key")` 实例化 → `DoubaoProvider(api_key="test_key", base_url="https://test.example.com/api/v3", video_model="test-video-model", text_model="test-text-model", image_model="test-image-model")`，按测试场景塞入需要的 model。
- `test_doubao_generate_video_builds_official_seedance_payload`：断言 `payload["model"] == "test-video-model"`，不再断言硬编码版本号。
- `test_doubao_generate_video_text_only_omits_optional_none_fields`：同上。
- 同步处理 zhipu/deepseek 测试中的 base/model 默认值断言。

`tests/unit/executors/test_creative_video_executor.py`：
- `test_execute_calls_provider_with_seedance_p0_arguments` 中 `assert_awaited_once_with` 移除 `model="doubao-seedance-1-5-pro-251215"`。

#### 新增

`tests/unit/providers/test_ai_providers.py` 增加：
- `test_doubao_provider_init_raises_when_api_key_missing`
- `test_doubao_provider_init_raises_when_base_url_missing`
- `test_doubao_generate_video_returns_error_when_video_model_missing`
- `test_doubao_generate_image_returns_error_when_image_model_missing`
- `test_doubao_generate_text_returns_error_when_text_model_missing`
- `test_doubao_ignores_caller_model_kwarg`（调用方传 model=xxx，断言 payload 仍走 self.video_model）

`tests/unit/providers/` 新增 `test_ai_provider_factory.py`（如果项目尚无）：
- `test_get_provider_from_db_uses_base_url_field`（mock 一个 AiProvider 配置只含 base_url）
- `test_get_provider_from_db_raises_when_api_key_missing`

## 异常流

| 阶段 | 失败 | 行为 |
| --- | --- | --- |
| Provider `__init__` | api_key/base_url 缺失 | 抛 `ConfigurationError` → factory 不捕获 → external API `_resolve_provider` 转 502 / Celery worker 任务失败 |
| `generate_*` 调用 | 对应 model 缺失 | 返回 `AIResponse(success=False, error="provider <slug> 未配置 <kind>_model")` → 调用方原 `if not response.success` 路径处理 |
| `generate_*` 调用 | API 401/超时/HTTP 错误 | 现有路径不变（`AIResponse(success=False, error=...)`） |

## 验证命令

```bash
cd apps/backend
alembic upgrade head    # 必须先于代码部署
pytest tests/unit/providers/test_ai_providers.py \
       tests/unit/executors/test_creative_video_executor.py \
       tests/test_executor_registry.py \
       tests/test_pricing_service.py -v
pnpm --filter @lcaitool/frontend-user exec tsc --noEmit  # 仅确认无回归
```

## 风险

- **R1：storybook 动态 model 选型失效**。`storybook.py` 现在用 `model="deepseek-v4-pro"` vs `"deepseek-v4-flash"` 切换大小模型；本次后 provider 全部按 DB.text_model 执行，差异化能力暂时丢失。**不在本次范围**，标记为后续工作（需要在 storybook 内实现“thinking 模式 → 单独的 provider slug”或扩展 ai_providers 多 model）。
- **R2：DB 现有 `volcano.video_model` 值为 `doubao-seedance-1.5-pro`**，是否被火山方舟接受需在 RDS 上由你确认/调整 admin UI 内的值，本次代码不再硬编码。
- **R3：admin UI 表单**（已验证）。admin 设置页 (`apps/frontend-admin/src/pages/settings/index.tsx`) 用一个 JSON 文本框承载 `config`，没有写死的字段名约束；backend `SettingsService.create_ai_provider/update_ai_provider` 只对 `api_key` 做 AES 加解密，其它 key 全部透传。结论：本次代码统一为 `base_url` 与 DB 一致，admin 现有数据无需迁移；JSON 文本框 placeholder 中的 `"model": "gpt-4"` 顺手改为 `"text_model": "gpt-4"`，避免误导。

### 9b. `apps/frontend-admin/src/pages/settings/index.tsx`

仅一处 placeholder 字符串调整（line ~602）：

```tsx
placeholder='{"api_key": "...", "text_model": "gpt-4"}'
```

不改逻辑、不改类型、不改字段映射。

## 回滚

- 单 commit 边界：1 个 alembic migration commit + 1 个代码 commit。
- 回滚顺序：代码先 revert，再 `alembic downgrade -1`。
- 应急（无需 revert）：DB 内手工恢复 `model` key + 重新部署旧 image。

## 边界确认

- 不修改 DB 表结构（无 ALTER TABLE）。
- 不修改前端表单/校验/类型（admin 仅 placeholder 微调，见 §9b）。
- 不修改 storybook/ecommerce/marketing 的 `model=` 传参（只让 provider 忽略它）。
- 不修改业务参数 fallback（temperature 等）。
