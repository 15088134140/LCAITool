# Creative Video Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the P0 “创意视频生成器” form tool and run one Seedance 1.5 Pro video generation end-to-end with fixed pricing, uploaded first/last frame support, `generate_audio`, `adaptive` ratio, smart duration, and `watermark=false`.

**Architecture:** Add a dedicated backend `CreativeVideoExecutor` and register it under `creative-video-generator`. Extend `DoubaoProvider.generate_video()` to build the official Ark body payload and keep provider-specific payload details out of the executor. Add a reusable frontend dynamic form renderer that supports the new video form fields, uploads files through the existing `/files/uploads` endpoint, creates a task, and shows progress/results through existing task/work flows.

**Tech Stack:** FastAPI, SQLAlchemy async, Celery, httpx, pytest/pytest-asyncio/pytest-httpx, Next.js 14, React 18, Axios, Tailwind CSS.

---

## File Structure

### Backend provider and executor

- Modify: `apps/backend/app/providers/ai/doubao.py`
  - Add `_build_video_content()` helper.
  - Add `_download_binary_as_base64()` helper if not already local to the method.
  - Replace `generate_video()` internals with official Ark payload support while preserving the existing signature.
  - Ensure every new video request includes `watermark: false` unless explicitly passed as `False`; do not expose a path that defaults to `true`.

- Create: `apps/backend/app/executors/creative_video.py`
  - Validate P0 input combinations.
  - Resolve `UserUpload` records and convert uploaded images to `data:image/<fmt>;base64,...` URLs.
  - Call `DoubaoProvider.generate_video()`.
  - Decode returned base64 video and write `videos/creative_video.mp4`.
  - Optionally download `last_frame_url` if present.
  - Create `Work` and `WorkFile` records.

- Modify: `apps/backend/app/executors/__init__.py`
  - Export `CreativeVideoExecutor`.

- Modify: `apps/backend/app/executors/registry.py`
  - Register `creative-video-generator`.

- Modify: `apps/backend/app/workers/tasks.py`
  - Import `CreativeVideoExecutor` and add it to `EXECUTOR_MAP` fallback.

### Backend seed data and tests

- Modify: `apps/backend/app/seed_data.py`
  - Add “创意视频生成器” under existing video category.
  - Use fixed pricing schema: base only.
  - Add P0 `param_schema` with `adaptive`, `duration_mode`, `generate_audio`, file fields, and quantity locked to 1.

- Modify: `apps/backend/tests/unit/providers/test_ai_providers.py`
  - Update Seedance video tests to official API response shape.
  - Add payload assertions for `image_url`, `role`, `generate_audio`, `ratio=adaptive`, `duration=-1`, and `watermark=false`.

- Create: `apps/backend/tests/unit/executors/test_creative_video_executor.py`
  - Test fixed cost.
  - Test P0 validation rules.
  - Test upload-to-data-url conversion.
  - Test provider call arguments.
  - Test Work/WorkFile creation with mocked services.

- Modify: `apps/backend/tests/test_executor_registry.py`
  - Add assertions for `creative-video-generator`.

- Add tests in an existing pricing test file or registry test file:
  - Confirm seed pricing schema shape is compatible with `PricingService` fixed rule.

### Frontend form and upload

- Modify: `apps/frontend-user/src/lib/api/types.ts`
  - Add `ToolParamField` type covering `section`, `file`, `textarea`, `radio`, `range`, `boolean`, `action` for raw API types.

- Modify: `apps/frontend-user/src/types/index.ts`
  - Add `ToolParamField`, `ToolParamOption`, `ToolParamCondition` to the app-level `Tool` type used by `ToolCreationForm`.
  - Add `param_schema?: ToolParamField[]`, `executor_key?: string`, `pricing_schema?: Record<string, any>` to `Tool`.

- Modify: `apps/frontend-user/src/providers/ApiToolProvider.ts`
  - Map backend `param_schema`, `executor_key`, and `pricing_schema` into the app-level `Tool` object.

- Create: `apps/frontend-user/src/lib/api/modules/file.ts`
  - Add `uploadFile(file, { toolId, fieldKey })` helper using `FormData` and `/files/uploads`.

- Modify: `apps/frontend-user/src/lib/api/index.ts`
  - Export the new file API module if this project uses barrel exports.

- Create: `apps/frontend-user/src/components/tool-detail/DynamicToolForm.tsx`
  - Render backend `param_schema` fields.
  - Upload file fields immediately and store upload IDs in form state.
  - Validate P0 video rules before task creation.
  - Create a task with `task_type = tool.executor_key || tool.slug`.
  - Show `ProgressModal` for the created task.

- Modify: `apps/frontend-user/src/components/tool-detail/ToolCreationForm.tsx`
  - Replace the “开发中” fallback for form-only tools with `DynamicToolForm` when `tool.param_schema` exists.

### Frontend video result preview

- Modify: `apps/frontend-user/src/app/works/detail/[id]/page.tsx`
  - Add `previewVideos`.
  - Render a `<video controls>` preview when video files exist.
  - Preserve image/audio/pdf behavior.

---

## Task 1: Extend DoubaoProvider Seedance payload support

**Files:**
- Modify: `apps/backend/app/providers/ai/doubao.py:232-360`
- Modify tests: `apps/backend/tests/unit/providers/test_ai_providers.py:262-324`

- [ ] **Step 1: Write failing provider tests for official Ark payload**

Append these tests near the existing Doubao video tests in `apps/backend/tests/unit/providers/test_ai_providers.py` and update the old `test_doubao_generate_video_success` / `test_doubao_generate_video_failed` response shapes to top-level `status` and `content`.

```python
@pytest.mark.asyncio
async def test_doubao_generate_video_builds_official_seedance_payload(httpx_mock):
    """Seedance 1.5 Pro uses official body params and closes watermark."""
    httpx_mock.add_response(json={"id": "task_123"})
    httpx_mock.add_response(json={"id": "task_123", "status": "succeeded", "content": {"video_url": "https://example.com/video.mp4"}, "usage": {"total_tokens": 123}})
    httpx_mock.add_response(content=b"fake_video_bytes", headers={"content-type": "video/mp4"})

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.generate_video(
        prompt="小猫对着镜头打哈欠",
        duration=-1,
        model="doubao-seedance-1-5-pro-251215",
        images=[
            {"role": "first_frame", "url": "data:image/png;base64,AAA"},
            {"role": "last_frame", "url": "data:image/png;base64,BBB"},
        ],
        resolution="1080p",
        ratio="adaptive",
        generate_audio=False,
        return_last_frame=True,
        poll_interval=0.001,
        max_polls=2,
    )

    assert response.success is True
    assert base64.b64decode(response.content) == b"fake_video_bytes"
    assert response.usage["total_tokens"] == 123

    create_payload = json.loads(httpx_mock.get_requests()[0].content)
    assert create_payload["model"] == "doubao-seedance-1-5-pro-251215"
    assert create_payload["content"] == [
        {"type": "text", "text": "小猫对着镜头打哈欠"},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,AAA"}, "role": "first_frame"},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,BBB"}, "role": "last_frame"},
    ]
    assert create_payload["resolution"] == "1080p"
    assert create_payload["ratio"] == "adaptive"
    assert create_payload["duration"] == -1
    assert create_payload["generate_audio"] is False
    assert create_payload["return_last_frame"] is True
    assert create_payload["watermark"] is False


@pytest.mark.asyncio
async def test_doubao_generate_video_text_only_omits_optional_none_fields(httpx_mock):
    """Text-only video does not include empty image content or ratio when omitted."""
    httpx_mock.add_response(json={"id": "task_123"})
    httpx_mock.add_response(json={"id": "task_123", "status": "succeeded", "content": {"video_url": "https://example.com/video.mp4"}})
    httpx_mock.add_response(content=b"fake_video_bytes", headers={"content-type": "video/mp4"})

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.generate_video(
        prompt="城市夜景延时摄影",
        duration=6,
        resolution="720p",
        generate_audio=True,
        poll_interval=0.001,
        max_polls=2,
    )

    assert response.success is True
    create_payload = json.loads(httpx_mock.get_requests()[0].content)
    assert create_payload["content"] == [{"type": "text", "text": "城市夜景延时摄影"}]
    assert create_payload["resolution"] == "720p"
    assert create_payload["duration"] == 6
    assert create_payload["generate_audio"] is True
    assert create_payload["watermark"] is False
    assert "ratio" not in create_payload
```

Replace the old success test body with this official response shape:

```python
@pytest.mark.asyncio
async def test_doubao_generate_video_success(httpx_mock):
    """测试豆包 Seedance 视频生成成功（提交 -> 轮询 -> 下载）"""
    httpx_mock.add_response(json={"id": "task_123"})
    httpx_mock.add_response(json={"id": "task_123", "status": "running"})
    httpx_mock.add_response(json={"id": "task_123", "status": "succeeded", "content": {"video_url": "https://example.com/video.mp4"}, "usage": {"video_duration": 10}})
    httpx_mock.add_response(content=b"fake_video_bytes", headers={"content-type": "video/mp4"})

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.generate_video(
        "一只猫在跑步",
        duration=10,
        poll_interval=0.001,
        max_polls=10,
    )

    assert response.success is True
    assert base64.b64decode(response.content) == b"fake_video_bytes"
    assert response.usage["video_duration"] == 10
```

Replace the old failed test body with:

```python
@pytest.mark.asyncio
async def test_doubao_generate_video_failed(httpx_mock):
    """测试豆包 Seedance 视频生成失败（提交 -> 轮询 -> 失败）"""
    httpx_mock.add_response(json={"id": "task_123"})
    httpx_mock.add_response(json={"id": "task_123", "status": "failed", "error": {"message": "Model inference error"}})

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.generate_video(
        "一只猫在跑步",
        poll_interval=0.001,
        max_polls=10,
    )

    assert response.success is False
    assert "Model inference error" in response.error
```

- [ ] **Step 2: Run provider video tests and verify they fail**

Run:

```bash
cd apps/backend && pytest tests/unit/providers/test_ai_providers.py -k "doubao_generate_video" -v
```

Expected: FAIL because `DoubaoProvider.generate_video()` does not yet include `generate_audio`, `ratio`, image roles, or official top-level polling response handling.

- [ ] **Step 3: Implement official Seedance payload support**

In `apps/backend/app/providers/ai/doubao.py`, add these imports at the top if missing:

```python
import mimetypes
from typing import Optional, Dict, Any, List
```

Inside `DoubaoProvider`, add this helper before `generate_video()`:

```python
    @staticmethod
    def _build_video_content(prompt: str, images: Optional[List[Dict[str, str]]] = None) -> list[dict]:
        """构建 Seedance content，支持文本和首尾帧图片"""
        content: list[dict] = []
        if prompt:
            content.append({"type": "text", "text": prompt})

        for image in images or []:
            url = image.get("url") or image.get("data")
            if not url:
                continue
            item = {
                "type": "image_url",
                "image_url": {"url": url},
            }
            role = image.get("role")
            if role:
                item["role"] = role
            content.append(item)

        return content

    @staticmethod
    def _extract_video_url(task_result: Dict[str, Any]) -> str:
        """从官方查询任务响应中提取 video_url，兼容少量旧结构"""
        content = task_result.get("content") or {}
        if isinstance(content, dict) and content.get("video_url"):
            return content["video_url"]

        task = task_result.get("task") or {}
        task_content = task.get("content") or task.get("output") or {}
        if isinstance(task_content, dict) and task_content.get("video_url"):
            return task_content["video_url"]

        return ""

    @staticmethod
    def _extract_error_message(task_result: Dict[str, Any]) -> str:
        """从任务失败响应中提取可读错误"""
        error = task_result.get("error")
        if isinstance(error, dict):
            return error.get("message") or error.get("code") or json.dumps(error, ensure_ascii=False)
        if isinstance(error, str):
            return error

        task = task_result.get("task") or {}
        task_error = task.get("error")
        if isinstance(task_error, dict):
            return task_error.get("message") or task_error.get("code") or json.dumps(task_error, ensure_ascii=False)
        if isinstance(task_error, str):
            return task_error

        return "Video generation failed"
```

Replace `generate_video()` with:

```python
    async def generate_video(
        self,
        prompt: str,
        duration: Optional[int] = None,
        **kwargs
    ) -> AIResponse:
        """
        调用豆包 Seedance 生成视频（异步任务轮询模式）
        API 文档: POST /api/v3/contents/generations/tasks
        """
        create_url = f"{self.api_base}/contents/generations/tasks"

        content = self._build_video_content(prompt=prompt, images=kwargs.get("images"))
        if not content:
            return AIResponse(
                success=False,
                content="",
                raw_response={},
                error="Seedance video content is empty"
            )

        payload: Dict[str, Any] = {
            "model": kwargs.get("model", "doubao-seedance-1-5-pro-251215"),
            "content": content,
            "watermark": False,
        }

        if kwargs.get("resolution"):
            payload["resolution"] = kwargs["resolution"]
        if kwargs.get("ratio"):
            payload["ratio"] = kwargs["ratio"]
        if duration is not None:
            payload["duration"] = duration
        if "generate_audio" in kwargs:
            payload["generate_audio"] = bool(kwargs["generate_audio"])
        if "return_last_frame" in kwargs:
            payload["return_last_frame"] = bool(kwargs["return_last_frame"])
        if kwargs.get("seed") is not None:
            payload["seed"] = kwargs["seed"]
        if kwargs.get("camera_fixed") is not None:
            payload["camera_fixed"] = kwargs["camera_fixed"]

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=self.video_timeout) as client:
                response = await client.post(create_url, json=payload, headers=headers)
                response.raise_for_status()
                result = response.json()

            task_id = result.get("id")
            if not task_id:
                return AIResponse(
                    success=False,
                    content="",
                    raw_response=result,
                    error="No task ID in Seedance response"
                )

            poll_url = f"{self.api_base}/contents/generations/tasks/{task_id}"
            max_polls = kwargs.get("max_polls", 120)
            poll_interval = kwargs.get("poll_interval", 5)

            for _ in range(max_polls):
                await asyncio.sleep(poll_interval)

                async with httpx.AsyncClient(timeout=self.video_timeout) as client:
                    poll_response = await client.get(poll_url, headers=headers)
                    poll_response.raise_for_status()
                    poll_result = poll_response.json()

                status = poll_result.get("status") or (poll_result.get("task") or {}).get("status") or ""

                if status == "succeeded":
                    video_url = self._extract_video_url(poll_result)
                    if not video_url:
                        return AIResponse(
                            success=False,
                            content="",
                            raw_response=poll_result,
                            error="No video URL in succeeded task"
                        )

                    async with httpx.AsyncClient(timeout=self.video_timeout) as client:
                        video_response = await client.get(video_url)
                        video_response.raise_for_status()
                        video_bytes = video_response.content

                    video_base64 = base64.b64encode(video_bytes).decode("utf-8")
                    raw_response = dict(poll_result)
                    raw_response.setdefault("content", {})
                    if isinstance(raw_response["content"], dict):
                        raw_response["content"]["video_url"] = video_url

                    return AIResponse(
                        success=True,
                        content=video_base64,
                        raw_response=raw_response,
                        usage=poll_result.get("usage", {})
                    )

                if status in {"failed", "expired"}:
                    return AIResponse(
                        success=False,
                        content="",
                        raw_response=poll_result,
                        error=self._extract_error_message(poll_result)
                    )

            return AIResponse(
                success=False,
                content="",
                raw_response={"task_id": task_id},
                error="Video generation polling timeout"
            )

        except httpx.TimeoutException:
            return AIResponse(success=False, content="", raw_response={}, error="API request timeout")
        except httpx.HTTPStatusError as e:
            error_msg = f"HTTP Error {e.response.status_code}: {e.response.text}"
            return AIResponse(
                success=False,
                content="",
                raw_response={"status_code": e.response.status_code, "text": e.response.text},
                error=error_msg
            )
        except Exception as e:
            return AIResponse(success=False, content="", raw_response={}, error=f"Unexpected error: {str(e)}")
```

- [ ] **Step 4: Run provider tests and verify they pass**

Run:

```bash
cd apps/backend && pytest tests/unit/providers/test_ai_providers.py -k "doubao_generate_video" -v
```

Expected: PASS for all selected Doubao video tests.

- [ ] **Step 5: Parent-agent commit**

If a subagent performed Steps 1-4, it must stop here and report changed files. The parent agent runs:

```bash
git add apps/backend/app/providers/ai/doubao.py apps/backend/tests/unit/providers/test_ai_providers.py
git commit -m "feat: 扩展 Seedance 视频 Provider"
```

---

## Task 2: Add CreativeVideoExecutor validation and upload helpers

**Files:**
- Create: `apps/backend/app/executors/creative_video.py`
- Create tests: `apps/backend/tests/unit/executors/test_creative_video_executor.py`

- [ ] **Step 1: Write failing executor unit tests for cost, validation, and data URL conversion**

Create `apps/backend/tests/unit/executors/test_creative_video_executor.py` with:

```python
"""创意视频生成器执行器单元测试"""
import base64
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.executors.creative_video import CreativeVideoExecutor


@pytest.fixture
def mock_db():
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def executor(mock_db):
    return CreativeVideoExecutor(
        task_id=uuid.uuid4(),
        db=mock_db,
        tool={"base_fee": 10},
    )


def test_estimate_cost_returns_base_fee(executor):
    assert executor.estimate_cost({}) == 10
    assert executor.estimate_cost({"resolution": "1080p", "duration": 12}) == 10


@pytest.mark.parametrize("params,error", [
    ({"prompt": "", "first_frame": None, "last_frame": None}, "文生视频模式下创意描述必填"),
    ({"prompt": "", "last_frame": "upload-last"}, "不能只上传尾帧"),
    ({"prompt": "猫", "quantity": 2}, "P0 仅支持生成 1 条视频"),
    ({"prompt": "猫", "duration_mode": "seconds", "duration": 3}, "视频时长必须在 4-12 秒之间"),
    ({"prompt": "猫", "resolution": "2k"}, "不支持的分辨率"),
    ({"prompt": "猫", "ratio": "2:1"}, "不支持的视频比例"),
])
def test_validate_params_rejects_invalid_input(executor, params, error):
    with pytest.raises(ValueError, match=error):
        executor._validate_params(params)


@pytest.mark.parametrize("params,expected_mode", [
    ({"prompt": "猫", "first_frame": None, "last_frame": None, "quantity": 1}, "text_to_video"),
    ({"prompt": "", "first_frame": "upload-first", "last_frame": None, "quantity": 1}, "first_frame"),
    ({"prompt": "", "first_frame": "upload-first", "last_frame": "upload-last", "quantity": 1}, "first_last_frame"),
])
def test_validate_params_returns_generation_mode(executor, params, expected_mode):
    normalized = executor._validate_params(params)
    assert normalized["mode"] == expected_mode


def test_duration_smart_maps_to_minus_one(executor):
    normalized = executor._validate_params({
        "prompt": "猫",
        "duration_mode": "smart",
        "quantity": 1,
    })
    assert normalized["duration"] == -1


def test_upload_to_data_url_reads_storage_file(executor, tmp_path):
    image_path = tmp_path / "first.png"
    image_path.write_bytes(b"fake_png")
    upload = MagicMock(mime_type="image/png", file_path="uploads/u/first.png")

    with patch("app.executors.creative_video.settings.STORAGE_DIR", str(tmp_path)):
        actual_file = tmp_path / "uploads" / "u" / "first.png"
        actual_file.parent.mkdir(parents=True)
        actual_file.write_bytes(b"fake_png")
        data_url = executor._upload_to_data_url(upload)

    assert data_url == "data:image/png;base64," + base64.b64encode(b"fake_png").decode("utf-8")
```

- [ ] **Step 2: Run tests and verify they fail because the executor does not exist**

Run:

```bash
cd apps/backend && pytest tests/unit/executors/test_creative_video_executor.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'app.executors.creative_video'`.

- [ ] **Step 3: Implement CreativeVideoExecutor skeleton, validation, and upload helpers**

Create `apps/backend/app/executors/creative_video.py` with:

```python
"""
创意视频生成器执行器
P0：跑通 Seedance 1.5 Pro 单条视频生成流程。
"""
import base64
import os
import uuid
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseToolExecutor
from app.core.config import settings
from app.models.user_upload import UserUpload


class CreativeVideoExecutor(BaseToolExecutor):
    """创意视频生成器执行器"""

    SUPPORTED_RATIOS = {"adaptive", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"}
    SUPPORTED_RESOLUTIONS = {"480p", "720p", "1080p"}

    def __init__(
        self,
        task_id: uuid.UUID,
        db: AsyncSession,
        tool: Optional[Dict[str, Any]] = None,
        progress_callback=None,
    ):
        super().__init__(task_id, db, tool=tool, progress_callback=progress_callback)
        self.doubao_provider = None

    def estimate_cost(self, params: Dict[str, Any]) -> int:
        """P0 固定基础费用"""
        return int(self._tool_config.get("base_fee", 10) or 10)

    def _validate_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """校验并标准化 P0 表单参数"""
        prompt = (params.get("prompt") or "").strip()
        first_frame = params.get("first_frame")
        last_frame = params.get("last_frame")
        quantity = int(params.get("quantity") or 1)
        ratio = params.get("ratio") or "adaptive"
        resolution = params.get("resolution") or "480p"
        duration_mode = params.get("duration_mode") or "seconds"
        generate_audio = params.get("generate_audio")
        if generate_audio is None:
            generate_audio = True

        if quantity != 1:
            raise ValueError("P0 仅支持生成 1 条视频")
        if last_frame and not first_frame:
            raise ValueError("不能只上传尾帧，请先上传首帧参考图")
        if not first_frame and not last_frame and not prompt:
            raise ValueError("文生视频模式下创意描述必填")
        if ratio not in self.SUPPORTED_RATIOS:
            raise ValueError(f"不支持的视频比例: {ratio}")
        if resolution not in self.SUPPORTED_RESOLUTIONS:
            raise ValueError(f"不支持的分辨率: {resolution}")

        if duration_mode == "smart":
            duration = -1
        else:
            duration = int(params.get("duration") or 6)
            if duration < 4 or duration > 12:
                raise ValueError("视频时长必须在 4-12 秒之间")

        if first_frame and last_frame:
            mode = "first_last_frame"
        elif first_frame:
            mode = "first_frame"
        else:
            mode = "text_to_video"

        return {
            "mode": mode,
            "prompt": prompt,
            "first_frame": first_frame,
            "last_frame": last_frame,
            "ratio": ratio,
            "resolution": resolution,
            "duration": duration,
            "generate_audio": bool(generate_audio),
            "quantity": 1,
        }

    async def _get_upload(self, upload_id: str, field_key: str) -> UserUpload:
        """读取当前任务用户上传文件，校验 field_key 和用户归属"""
        from app.services.task_service import TaskService

        task = await TaskService.get_by_id(self.db, self.task_id)
        if not task:
            raise ValueError("任务不存在")

        result = await self.db.execute(
            select(UserUpload).where(
                UserUpload.id == uuid.UUID(str(upload_id)),
                UserUpload.user_id == task.user_id,
            )
        )
        upload = result.scalar_one_or_none()
        if not upload:
            raise ValueError(f"上传文件不存在: {field_key}")
        if upload.field_key and upload.field_key != field_key:
            raise ValueError(f"上传文件字段不匹配: {field_key}")
        if not (upload.mime_type or "").startswith("image/"):
            raise ValueError(f"{field_key} 必须是图片文件")
        return upload

    def _upload_to_data_url(self, upload: UserUpload) -> str:
        """把上传文件转换为 Ark 支持的 data:image/...;base64 URL"""
        full_path = os.path.join(settings.STORAGE_DIR, str(upload.file_path))
        if not os.path.exists(full_path):
            raise ValueError(f"上传文件不存在或已被清理: {upload.file_name}")

        mime_type = (upload.mime_type or "image/png").lower()
        if not mime_type.startswith("image/"):
            raise ValueError(f"不支持的图片类型: {mime_type}")

        with open(full_path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
        return f"{mime_type};base64,{encoded}" if mime_type.startswith("data:") else f"data:{mime_type};base64,{encoded}"
```

- [ ] **Step 4: Run executor helper tests and verify they pass**

Run:

```bash
cd apps/backend && pytest tests/unit/executors/test_creative_video_executor.py -v
```

Expected: PASS for cost, validation, and data URL helper tests.

- [ ] **Step 5: Parent-agent commit**

If a subagent performed Steps 1-4, it must stop here and report changed files. The parent agent runs:

```bash
git add apps/backend/app/executors/creative_video.py apps/backend/tests/unit/executors/test_creative_video_executor.py
git commit -m "feat: 新增创意视频执行器基础校验"
```

---

## Task 3: Implement CreativeVideoExecutor execution and WorkFile creation

**Files:**
- Modify: `apps/backend/app/executors/creative_video.py`
- Modify tests: `apps/backend/tests/unit/executors/test_creative_video_executor.py`

- [ ] **Step 1: Add failing tests for provider args and work creation**

Append to `apps/backend/tests/unit/executors/test_creative_video_executor.py`:

```python
from app.providers.ai.base import AIResponse


@pytest.mark.asyncio
async def test_build_video_images_resolves_first_and_last_uploads(executor):
    first = MagicMock(mime_type="image/png", file_path="uploads/u/first.png", file_name="first.png")
    last = MagicMock(mime_type="image/png", file_path="uploads/u/last.png", file_name="last.png")

    with patch.object(executor, "_get_upload", new_callable=AsyncMock) as mock_get_upload:
        mock_get_upload.side_effect = [first, last]
        with patch.object(executor, "_upload_to_data_url") as mock_data_url:
            mock_data_url.side_effect = ["data:image/png;base64,AAA", "data:image/png;base64,BBB"]
            images = await executor._build_video_images({"first_frame": "first-id", "last_frame": "last-id"})

    assert images == [
        {"role": "first_frame", "url": "data:image/png;base64,AAA"},
        {"role": "last_frame", "url": "data:image/png;base64,BBB"},
    ]
    assert mock_get_upload.await_args_list[0].args == ("first-id", "first_frame")
    assert mock_get_upload.await_args_list[1].args == ("last-id", "last_frame")


@pytest.mark.asyncio
async def test_execute_calls_provider_with_seedance_p0_arguments(executor, tmp_path):
    provider = AsyncMock()
    provider.generate_video.return_value = AIResponse(
        success=True,
        content=base64.b64encode(b"fake_video").decode("utf-8"),
        raw_response={"content": {"video_url": "https://example.com/video.mp4"}},
        usage={"total_tokens": 10},
    )
    executor.doubao_provider = provider

    with patch.object(executor, "get_works_dir", return_value=str(tmp_path)):
        with patch.object(executor, "_init_providers", new_callable=AsyncMock):
            with patch.object(executor, "_build_video_images", new_callable=AsyncMock) as mock_images:
                mock_images.return_value = [{"role": "first_frame", "url": "data:image/png;base64,AAA"}]
                with patch.object(executor, "_create_work_record", new_callable=AsyncMock) as mock_create_work:
                    mock_create_work.return_value = MagicMock(id=uuid.uuid4())
                    with patch.object(executor, "update_progress", new_callable=AsyncMock):
                        result = await executor.execute({
                            "prompt": "猫打哈欠",
                            "first_frame": "first-id",
                            "ratio": "adaptive",
                            "resolution": "1080p",
                            "duration_mode": "smart",
                            "quantity": 1,
                            "generate_audio": False,
                        })

    assert result["success"] is True
    assert (tmp_path / "videos" / "creative_video.mp4").read_bytes() == b"fake_video"
    provider.generate_video.assert_awaited_once_with(
        prompt="猫打哈欠",
        duration=-1,
        model="doubao-seedance-1-5-pro-251215",
        images=[{"role": "first_frame", "url": "data:image/png;base64,AAA"}],
        resolution="1080p",
        ratio="adaptive",
        generate_audio=False,
        return_last_frame=True,
        watermark=False,
        max_polls=120,
        poll_interval=5,
    )


@pytest.mark.asyncio
async def test_execute_raises_when_provider_fails(executor):
    provider = AsyncMock()
    provider.generate_video.return_value = AIResponse(success=False, content="", raw_response={}, error="Ark error")
    executor.doubao_provider = provider

    with patch.object(executor, "_init_providers", new_callable=AsyncMock):
        with patch.object(executor, "_build_video_images", new_callable=AsyncMock, return_value=[]):
            with patch.object(executor, "update_progress", new_callable=AsyncMock):
                with pytest.raises(RuntimeError, match="Ark error"):
                    await executor.execute({"prompt": "猫", "quantity": 1})
```

- [ ] **Step 2: Run executor tests and verify new tests fail**

Run:

```bash
cd apps/backend && pytest tests/unit/executors/test_creative_video_executor.py -v
```

Expected: FAIL because `_build_video_images()`, `_init_providers()`, `execute()`, and `_create_work_record()` are incomplete.

- [ ] **Step 3: Implement provider init, image building, execute, and work creation**

Append these imports to `apps/backend/app/executors/creative_video.py`:

```python
from app.models.task import WorkFile
from app.providers.ai import AIProviderFactory
from app.schemas.task import WorkCreate, WorkFileCreate
from app.services.task_service import TaskService
from app.services.work_service import WorkService
```

Append these methods inside `CreativeVideoExecutor`:

```python
    async def _init_providers(self) -> None:
        """延迟初始化火山方舟 Provider"""
        if self.doubao_provider is None:
            self.doubao_provider = await AIProviderFactory.get_provider_from_db(self.db, "volcano")

    async def _build_video_images(self, normalized: Dict[str, Any]) -> list[dict]:
        """根据上传参数构造 Seedance 图片输入"""
        images: list[dict] = []
        if normalized.get("first_frame"):
            first_upload = await self._get_upload(normalized["first_frame"], "first_frame")
            images.append({"role": "first_frame", "url": self._upload_to_data_url(first_upload)})
        if normalized.get("last_frame"):
            last_upload = await self._get_upload(normalized["last_frame"], "last_frame")
            images.append({"role": "last_frame", "url": self._upload_to_data_url(last_upload)})
        return images

    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """执行创意视频生成任务"""
        await self._init_providers()
        normalized = self._validate_params(params)
        works_dir = self.get_works_dir()
        videos_dir = os.path.join(works_dir, "videos")
        os.makedirs(videos_dir, exist_ok=True)

        await self.update_progress(5, "正在校验参数与参考素材...", step_index=0, total_steps=5, step_status="running")
        images = await self._build_video_images(normalized)

        await self.update_progress(15, "正在提交 Seedance 视频生成任务...", step_index=1, total_steps=5, step_status="running")
        response = await self.doubao_provider.generate_video(
            prompt=normalized["prompt"],
            duration=normalized["duration"],
            model="doubao-seedance-1-5-pro-251215",
            images=images,
            resolution=normalized["resolution"],
            ratio=normalized["ratio"],
            generate_audio=normalized["generate_audio"],
            return_last_frame=True,
            watermark=False,
            max_polls=120,
            poll_interval=5,
        )
        if not response.success:
            raise RuntimeError(response.error or "Seedance 视频生成失败")

        await self.update_progress(90, "正在保存视频文件...", step_index=3, total_steps=5, step_status="running")
        video_bytes = base64.b64decode(response.content)
        video_path = os.path.join(videos_dir, "creative_video.mp4")
        with open(video_path, "wb") as f:
            f.write(video_bytes)

        result_data = {
            "normalized": normalized,
            "video_path": video_path,
            "video_size": os.path.getsize(video_path),
            "provider_raw_response": response.raw_response,
            "usage": response.usage or {},
        }
        work = await self._create_work_record(params, result_data)

        await self.update_progress(100, "生成完成！", step_index=4, total_steps=5, step_status="completed")
        await self.add_log("info", "创意视频生成任务执行完成", {"work_id": str(work.id)})

        return {"success": True, "work_id": str(work.id), "files": {"video": "videos/creative_video.mp4"}}

    async def _create_work_record(self, params: Dict[str, Any], result_data: Dict[str, Any]) -> Any:
        """创建 Work 和视频 WorkFile"""
        task = await TaskService.get_by_id(self.db, self.task_id)
        if not task:
            raise RuntimeError("任务不存在")

        normalized = result_data["normalized"]
        title_source = normalized.get("prompt") or "创意视频生成"
        title = title_source[:20] if len(title_source) > 20 else title_source
        description = (
            f"模式：{normalized['mode']}；比例：{normalized['ratio']}；"
            f"分辨率：{normalized['resolution']}；时长：{normalized['duration']}；"
            f"输出声音：{'是' if normalized['generate_audio'] else '否'}"
        )

        work = await WorkService.create_work(self.db, WorkCreate(
            user_id=task.user_id,
            task_id=self.task_id,
            tool_id=task.tool_id,
            title=title or "创意视频生成",
            description=description,
            status="published",
            is_public=False,
            version=1,
        ))

        self.db.add(WorkFile(**WorkFileCreate(
            work_id=work.id,
            file_type="video",
            file_name="creative_video.mp4",
            file_url="videos/creative_video.mp4",
            file_size=result_data.get("video_size", 0),
            mime_type="video/mp4",
            is_preview=True,
        ).model_dump()))

        await self.db.flush()
        await self.db.commit()

        task.result_preview = str(work.id)
        await self.db.commit()
        await self.db.refresh(work)
        return work
```

- [ ] **Step 4: Run executor tests and verify they pass**

Run:

```bash
cd apps/backend && pytest tests/unit/executors/test_creative_video_executor.py -v
```

Expected: PASS for all creative video executor unit tests.

- [ ] **Step 5: Parent-agent commit**

If a subagent performed Steps 1-4, it must stop here and report changed files. The parent agent runs:

```bash
git add apps/backend/app/executors/creative_video.py apps/backend/tests/unit/executors/test_creative_video_executor.py
git commit -m "feat: 实现创意视频执行器流程"
```

---

## Task 4: Register executor and seed the tool

**Files:**
- Modify: `apps/backend/app/executors/__init__.py`
- Modify: `apps/backend/app/executors/registry.py`
- Modify: `apps/backend/app/workers/tasks.py`
- Modify: `apps/backend/app/seed_data.py`
- Modify tests: `apps/backend/tests/test_executor_registry.py`
- Modify tests: `apps/backend/tests/test_api_tool_param_schema.py` or `apps/backend/tests/unit/services/test_tool_param_schema.py`

- [ ] **Step 1: Write failing registry test**

Modify `apps/backend/tests/test_executor_registry.py`:

```python
def test_get_executor_class_creative_video_generator():
    """创意视频生成器 executor_key 可解析"""
    from app.executors.registry import get_executor_class, resolve_executor_key
    from app.executors.creative_video import CreativeVideoExecutor

    assert resolve_executor_key("creative-video-generator") == "creative-video-generator"
    assert get_executor_class("creative-video-generator") is CreativeVideoExecutor
```

Update the `test_list_executors_excludes_executor_class` expected set:

```python
    assert {item["key"] for item in executors} == {
        "storybook-generator",
        "ecommerce-detail",
        "product-description",
        "creative-video-generator",
    }
```

- [ ] **Step 2: Run registry test and verify it fails**

Run:

```bash
cd apps/backend && pytest tests/test_executor_registry.py -v
```

Expected: FAIL because the new executor is not exported or registered.

- [ ] **Step 3: Register executor**

In `apps/backend/app/executors/__init__.py`, add:

```python
from .creative_video import CreativeVideoExecutor
```

In `apps/backend/app/executors/registry.py`, add import:

```python
from .creative_video import CreativeVideoExecutor
```

Add this entry to `EXECUTOR_REGISTRY`:

```python
    "creative-video-generator": {
        "key": "creative-video-generator",
        "name": "创意视频生成器执行器",
        "description": "调用 Seedance 1.5 Pro 生成单条创意视频",
        "class": CreativeVideoExecutor,
        "aliases": [],
    },
```

In `apps/backend/app/workers/tasks.py`, update imports:

```python
from app.executors import (
    BaseToolExecutor,
    StorybookExecutor,
    EcommerceExecutor,
    MarketingExecutor,
    CreativeVideoExecutor,
)
```

Update `EXECUTOR_MAP`:

```python
EXECUTOR_MAP: Dict[str, type[BaseToolExecutor]] = {
    'storybook-generator': StorybookExecutor,
    'ecommerce-detail': EcommerceExecutor,
    'product-description': MarketingExecutor,
    'creative-video-generator': CreativeVideoExecutor,
}
```

- [ ] **Step 4: Add tool seed data**

In `apps/backend/app/seed_data.py`, define `cat_video` near other category IDs:

```python
    cat_video = uuid.UUID("10000001-0000-0000-0000-000000000006")
```

Append this `Tool(...)` to the `tools` list in `seed_tools()`:

```python
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
                "version": 1,
                "currency": "credits",
                "rounding": "ceil",
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
```

- [ ] **Step 5: Run registry and pricing tests**

Run:

```bash
cd apps/backend && pytest tests/test_executor_registry.py tests/test_pricing_service.py::TestBenchmarkToolPricing::test_product_description -v
```

Expected: registry tests PASS. The pricing test command includes an existing fixed pricing example to ensure the fixed schema path still works.

- [ ] **Step 6: Run seed_data manually against local dev DB only when safe**

Run only in local/dev environment:

```bash
cd apps/backend && python -m app.seed_data
```

Expected output includes:

```text
✓ 已同步 6 个工具
```

If the count differs because the database already has extra tools, verify no exception occurs and `creative-video-generator` exists through the tools API.

- [ ] **Step 7: Parent-agent commit**

If a subagent performed Steps 1-6, it must stop here and report changed files. The parent agent runs:

```bash
git add apps/backend/app/executors/__init__.py apps/backend/app/executors/registry.py apps/backend/app/workers/tasks.py apps/backend/app/seed_data.py apps/backend/tests/test_executor_registry.py
git commit -m "feat: 注册创意视频生成器工具"
```

---

## Task 5: Add frontend file upload API and Tool param schema types

**Files:**
- Modify: `apps/frontend-user/src/lib/api/types.ts`
- Modify: `apps/frontend-user/src/types/index.ts`
- Modify: `apps/frontend-user/src/providers/ApiToolProvider.ts`
- Create: `apps/frontend-user/src/lib/api/modules/file.ts`
- Modify: `apps/frontend-user/src/lib/api/index.ts` if it exports modules

- [ ] **Step 1: Add API TypeScript types**

In `apps/frontend-user/src/lib/api/types.ts`, add these types before `export interface Tool`:

```ts
export interface ToolParamOption {
  label: string;
  value: string | number | boolean;
  icon?: string;
  desc?: string;
}

export interface ToolParamCondition {
  when: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'truthy' | 'falsy';
    value?: any;
  };
  effect: 'show' | 'hide' | 'enable' | 'disable';
}

export interface ToolParamField {
  key: string;
  label: string;
  type: 'section' | 'text' | 'textarea' | 'radio' | 'select' | 'range' | 'number' | 'boolean' | 'file' | 'action' | 'hidden';
  required?: boolean;
  defaultValue?: any;
  placeholder?: string;
  accept?: string;
  min?: number;
  max?: number;
  order?: number;
  uiHint?: string;
  helpText?: string;
  action?: string;
  options?: ToolParamOption[];
  condition?: ToolParamCondition;
}
```

Then extend the API `Tool` interface:

```ts
  param_schema?: ToolParamField[];
  executor_key?: string;
  pricing_schema?: Record<string, any>;
```

- [ ] **Step 2: Add app-level Tool types used by tool detail components**

In `apps/frontend-user/src/types/index.ts`, add the same `ToolParamOption`, `ToolParamCondition`, and `ToolParamField` definitions before `export interface Tool`, then extend `Tool` with:

```ts
  param_schema?: ToolParamField[];
  executor_key?: string;
  pricing_schema?: Record<string, any>;
```

- [ ] **Step 3: Map backend param schema fields into app Tool objects**

In `apps/frontend-user/src/providers/ApiToolProvider.ts`, add these fields to the object returned by `mapApiTool(apiItem: any): Tool`:

```ts
    param_schema: apiItem.param_schema || [],
    executor_key: apiItem.executor_key || apiItem.slug || '',
    pricing_schema: apiItem.pricing_schema || undefined,
```

- [ ] **Step 4: Add file upload API module**

Create `apps/frontend-user/src/lib/api/modules/file.ts`:

```ts
/** 文件上传 API */
import { apiClient } from '../client';

export interface UploadedFileResponse {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  url: string;
}

export const fileApi = {
  uploadFile: async (
    file: File,
    params: { toolId?: string; fieldKey?: string } = {}
  ): Promise<UploadedFileResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (params.toolId) formData.append('tool_id', params.toolId);
    if (params.fieldKey) formData.append('field_key', params.fieldKey);

    const response = await apiClient.post<UploadedFileResponse>('/files/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default fileApi;
```

If `apps/frontend-user/src/lib/api/index.ts` exports modules, add:

```ts
export * from './modules/file';
```

- [ ] **Step 5: Type-check frontend**

Run:

```bash
pnpm --filter @lcaitool/frontend-user build
```

Expected: TypeScript build succeeds or fails only on pre-existing unrelated issues. If it fails due to these changes, fix the type errors in this task before continuing.

- [ ] **Step 6: Parent-agent commit**

If a subagent performed Steps 1-5, it must stop here and report changed files. The parent agent runs:

```bash
git add apps/frontend-user/src/lib/api/types.ts apps/frontend-user/src/types/index.ts apps/frontend-user/src/providers/ApiToolProvider.ts apps/frontend-user/src/lib/api/modules/file.ts apps/frontend-user/src/lib/api/index.ts
git commit -m "feat: 增加前端文件上传 API 类型"
```

---

## Task 6: Implement dynamic form renderer for form tools

**Files:**
- Create: `apps/frontend-user/src/components/tool-detail/DynamicToolForm.tsx`
- Modify: `apps/frontend-user/src/components/tool-detail/ToolCreationForm.tsx`

- [ ] **Step 1: Create DynamicToolForm component**

Create `apps/frontend-user/src/components/tool-detail/DynamicToolForm.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Tool, ToolParamField } from '@/types';
import { taskApi } from '@/lib/api/modules/task';
import { fileApi, type UploadedFileResponse } from '@/lib/api/modules/file';
import { toast } from '@/lib/toast';
import { ProgressModal } from './ProgressModal';

interface DynamicToolFormProps {
  tool: Tool;
}

type FormState = Record<string, any>;

function getDefaultState(fields: ToolParamField[]): FormState {
  return fields.reduce<FormState>((acc, field) => {
    if (field.type !== 'section' && field.defaultValue !== undefined) {
      acc[field.key] = field.defaultValue;
    }
    return acc;
  }, {});
}

function evaluateCondition(field: ToolParamField, state: FormState): boolean {
  if (!field.condition) return true;
  const { when, effect } = field.condition;
  const actual = state[when.field];
  const expected = when.value;
  let matched = true;

  switch (when.operator) {
    case 'eq': matched = actual === expected; break;
    case 'ne': matched = actual !== expected; break;
    case 'truthy': matched = Boolean(actual); break;
    case 'falsy': matched = !actual; break;
    case 'in': matched = Array.isArray(expected) && expected.includes(actual); break;
    case 'not_in': matched = Array.isArray(expected) && !expected.includes(actual); break;
    case 'gt': matched = actual > expected; break;
    case 'gte': matched = actual >= expected; break;
    case 'lt': matched = actual < expected; break;
    case 'lte': matched = actual <= expected; break;
    default: matched = true;
  }

  if (effect === 'hide') return !matched;
  if (effect === 'show') return matched;
  return true;
}

function validateCreativeVideo(state: FormState): string | null {
  const prompt = String(state['prompt'] || '').trim();
  const firstFrame = state['first_frame'];
  const lastFrame = state['last_frame'];
  const quantity = Number(state['quantity'] || 1);
  const durationMode = state['duration_mode'] || 'seconds';
  const duration = Number(state['duration'] || 6);

  if (!firstFrame && !lastFrame && !prompt) return '文生视频模式下请输入创意描述';
  if (lastFrame && !firstFrame) return '不能只上传尾帧，请先上传首帧参考图';
  if (quantity !== 1) return 'P0 仅支持生成 1 条视频';
  if (durationMode === 'seconds' && (duration < 4 || duration > 12)) return '视频时长必须在 4-12 秒之间';
  return null;
}

export function DynamicToolForm({ tool }: DynamicToolFormProps) {
  const router = useRouter();
  const baseFee = tool.base_fee ?? tool.pricing?.baseFee ?? 0;
  const fields = useMemo(
    () => [...(tool.param_schema || [])].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [tool.param_schema]
  );
  const [formState, setFormState] = useState<FormState>(() => getDefaultState(fields));
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFileResponse>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);

  const updateField = (key: string, value: any) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  };

  const handleFileChange = async (field: ToolParamField, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('文件大小不能超过 20MB');
      return;
    }

    setUploadingKey(field.key);
    try {
      const uploaded = await fileApi.uploadFile(file, { toolId: tool.id, fieldKey: field.key });
      setUploadedFiles(prev => ({ ...prev, [field.key]: uploaded }));
      updateField(field.key, uploaded.id);
      toast.success(`${field.label}上传成功`);
    } catch (error) {
      console.error('上传失败:', error);
      toast.error(`${field.label}上传失败`);
    } finally {
      setUploadingKey(null);
    }
  };

  const handleAction = (field: ToolParamField) => {
    if (field.action === 'open_demo_preview') {
      const demos = document.getElementById('demos');
      if (demos) demos.scrollIntoView({ behavior: 'smooth' });
      else toast.info('样片速览即将上线');
    }
  };

  const handleSubmit = async () => {
    const error = tool.slug === 'creative-video-generator' ? validateCreativeVideo(formState) : null;
    if (error) {
      toast.error(error);
      return;
    }

    setIsSubmitting(true);
    try {
      const task = await taskApi.createTask({
        tool_id: tool.id,
        task_type: tool.executor_key || tool.slug,
        estimated_cost: baseFee,
        input_params: formState,
      });
      setTaskId(task.id);
      toast.success('任务已提交');
    } catch (err) {
      console.error('创建任务失败:', err);
      toast.error('任务提交失败，请检查积分余额或稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: ToolParamField) => {
    if (!evaluateCondition(field, formState)) return null;

    if (field.type === 'section') {
      return <h3 key={field.key} className="text-lg font-bold text-[#1E3A5F] pt-4 border-t border-[#E4E7EB] first:border-t-0 first:pt-0">{field.label}</h3>;
    }

    if (field.type === 'textarea') {
      return (
        <label key={field.key} className="block">
          <span className="block text-sm font-semibold text-[#1E3A5F] mb-2">{field.label}</span>
          <textarea
            value={formState[field.key] || ''}
            onChange={e => updateField(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="w-full min-h-[120px] rounded-xl border border-[#E4E7EB] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-light"
          />
        </label>
      );
    }

    if (field.type === 'file') {
      const uploaded = uploadedFiles[field.key];
      return (
        <label key={field.key} className="block">
          <span className="block text-sm font-semibold text-[#1E3A5F] mb-2">{field.label}</span>
          <div className="rounded-xl border-2 border-dashed border-[#CBD5E1] bg-white p-5 text-center">
            <input
              type="file"
              accept={field.accept || 'image/*'}
              onChange={e => handleFileChange(field, e.target.files?.[0])}
              className="hidden"
              id={`file-${field.key}`}
            />
            <label htmlFor={`file-${field.key}`} className="cursor-pointer text-brand-light font-semibold">
              {uploadingKey === field.key ? '上传中...' : uploaded ? `已上传：${uploaded.file_name}` : '点击上传图片'}
            </label>
          </div>
        </label>
      );
    }

    if (field.type === 'radio') {
      return (
        <div key={field.key}>
          <div className="text-sm font-semibold text-[#1E3A5F] mb-2">{field.label}</div>
          <div className="flex flex-wrap gap-2">
            {(field.options || []).map(option => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => updateField(field.key, option.value)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  formState[field.key] === option.value
                    ? 'bg-brand-light text-white border-brand-light'
                    : 'bg-white text-[#64748B] border-[#E4E7EB] hover:border-brand-light'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (field.type === 'range') {
      return (
        <label key={field.key} className="block">
          <span className="flex justify-between text-sm font-semibold text-[#1E3A5F] mb-2">
            <span>{field.label}</span>
            <span>{formState[field.key] ?? field.defaultValue}</span>
          </span>
          <input
            type="range"
            min={field.min}
            max={field.max}
            value={formState[field.key] ?? field.defaultValue ?? field.min ?? 1}
            onChange={e => updateField(field.key, Number(e.target.value))}
            className="w-full"
          />
          {field.helpText && <p className="text-xs text-[#64748B] mt-1">{field.helpText}</p>}
        </label>
      );
    }

    if (field.type === 'boolean') {
      return (
        <label key={field.key} className="flex items-center justify-between rounded-xl border border-[#E4E7EB] bg-white px-4 py-3">
          <span className="text-sm font-semibold text-[#1E3A5F]">{field.label}</span>
          <input
            type="checkbox"
            checked={Boolean(formState[field.key])}
            onChange={e => updateField(field.key, e.target.checked)}
            className="h-5 w-5"
          />
        </label>
      );
    }

    if (field.type === 'action') {
      return (
        <button
          key={field.key}
          type="button"
          onClick={() => handleAction(field)}
          className="px-4 py-2 rounded-lg border border-[#E4E7EB] bg-white text-brand-light font-semibold hover:border-brand-light"
        >
          {field.label}
        </button>
      );
    }

    return null;
  };

  return (
    <section id="start-creation" className="py-20 bg-[#F8FAFC]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-dark mb-4">开始创作</h2>
          <p className="text-[#64748B]">预计消耗 {baseFee} 积分</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E4E7EB] p-6 lg:p-8 space-y-6">
          {fields.map(renderField)}
          <button
            type="button"
            disabled={isSubmitting || uploadingKey !== null}
            onClick={handleSubmit}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-dark to-brand-light text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '提交中...' : '开始生成'}
          </button>
        </div>
      </div>
      {taskId && (
        <ProgressModal
          taskId={taskId}
          isOpen={Boolean(taskId)}
          toolName={tool.name}
          onClose={() => setTaskId(null)}
          onComplete={(workId) => router.push(`/works/detail/${workId}`)}
        />
      )}
    </section>
  );
}
```

- [ ] **Step 2: Wire ToolCreationForm to dynamic form**

Modify `apps/frontend-user/src/components/tool-detail/ToolCreationForm.tsx` imports:

```tsx
import { DynamicToolForm } from './DynamicToolForm';
```

Replace the form-only default return block with:

```tsx
  if (usageModes.includes('form') && tool.param_schema && tool.param_schema.length > 0) {
    return <DynamicToolForm tool={tool} />;
  }

  return (
    <section id="start-creation" className="py-20 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-dark mb-4">开始创作</h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">该工具正在开发中，敬请期待</p>
        </div>
      </div>
    </section>
  );
```

Inside `ToolCreationFormWithTabs`, replace the `mode === 'form'` placeholder with:

```tsx
        {mode === 'form' ? (
          tool.param_schema && tool.param_schema.length > 0 ? (
            <DynamicToolForm tool={tool} />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">该工具的表单模式正在开发中...</p>
            </div>
          )
        ) : (
          <DialogMode tool={tool} />
        )}
```

- [ ] **Step 3: Build frontend**

Run:

```bash
pnpm --filter @lcaitool/frontend-user build
```

Expected: build passes.

- [ ] **Step 4: Parent-agent commit**

If a subagent performed Steps 1-3, it must stop here and report changed files. The parent agent runs:

```bash
git add apps/frontend-user/src/components/tool-detail/DynamicToolForm.tsx apps/frontend-user/src/components/tool-detail/ToolCreationForm.tsx
git commit -m "feat: 实现动态工具表单提交"
```

---

## Task 7: Add video preview to work detail page

**Files:**
- Modify: `apps/frontend-user/src/app/works/detail/[id]/page.tsx`

- [ ] **Step 1: Add video preview variables**

Near the existing `previewImages` declaration, add:

```tsx
  const previewVideos = files.filter(f => f.file_type === 'video' && f.file_url && f.file_url !== '#');
```

- [ ] **Step 2: Render video before image preview**

Inside the preview tab block, replace:

```tsx
                {previewImages.length > 0 ? (
```

with:

```tsx
                {previewVideos.length > 0 ? (
                  <div className="space-y-6">
                    <div className="aspect-video bg-black rounded-xl overflow-hidden">
                      <video
                        controls
                        className="w-full h-full"
                        preload="metadata"
                      >
                        <source src={getFileUrl(previewVideos[0]!)} type={previewVideos[0]!.mime_type || 'video/mp4'} />
                        您的浏览器不支持视频播放
                      </video>
                    </div>
                    {previewVideos.length > 1 && (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                        {previewVideos.map(file => (
                          <div key={file.id} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E4E7EB]">
                            <p className="text-sm font-medium text-[#1E3A5F] truncate">{file.file_name}</p>
                            <p className="text-xs text-[#64748B]">{formatFileSize(file.file_size)}</p>
                            <button
                              onClick={() => handleDownload(file)}
                              className="mt-2 px-3 py-1.5 text-xs font-medium text-white bg-brand-light rounded-lg"
                            >
                              下载
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : previewImages.length > 0 ? (
```

- [ ] **Step 3: Add video view action in file list**

After the existing image “查看” button block, add:

```tsx
                      {file.file_type === 'video' && file.file_url && file.file_url !== '#' && (
                        <button
                          onClick={() => setActiveTab('preview')}
                          className="px-4 py-2 text-sm font-medium text-brand-light hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          播放
                        </button>
                      )}
```

- [ ] **Step 4: Build frontend**

Run:

```bash
pnpm --filter @lcaitool/frontend-user build
```

Expected: build passes.

- [ ] **Step 5: Parent-agent commit**

If a subagent performed Steps 1-4, it must stop here and report changed files. The parent agent runs:

```bash
git add apps/frontend-user/src/app/works/detail/[id]/page.tsx
git commit -m "feat: 成果页支持视频预览"
```

---

## Task 8: Backend integration smoke tests

**Files:**
- No required source changes unless tests reveal defects.
- Test commands only.

- [ ] **Step 1: Run targeted backend tests**

Run:

```bash
cd apps/backend && pytest \
  tests/unit/providers/test_ai_providers.py -k "doubao_generate_video" \
  tests/unit/executors/test_creative_video_executor.py \
  tests/test_executor_registry.py \
  tests/test_pricing_service.py::TestPricingServiceFixed::test_fixed_reads_base_fee \
  -v
```

Expected: all selected tests PASS.

- [ ] **Step 2: Run API schema tests related to param_schema and usage_modes**

Run:

```bash
cd apps/backend && pytest \
  tests/test_api_tool_param_schema.py \
  tests/test_api_tool_usage_modes.py \
  tests/unit/services/test_tool_param_schema.py \
  tests/unit/services/test_tool_usage_modes.py \
  -v
```

Expected: all selected tests PASS.

- [ ] **Step 3: Run frontend build**

Run:

```bash
pnpm --filter @lcaitool/frontend-user build
```

Expected: build passes.

- [ ] **Step 4: Parent-agent commit if fixes were needed**

If Steps 1-3 required fixes, parent agent runs `git status --short`, stages only the files changed by those fixes, and commits with:

```bash
git commit -m "fix: 修复创意视频生成器集成问题"
```

If no fixes were needed, do not create an empty commit.

---

## Task 9: Manual end-to-end verification

**Files:**
- No source changes expected.

- [ ] **Step 1: Seed local data**

Run:

```bash
cd apps/backend && python -m app.seed_data
```

Expected: command exits successfully and the synced tools count includes the new creative video tool.

- [ ] **Step 2: Start backend worker stack according to project local workflow**

Use the project’s normal development startup. If using Docker Compose:

```bash
docker compose up -d redis db
cd apps/backend && celery -A worker.celery_app worker --loglevel=info -Q medium,fast
```

In another terminal:

```bash
cd apps/backend && uvicorn app.main:app --reload
```

Expected: API is reachable at `http://localhost:8000/api/v1/health` and Celery worker logs show it is ready.

- [ ] **Step 3: Start frontend**

Run:

```bash
pnpm --filter @lcaitool/frontend-user dev
```

Expected: frontend is reachable at `http://localhost:3000`.

- [ ] **Step 4: Verify text-to-video flow**

In browser:

1. Open `/tools/creative-video-generator`.
2. Enter prompt: `小猫对着镜头打哈欠`.
3. Select ratio `16:9`.
4. Select resolution `480p`.
5. Use duration mode `按秒数`, duration `4`.
6. Keep `输出声音` enabled.
7. Submit.

Expected:

- Task modal opens.
- Task progresses from pending/running to completed.
- Work detail page or completion link points to a work.
- Work contains `creative_video.mp4`.
- Video plays or downloads.
- The generated video has no watermark.

- [ ] **Step 5: Verify first-frame validation and upload flow**

In browser:

1. Open `/tools/creative-video-generator`.
2. Upload only `尾帧参考图`.
3. Submit.

Expected: frontend shows `不能只上传尾帧，请先上传首帧参考图` and does not create a task.

Then:

1. Upload `首帧参考图`.
2. Leave prompt empty.
3. Submit.

Expected: task is created and submitted as first-frame video mode.

- [ ] **Step 6: Record verification evidence**

Capture:

- Task ID.
- Work ID.
- Generated `WorkFile` id for `creative_video.mp4`.
- Screenshot or terminal log showing `watermark=false` payload in mocked/test evidence, or backend log if safe to log payload without secrets.

Do not log API keys.

- [ ] **Step 7: Parent-agent final commit if manual fixes were needed**

If manual verification required source fixes, parent agent runs `git status --short`, stages only the files changed by those fixes, and commits with:

```bash
git commit -m "fix: 修复创意视频生成器手工验收问题"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review Checklist

### Spec coverage

- P0 form tool exists: Task 4 and Task 6.
- Single video generation: Task 2 and Task 3.
- First/last frame upload support: Task 2, Task 3, Task 6.
- `ratio=adaptive`: Task 1, Task 4, Task 6.
- `duration=-1` smart duration: Task 1, Task 2, Task 4, Task 6.
- `generate_audio`: Task 1, Task 4, Task 6.
- `watermark=false`: Task 1 and Task 3 tests, Task 6 does not expose field.
- Fixed pricing: Task 4 seed pricing and Task 2 executor cost.
- Work/WorkFile video creation: Task 3.
- Video preview/download: Task 7.
- Validation and failure behavior: Task 2, Task 3, Task 6.
- Manual verification: Task 9.

### Placeholder scan

This plan avoids unresolved placeholders. Conditional fix commits instruct the parent agent to run `git status --short`, stage only the actual fix files, and commit with a fixed message.

### Type consistency

- Frontend uses `Tool.param_schema`, `Tool.executor_key`, and `ToolParamField`; these are introduced in Task 5 and consumed in Task 6.
- Backend executor key is consistently `creative-video-generator` in registry, seed data, worker fallback, and task submission.
- Provider arguments are consistently `images`, `resolution`, `ratio`, `duration`, `generate_audio`, `return_last_frame`, `watermark`.
- WorkFile uses existing `file_type="video"`, `file_url="videos/creative_video.mp4"`, and `mime_type="video/mp4"`.
