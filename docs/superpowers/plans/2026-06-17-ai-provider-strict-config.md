# AI Provider 严格配置（去除默认值）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 AI Provider 调用链的身份与模型选型唯一来源是数据库 `ai_providers.config`；缺失关键配置时清晰失败、不静默 fallback。

**Architecture:** Alembic 先迁移 DB 内 JSON key（`model → text_model`）；代码层移除所有 provider 的 `api_base`/`model` 默认值与方法内 `kwargs.get(model, default)`；`BaseAIProvider.__init__` 改为校验 `api_key`/`base_url` 必填（抛 `ConfigurationError`），4 个分项 model 在调用阶段校验（返错 `AIResponse`）；调用方传入的 `model=` 参数静默忽略。

**Tech Stack:** FastAPI、SQLAlchemy async、Alembic、PostgreSQL JSONB、httpx、pytest/pytest-asyncio/pytest-httpx。

---

## 文件结构

### Alembic 迁移
- 新建：`apps/backend/alembic/versions/018_rename_ai_provider_model_key.py`

### 异常
- 修改：`apps/backend/app/core/exceptions.py` —— 新增 `ConfigurationError`。

### Provider 与工厂
- 修改：`apps/backend/app/providers/ai/base.py` —— `__init__` 改为强制 `api_key`/`base_url`，新增 4 个分项 model 字段。
- 修改：`apps/backend/app/providers/ai/__init__.py` —— `get_provider_from_db` 注入 `slug`、移除 api_key 缺失校验。
- 修改：`apps/backend/app/providers/ai/doubao.py` —— 移除 `api_base`/`model` fallback；4 个生成方法用 `self.{kind}_model`。
- 修改：`apps/backend/app/providers/ai/zhipu.py` —— 同上。
- 修改：`apps/backend/app/providers/ai/deepseek.py` —— 同上。
- 修改：`apps/backend/app/providers/ai/dify.py` —— 移除 `api_base` fallback。

### 调用方
- 修改：`apps/backend/app/executors/creative_video.py:325` —— 移除 `model="doubao-seedance-1-5-pro-251215"` 参数。
- 修改：`apps/backend/app/api/v1/endpoints/external.py:46-51` —— `_resolve_provider` 增加捕获 `ConfigurationError`。

### Admin UI
- 修改：`apps/frontend-admin/src/pages/settings/index.tsx:602` —— placeholder 中 `"model"` 改 `"text_model"`。

### 测试
- 修改：`apps/backend/tests/unit/providers/test_ai_providers.py` —— 所有 provider 实例化补 `base_url` 与对应 model 字段，断言改为参数化模型名。
- 修改：`apps/backend/tests/unit/executors/test_creative_video_executor.py` —— `test_execute_calls_provider_with_seedance_p0_arguments` 移除 `model=` 断言。
- 新建：`apps/backend/tests/unit/providers/test_ai_provider_factory.py` —— 覆盖 factory 的 `base_url` 字段、`api_key` 缺失。

---

## Task 1: Alembic 迁移 model → text_model

**Files:**
- Create: `apps/backend/alembic/versions/018_rename_ai_provider_model_key.py`

- [ ] **Step 1: 创建迁移文件**

`apps/backend/alembic/versions/018_rename_ai_provider_model_key.py`：

```python
"""rename ai_providers.config.model -> text_model

Revision ID: 018_rename_ai_provider_model_key
Revises: 017_add_user_uploads
Create Date: 2026-06-17

"""
from typing import Sequence, Union
from alembic import op


revision: str = "018_rename_ai_provider_model_key"
down_revision: Union[str, None] = "017_add_user_uploads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """JSON 内 key 重命名 model -> text_model（仅当 model 存在时）"""
    op.execute(
        """
        UPDATE ai_providers
        SET config = jsonb_set(config::jsonb, '{text_model}', config::jsonb->'model') - 'model'
        WHERE config IS NOT NULL AND config::jsonb ? 'model';
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE ai_providers
        SET config = jsonb_set(config::jsonb, '{model}', config::jsonb->'text_model') - 'text_model'
        WHERE config IS NOT NULL AND config::jsonb ? 'text_model';
        """
    )
```

- [ ] **Step 2: 在远程 RDS 升级**

在 `apps/backend/.env` 指向的 RDS 上执行：

```bash
cd apps/backend
alembic upgrade head
```

预期输出包含：

```
INFO  [alembic.runtime.migration] Running upgrade 017_add_user_uploads -> 018_rename_ai_provider_model_key
```

- [ ] **Step 3: 校验数据库 key 已重命名**

```bash
cd apps/backend && PYTHONIOENCODING=utf-8 python -c "
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.system import AiProvider

async def main():
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(AiProvider))
        for p in r.scalars().all():
            cfg = p.config or {}
            print(p.slug, 'has_text_model=', 'text_model' in cfg, 'has_old_model=', 'model' in cfg)

asyncio.run(main())
" 2>&1 | grep -v sqlalchemy
```

预期：每行 `has_text_model=True`、`has_old_model=False`。

- [ ] **Step 4: 父代理提交**

子代理只列出修改文件清单。父代理执行：

```bash
git add apps/backend/alembic/versions/018_rename_ai_provider_model_key.py
git commit -m "feat: alembic 迁移 ai_providers.config 的 model 改 text_model"
```

---

## Task 2: 新增 ConfigurationError

**Files:**
- Modify: `apps/backend/app/core/exceptions.py`

- [ ] **Step 1: 追加异常类**

在 `apps/backend/app/core/exceptions.py` 文件**末尾**追加（不要插入到现有 `BusinessException` 体系内）：

```python


class ConfigurationError(Exception):
    """AI Provider 必需配置项缺失。

    与 BusinessException 不同，本异常不被 FastAPI 全局 handler 当作业务异常处理；
    让它原样冒泡到调用栈（external API 的 _resolve_provider / Celery worker），
    各调用点自行决定 502 / task failed 等表现。
    """
    pass
```

- [ ] **Step 2: 父代理提交**

```bash
git add apps/backend/app/core/exceptions.py
git commit -m "feat: 新增 ConfigurationError 异常"
```

---

## Task 3: BaseAIProvider 强制 api_key/base_url

**Files:**
- Modify: `apps/backend/app/providers/ai/base.py`
- Modify: `apps/backend/app/providers/ai/__init__.py`

- [ ] **Step 1: 重写 BaseAIProvider.__init__**

替换 `apps/backend/app/providers/ai/base.py:23-34`（即原 `__init__` 方法体）为：

```python
    def __init__(self, **config):
        """
        初始化提供商
        :param config: 配置参数（必填: api_key, base_url；可选: text_model, image_model, video_model, audio_model, *_timeout, slug）
        :raises ConfigurationError: 当 api_key 或 base_url 缺失时
        """
        from app.core.exceptions import ConfigurationError

        slug = config.get("slug", "<unknown>")
        api_key = config.get("api_key")
        base_url = config.get("base_url")
        if not api_key:
            raise ConfigurationError(f"ai provider 未配置 api_key: {slug}")
        if not base_url:
            raise ConfigurationError(f"ai provider 未配置 base_url: {slug}")

        self.config = config
        self.slug = slug
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.text_model = config.get("text_model")
        self.image_model = config.get("image_model")
        self.video_model = config.get("video_model")
        self.audio_model = config.get("audio_model")
        self.timeout = config.get("timeout", 120)
        self.image_timeout = config.get("image_timeout", 300)
        self.video_timeout = config.get("video_timeout", 600)
```

注意：
- 移除原 `self.api_base` 和 `self.model` 字段。
- `slug` 字段加在实例上，方便所有子类构造错误信息。
- `from app.core.exceptions import ConfigurationError` 放在方法内避免循环导入风险（BaseAIProvider 模块在 import path 早期被加载）。

- [ ] **Step 2: 修改 factory 注入 slug、移除 api_key 校验**

替换 `apps/backend/app/providers/ai/__init__.py:42-76`（即 `get_provider_from_db` 整段）为：

```python
    @classmethod
    async def get_provider_from_db(cls, db, slug: str) -> BaseAIProvider:
        """
        从数据库获取 AI Provider 配置并创建实例

        所有必填配置（api_key、base_url）由 BaseAIProvider.__init__ 校验并抛 ConfigurationError；
        本方法不再做字段补默认或校验。

        :param db: 数据库会话（异步）
        :param slug: 提供商标识
        :return: BaseAIProvider 实例
        :raises ValueError: 如果提供商在 DB 中不存在
        :raises ConfigurationError: 如果必填配置项缺失
        """
        from sqlalchemy import select
        from app.models.system import AiProvider
        from app.core.security import aes_decrypt

        result = await db.execute(select(AiProvider).where(AiProvider.slug == slug))
        provider = result.scalar_one_or_none()
        if not provider:
            raise ValueError(f"AI provider '{slug}' not found in database")

        config = dict(provider.config or {})

        # 解密数据库中可能已加密的 api_key（解密失败按明文处理）
        api_key = config.get("api_key")
        if api_key:
            try:
                config["api_key"] = aes_decrypt(api_key)
            except Exception:
                pass

        # slug 注入用于异常信息
        config["slug"] = provider.slug

        return cls.get_provider(provider.slug, **config)
```

- [ ] **Step 3: 父代理提交（在 Task 4-7 后再提交本组改动；本步骤为防万一，单独 stage 不提交）**

子代理仅列出文件清单。父代理在 Task 7 后统一提交。

---

## Task 4: 重写 DoubaoProvider

**Files:**
- Modify: `apps/backend/app/providers/ai/doubao.py`

- [ ] **Step 1: 替换 __init__**

替换 `apps/backend/app/providers/ai/doubao.py:17-21`（原 `__init__` 体）为：

```python
    def __init__(self, **config):
        super().__init__(**config)
```

删除原有 `self.api_base = self.api_base or "..."`、`self.model = self.model or "..."`、`self.audio_model = config.get("audio_model", "doubao-tts")` 三行。

- [ ] **Step 2: generate_text 改读 self.text_model**

将 `apps/backend/app/providers/ai/doubao.py` 中 `generate_text` 方法的：

```python
        url = f"{self.api_base}/chat/completions"
```

改为：

```python
        if not self.text_model:
            return AIResponse(
                success=False, content="", raw_response={},
                error=f"provider '{self.slug}' 未配置 text_model"
            )

        url = f"{self.base_url}/chat/completions"
```

并把 payload 中的：

```python
            "model": "deepseek-v4-pro-260425" if thinking else "deepseek-v4-flash-260425",
```

改为：

```python
            "model": self.text_model,
```

注意：原代码用 `thinking` 决定模型名，本次按规则忽略；`thinking` 仍可继续控制 reasoning 配置但不切换 model。

- [ ] **Step 3: generate_image 改读 self.image_model**

`generate_image` 中：

```python
        url = f"{self.api_base}/images/generations"

        payload = {
            "model": kwargs.get("model", "doubao-seedream-4-5-251128"),
```

改为：

```python
        if not self.image_model:
            return AIResponse(
                success=False, content="", raw_response={},
                error=f"provider '{self.slug}' 未配置 image_model"
            )

        url = f"{self.base_url}/images/generations"

        payload = {
            "model": self.image_model,
```

- [ ] **Step 4: generate_video 改读 self.video_model**

`generate_video` 中：

```python
        create_url = f"{self.api_base}/contents/generations/tasks"
```

改为：

```python
        if not self.video_model:
            return AIResponse(
                success=False, content="", raw_response={},
                error=f"provider '{self.slug}' 未配置 video_model"
            )

        create_url = f"{self.base_url}/contents/generations/tasks"
```

并把：

```python
        payload: Dict[str, Any] = {
            "model": kwargs.get("model", "doubao-seedance-1-5-pro-251215"),
```

改为：

```python
        payload: Dict[str, Any] = {
            "model": self.video_model,
```

并把后续 `poll_url = f"{self.api_base}/contents/generations/tasks/{task_id}"` 改为 `self.base_url`。

- [ ] **Step 5: clone_voice 改 self.base_url**

`clone_voice` 中：

```python
        url = f"{self.api_base}/audio/cloning"
```

改为：

```python
        url = f"{self.base_url}/audio/cloning"
```

- [ ] **Step 6: generate_audio 不变（保持现状返回 not implemented）**

无需改动。

- [ ] **Step 7: 父代理统一提交（见 Task 7）**

---

## Task 5: 重写 ZhipuProvider / DeepSeekProvider / DifyProvider

**Files:**
- Modify: `apps/backend/app/providers/ai/zhipu.py`
- Modify: `apps/backend/app/providers/ai/deepseek.py`
- Modify: `apps/backend/app/providers/ai/dify.py`

- [ ] **Step 1: ZhipuProvider 改造**

替换 `apps/backend/app/providers/ai/zhipu.py:23-26`（即 `__init__`）为：

```python
    def __init__(self, **config):
        super().__init__(**config)
```

删除 `self.api_base = self.api_base or "..."` 与 `self.model = self.model or "GLM-4-Flash"`。

`generate_text` 中：

```python
        url = f"{self.api_base}/chat/completions"
        ...
        payload = {
            "model": kwargs.get("model", self.model),
```

改为：

```python
        if not self.text_model:
            return AIResponse(
                success=False, content="", raw_response={},
                error=f"provider '{self.slug}' 未配置 text_model"
            )

        url = f"{self.base_url}/chat/completions"
        ...
        payload = {
            "model": self.text_model,
```

`generate_image` 中：

```python
        url = f"{self.api_base}/images/generations"

        payload = {
            "model": kwargs.get("model", "glm-image"),
```

改为：

```python
        if not self.image_model:
            return AIResponse(
                success=False, content="", raw_response={},
                error=f"provider '{self.slug}' 未配置 image_model"
            )

        url = f"{self.base_url}/images/generations"

        payload = {
            "model": self.image_model,
```

`generate_audio` 中：

```python
        url = f"{self.api_base}/audio/speech"

        payload = {
            "model": kwargs.get("model", "glm-tts"),
```

改为：

```python
        if not self.audio_model:
            return AIResponse(
                success=False, content="", raw_response={},
                error=f"provider '{self.slug}' 未配置 audio_model"
            )

        url = f"{self.base_url}/audio/speech"

        payload = {
            "model": self.audio_model,
```

- [ ] **Step 2: DeepSeekProvider 改造**

替换 `apps/backend/app/providers/ai/deepseek.py:14-17`（即 `__init__`）为：

```python
    def __init__(self, **config):
        super().__init__(**config)
```

`generate_text` 中：

```python
        url = f"{self.api_base}/chat/completions"
```

改为：

```python
        if not self.text_model:
            return AIResponse(
                success=False, content="", raw_response={},
                error=f"provider '{self.slug}' 未配置 text_model"
            )

        url = f"{self.base_url}/chat/completions"
```

并把：

```python
        thinking = kwargs.pop("thinking", False)
        model = kwargs.get("model", self.model)
        extra_body = None

        if thinking:
            model = "deepseek-v4-pro"
            extra_body = {"thinking": {"type": "enabled"}}

        payload = {
            "model": model,
```

改为：

```python
        thinking = kwargs.pop("thinking", False)
        extra_body = {"thinking": {"type": "enabled"}} if thinking else None

        payload = {
            "model": self.text_model,
```

注意：调用方传入的 `kwargs.get("model")` 不再读取（按 spec 静默忽略）；`thinking` 仍控制 `extra_body`，但不再切换模型名。

- [ ] **Step 3: DifyProvider 改造**

替换 `apps/backend/app/providers/ai/dify.py:15-18`（即 `__init__`）为：

```python
    def __init__(self, **config):
        super().__init__(**config)
        self.workflow_id = config.get("workflow_id", "")
```

删除 `self.api_base = self.api_base or "https://api.dify.ai/v1"`。

`run_workflow` 等方法中如有 `self.api_base` 字串，全部改为 `self.base_url`。用以下命令批量验证：

```bash
grep -n "self.api_base" apps/backend/app/providers/ai/dify.py
```

预期：无任何匹配（全部已替换为 `self.base_url`）。

注意：Dify 不强校验 `text_model` 等字段；它依赖 `workflow_id`，此项保持现状。

- [ ] **Step 4: 父代理统一提交（见 Task 7）**

---

## Task 6: 调用方与异常路径

**Files:**
- Modify: `apps/backend/app/executors/creative_video.py`
- Modify: `apps/backend/app/api/v1/endpoints/external.py`
- Modify: `apps/frontend-admin/src/pages/settings/index.tsx`

- [ ] **Step 1: creative_video.py 移除硬编码 model**

`apps/backend/app/executors/creative_video.py` 在 `execute()` 调用处：

```python
        response = await self.doubao_provider.generate_video(
            prompt=normalized["prompt"],
            duration=normalized["duration"],
            model="doubao-seedance-1-5-pro-251215",
            images=images,
            ...
        )
```

将 `model="doubao-seedance-1-5-pro-251215",` 这一行**删除**，其余参数保持不变。

- [ ] **Step 2: external.py 扩展异常捕获**

`apps/backend/app/api/v1/endpoints/external.py:46-51` 中：

```python
async def _resolve_provider(db: AsyncSession, provider_slug: str):
    """根据 provider slug 获取 AI 提供商实例。"""
    try:
        return await AIProviderFactory.get_provider_from_db(db, provider_slug)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
```

改为：

```python
async def _resolve_provider(db: AsyncSession, provider_slug: str):
    """根据 provider slug 获取 AI 提供商实例。"""
    from app.core.exceptions import ConfigurationError
    try:
        return await AIProviderFactory.get_provider_from_db(db, provider_slug)
    except (ValueError, ConfigurationError) as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
```

- [ ] **Step 3: admin UI placeholder**

`apps/frontend-admin/src/pages/settings/index.tsx:602` 中：

```tsx
                  placeholder='{"api_key": "...", "model": "gpt-4"}'
```

改为：

```tsx
                  placeholder='{"api_key": "...", "base_url": "https://...", "text_model": "..."}'
```

- [ ] **Step 4: 父代理统一提交（见 Task 7）**

---

## Task 7: 测试更新与新增

**Files:**
- Modify: `apps/backend/tests/unit/providers/test_ai_providers.py`
- Modify: `apps/backend/tests/unit/executors/test_creative_video_executor.py`
- Create: `apps/backend/tests/unit/providers/test_ai_provider_factory.py`

### Step 1: 修改 test_ai_providers.py

- [ ] **Step 1.1: 添加测试 fixture**

在 `apps/backend/tests/unit/providers/test_ai_providers.py` 顶部 import 区追加：

```python
from app.core.exceptions import ConfigurationError
```

- [ ] **Step 1.2: 全局替换 provider 实例化**

将文件中所有 `DoubaoProvider(api_key="test_key")` 出现处替换为：

```python
DoubaoProvider(
    api_key="test_key",
    base_url="https://ark.cn-beijing.volces.com/api/v3",
    text_model="test-text-model",
    image_model="test-image-model",
    video_model="test-video-model",
    slug="volcano",
)
```

`ZhipuProvider(api_key="test_key")` 替换为：

```python
ZhipuProvider(
    api_key="test_key",
    base_url="https://open.bigmodel.cn/api/paas/v4",
    text_model="GLM-4-Flash",
    image_model="glm-image",
    audio_model="glm-tts",
    slug="zhipu",
)
```

`DeepSeekProvider(api_key="test_key")` 替换为：

```python
DeepSeekProvider(
    api_key="test_key",
    base_url="https://api.deepseek.com/v1",
    text_model="deepseek-v4-flash",
    slug="deepseek",
)
```

确认每个被替换处的测试逻辑仍然合理。

- [ ] **Step 1.3: 修正 model 断言**

把所有 `assert ... payload["model"] == "doubao-seedance-1-5-pro-251215"` 形式的断言改为：`assert payload["model"] == "test-video-model"`（其它模型同理：`test-text-model`、`test-image-model`）。

- [ ] **Step 1.4: 新增 ConfigurationError 测试**

在文件末尾追加：

```python
def test_doubao_provider_init_raises_when_api_key_missing():
    """缺失 api_key 时抛 ConfigurationError"""
    with pytest.raises(ConfigurationError, match="api_key"):
        DoubaoProvider(base_url="https://example.com", slug="volcano")


def test_doubao_provider_init_raises_when_base_url_missing():
    """缺失 base_url 时抛 ConfigurationError"""
    with pytest.raises(ConfigurationError, match="base_url"):
        DoubaoProvider(api_key="test_key", slug="volcano")


@pytest.mark.asyncio
async def test_doubao_generate_text_returns_error_when_text_model_missing():
    provider = DoubaoProvider(
        api_key="test_key",
        base_url="https://example.com",
        slug="volcano",
    )
    response = await provider.generate_text("hi")
    assert response.success is False
    assert "text_model" in response.error


@pytest.mark.asyncio
async def test_doubao_generate_image_returns_error_when_image_model_missing():
    provider = DoubaoProvider(
        api_key="test_key",
        base_url="https://example.com",
        slug="volcano",
    )
    response = await provider.generate_image("一只猫")
    assert response.success is False
    assert "image_model" in response.error


@pytest.mark.asyncio
async def test_doubao_generate_video_returns_error_when_video_model_missing():
    provider = DoubaoProvider(
        api_key="test_key",
        base_url="https://example.com",
        slug="volcano",
    )
    response = await provider.generate_video("一只猫")
    assert response.success is False
    assert "video_model" in response.error


@pytest.mark.asyncio
async def test_doubao_ignores_caller_model_kwarg(httpx_mock):
    """调用方传 model=xxx 被静默忽略，payload 仍走 DB.video_model"""
    httpx_mock.add_response(json={"id": "task_xx"})
    httpx_mock.add_response(
        json={
            "id": "task_xx",
            "status": "succeeded",
            "content": {"video_url": "https://example.com/v.mp4"},
        }
    )
    httpx_mock.add_response(content=b"video", headers={"content-type": "video/mp4"})

    provider = DoubaoProvider(
        api_key="test_key",
        base_url="https://ark.cn-beijing.volces.com/api/v3",
        video_model="db-video-model",
        slug="volcano",
    )
    response = await provider.generate_video(
        prompt="x",
        model="caller-attempt-override",
        poll_interval=0.001,
        max_polls=2,
    )
    assert response.success is True
    import json as _json
    payload = _json.loads(httpx_mock.get_requests()[0].content)
    assert payload["model"] == "db-video-model"
```

- [ ] **Step 1.5: 运行 provider 测试**

```bash
cd apps/backend && pytest tests/unit/providers/test_ai_providers.py -v
```

预期：全部 PASS（含新增 5 个测试）。

### Step 2: 修改 test_creative_video_executor.py

- [ ] **Step 2.1: 移除 model 断言**

找到 `tests/unit/executors/test_creative_video_executor.py` 中 `test_execute_calls_provider_with_seedance_p0_arguments` 的 `mock_provider.generate_video.assert_awaited_once_with(...)` 断言里的：

```python
            model="doubao-seedance-1-5-pro-251215",
```

将这一行**删除**，其它断言参数保持不变。

- [ ] **Step 2.2: 运行 executor 测试**

```bash
cd apps/backend && pytest tests/unit/executors/test_creative_video_executor.py -v
```

预期：44 passed。

### Step 3: 新增 factory 测试

- [ ] **Step 3.1: 创建 test_ai_provider_factory.py**

`apps/backend/tests/unit/providers/test_ai_provider_factory.py`：

```python
"""AIProviderFactory.get_provider_from_db 行为测试"""
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.exceptions import ConfigurationError
from app.providers.ai import AIProviderFactory


@pytest.mark.asyncio
async def test_get_provider_from_db_uses_base_url_field():
    """factory 把 DB 中的 base_url/text_model 等原样注入 provider"""
    fake_provider = MagicMock()
    fake_provider.slug = "volcano"
    fake_provider.config = {
        "api_key": "plain-key",
        "base_url": "https://example.com/api",
        "text_model": "test-text",
        "video_model": "test-video",
    }
    db = AsyncMock()
    db.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=fake_provider)
    )

    p = await AIProviderFactory.get_provider_from_db(db, "volcano")
    assert p.api_key == "plain-key"
    assert p.base_url == "https://example.com/api"
    assert p.text_model == "test-text"
    assert p.video_model == "test-video"
    assert p.slug == "volcano"


@pytest.mark.asyncio
async def test_get_provider_from_db_raises_value_error_when_provider_missing():
    db = AsyncMock()
    db.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=None)
    )
    with pytest.raises(ValueError, match="not found"):
        await AIProviderFactory.get_provider_from_db(db, "ghost")


@pytest.mark.asyncio
async def test_get_provider_from_db_raises_configuration_error_when_api_key_missing():
    fake_provider = MagicMock()
    fake_provider.slug = "volcano"
    fake_provider.config = {"base_url": "https://example.com/api"}
    db = AsyncMock()
    db.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=fake_provider)
    )
    with pytest.raises(ConfigurationError, match="api_key"):
        await AIProviderFactory.get_provider_from_db(db, "volcano")


@pytest.mark.asyncio
async def test_get_provider_from_db_raises_configuration_error_when_base_url_missing():
    fake_provider = MagicMock()
    fake_provider.slug = "volcano"
    fake_provider.config = {"api_key": "k"}
    db = AsyncMock()
    db.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=fake_provider)
    )
    with pytest.raises(ConfigurationError, match="base_url"):
        await AIProviderFactory.get_provider_from_db(db, "volcano")
```

- [ ] **Step 3.2: 运行 factory 测试**

```bash
cd apps/backend && pytest tests/unit/providers/test_ai_provider_factory.py -v
```

预期：4 passed。

### Step 4: 整体冒烟

- [ ] **Step 4.1: 跑覆盖本次重构的全部测试**

```bash
cd apps/backend && pytest \
  tests/unit/providers/test_ai_providers.py \
  tests/unit/providers/test_ai_provider_factory.py \
  tests/unit/executors/test_creative_video_executor.py \
  tests/test_executor_registry.py \
  -v
```

预期：全部 PASS。如有 unrelated 历史失败（pre-existing），列出但不修复。

- [ ] **Step 4.2: 前端 admin 类型检查**

```bash
pnpm --filter @lcaitool/frontend-admin exec tsc --noEmit
```

如果项目根没有 frontend-admin filter，跳过该项；admin placeholder 是字符串改动，不影响类型。

### Step 5: 父代理一次性提交 Task 3-7 代码改动

子代理列出修改文件清单后，父代理执行：

```bash
git add apps/backend/app/core/exceptions.py \
        apps/backend/app/providers/ai/base.py \
        apps/backend/app/providers/ai/__init__.py \
        apps/backend/app/providers/ai/doubao.py \
        apps/backend/app/providers/ai/zhipu.py \
        apps/backend/app/providers/ai/deepseek.py \
        apps/backend/app/providers/ai/dify.py \
        apps/backend/app/executors/creative_video.py \
        apps/backend/app/api/v1/endpoints/external.py \
        apps/frontend-admin/src/pages/settings/index.tsx \
        apps/backend/tests/unit/providers/test_ai_providers.py \
        apps/backend/tests/unit/executors/test_creative_video_executor.py \
        apps/backend/tests/unit/providers/test_ai_provider_factory.py
git commit -m "feat: AI Provider 严格配置去除默认值 (Task 3-7)"
```

---

## Task 8: 联调验证（手工）

**Files:**
- 无源码改动。

- [ ] **Step 1: 父代理在远程 RDS 上检查 volcano provider 配置**

```bash
cd apps/backend && PYTHONIOENCODING=utf-8 python -c "
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.system import AiProvider

async def main():
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(AiProvider).where(AiProvider.slug=='volcano'))
        p = r.scalar_one_or_none()
        cfg = p.config or {}
        for k in ['api_key','base_url','text_model','image_model','video_model','audio_model']:
            v = cfg.get(k)
            if k == 'api_key':
                v = '***' if v else None
            print(f'{k}: {v}')

asyncio.run(main())
" 2>&1 | grep -vE "INFO sqlalchemy|FROM ai|WHERE"
```

预期：`api_key`、`base_url`、`video_model` 都非 None。`text_model` 为 alembic 迁移后的值。

- [ ] **Step 2: 启动后端服务**

```bash
cd apps/backend
PYTHONIOENCODING=utf-8 uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log
PYTHONIOENCODING=utf-8 celery -A app.workers.celery_app worker --loglevel=info -Q medium,fast --pool=solo
```

健康检查：

```bash
curl -sS http://127.0.0.1:8000/api/v1/health
```

预期：返回 `{"code":200, ...}`。

- [ ] **Step 3: 端到端验证创意视频生成**

按 [`docs/superpowers/verification/2026-06-17-creative-video-generator.md`](../verification/2026-06-17-creative-video-generator.md) 第 6 节走表单提交一次（不必跑通 Seedance 视频生成，但要验证 401 已经消失或换成更具体的错误）。

- 如果 Celery 日志中再次出现 `AuthenticationError 401`，说明 RDS 中的 `api_key` / `video_model` 不被 Ark 接受，需要在 admin 后台校正配置（不属于本计划范围）。
- 如果出现 `ConfigurationError: ai provider 未配置 video_model`，说明 alembic 迁移后 DB 中 `video_model` 还是空的，需要在 admin 中补值。

- [ ] **Step 4: 关闭后台服务**

按 `Ctrl+C` 关闭 uvicorn / celery / pnpm dev。

- [ ] **Step 5: 父代理无需提交（仅验证）**

如发现源码缺陷，记录在 [`docs/superpowers/specs/2026-06-17-ai-provider-strict-config-design.md`](../specs/2026-06-17-ai-provider-strict-config-design.md) 的“后续工作”区，作为新计划处理；本计划不做范围外修复。

---

## 自我审查（Self-Review）

### 规格覆盖

- ConfigurationError 新增：Task 2。
- BaseAIProvider 强制 api_key/base_url、4 个分项 model：Task 3。
- factory 注入 slug 与移除 api_key 校验：Task 3。
- 4 个 provider 移除 fallback 与硬编码 model：Task 4 (Doubao)、Task 5 (Zhipu/DeepSeek/Dify)。
- creative_video 移除 model=：Task 6 Step 1。
- external API 增加捕获 ConfigurationError：Task 6 Step 2。
- admin placeholder：Task 6 Step 3。
- alembic model→text_model：Task 1。
- 调用方 model= 静默忽略：通过 Task 4-5 “不再读 kwargs.get('model')” 实现；Task 7 Step 1.4 `test_doubao_ignores_caller_model_kwarg` 断言行为。
- 测试覆盖：Task 7。
- 联调验证：Task 8。

### 占位符扫描

无 TBD/TODO；所有代码块给出完整片段；命令含期望输出。

### 类型一致性

- `BaseAIProvider.text_model` / `image_model` / `video_model` / `audio_model` / `base_url` / `slug`：在 Task 3 定义，Task 4-5 在子类引用一致。
- `ConfigurationError` 在 Task 2 定义，Task 3、6 引用一致。
- factory 注入 `config["slug"] = provider.slug`：Task 3 写入，base 读取一致。
