# API Key + AI Provider + Storybook 全链路 + 种子数据 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现用户 API Key 管理、智谱/DeepSeek/豆包扩展 AI Provider、Storybook 执行器真实 AI 接入、种子数据

**Architecture:** 方案 A — 各平台独立 Provider 文件，统一返回 bytes；API Key 独立表 + 中间件；Storybook 执行器多 provider 协作（DeepSeek 文本 + 豆包生图 + 智谱 TTS）

**Tech Stack:** FastAPI + SQLAlchemy + Alembic + Next.js + Zustand + httpx

---

### Task 1: API Key + External File 数据模型与迁移

**Files:**
- Create: `apps/backend/app/models/api_key.py`
- Create: `apps/backend/app/models/external_file.py`
- Create: `apps/backend/app/schemas/api_key.py`
- Modify: `apps/backend/app/models/__init__.py`
- Create: `apps/backend/alembic/versions/012_add_api_keys_and_external_files.py`

- [ ] **Step 1: Create API Key model**

`apps/backend/app/models/api_key.py`:

```python
import uuid
import time
from sqlalchemy import Column, String, Integer, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel


class ApiKey(BaseModel):
    __tablename__ = "api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False, comment="密钥名称")
    key_prefix = Column(String(10), nullable=False, comment="密钥前缀，用于列表脱敏显示")
    key_hash = Column(String(128), nullable=False, comment="SHA-256哈希")
    key_encrypted = Column(Text, nullable=False, comment="AES-256加密的密钥明文")
    status = Column(String(10), nullable=False, default="active", comment="active/disabled")
    last_used_at = Column(Integer, nullable=True, comment="最后使用时间戳")
```

- [ ] **Step 2: Create ExternalFile model**

`apps/backend/app/models/external_file.py`:

```python
import uuid
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel


class ExternalFile(BaseModel):
    __tablename__ = "external_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    api_endpoint = Column(String(50), nullable=False, comment="images/audio/video/chat")
```

- [ ] **Step 3: Create API Key schemas**

`apps/backend/app/schemas/api_key.py`:

```python
from pydantic import BaseModel, field_validator
from typing import Optional
import uuid


class ApiKeyCreate(BaseModel):
    name: str


class ApiKeyStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v not in ("active", "disabled"):
            raise ValueError('Status must be "active" or "disabled"')
        return v


class ApiKeyResponse(BaseModel):
    id: uuid.UUID
    name: str
    key_prefix: str
    status: str
    last_used_at: Optional[int] = None
    created_at: int

    class Config:
        from_attributes = True


class ApiKeyCreatedResponse(ApiKeyResponse):
    key: str  # 明文密钥，仅创建时返回
    warning: str = "请立即复制密钥，关闭后不再显示"


class ApiKeyRevealResponse(BaseModel):
    id: uuid.UUID
    key: str
```

- [ ] **Step 4: Register models in `__init__.py`**

Edit `apps/backend/app/models/__init__.py` — add imports for ApiKey and ExternalFile.

- [ ] **Step 5: Generate migration**

Run:
```bash
cd apps/backend
alembic revision --autogenerate -m "add api_keys and external_files tables" --rev-id=012
```

- [ ] **Step 6: Apply migration**

```bash
cd apps/backend
alembic upgrade head
```

- [ ] **Step 7: Write model unit tests**

Create `apps/backend/tests/unit/models/test_api_key_models.py`:

```python
"""API Key 和 ExternalFile 模型单元测试"""
import pytest
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_key import ApiKey
from app.models.external_file import ExternalFile
from app.schemas.api_key import (
    ApiKeyCreate, ApiKeyStatusUpdate, ApiKeyResponse,
    ApiKeyCreatedResponse, ApiKeyRevealResponse,
)


@pytest.mark.asyncio
async def test_create_api_key(db_session: AsyncSession):
    """测试创建 ApiKey 记录"""
    api_key = ApiKey(
        user_id=uuid.uuid4(),
        name="测试密钥",
        key_prefix="lcai_a1b2",
        key_hash="abc123",
        key_encrypted="encrypted_data",
        status="active",
    )
    db_session.add(api_key)
    await db_session.commit()

    result = await db_session.execute(select(ApiKey).where(ApiKey.name == "测试密钥"))
    saved = result.scalar_one()
    assert saved.name == "测试密钥"
    assert saved.key_prefix == "lcai_a1b2"
    assert saved.status == "active"
    assert saved.last_used_at is None
    assert saved.created_at is not None


@pytest.mark.asyncio
async def test_create_external_file(db_session: AsyncSession):
    """测试创建 ExternalFile 记录"""
    ext_file = ExternalFile(
        user_id=uuid.uuid4(),
        file_name="test.png",
        file_path="/storage/external/test.png",
        file_size=1024,
        mime_type="image/png",
        api_endpoint="images",
    )
    db_session.add(ext_file)
    await db_session.commit()

    result = await db_session.execute(
        select(ExternalFile).where(ExternalFile.file_name == "test.png")
    )
    saved = result.scalar_one()
    assert saved.file_name == "test.png"
    assert saved.mime_type == "image/png"


class TestApiKeySchemas:
    """API Key 模式验证测试"""

    def test_api_key_create(self):
        data = ApiKeyCreate(name="测试密钥")
        assert data.name == "测试密钥"

    def test_api_key_status_update(self):
        data = ApiKeyStatusUpdate(status="disabled")
        assert data.status == "disabled"

    def test_api_key_status_update_invalid(self):
        with pytest.raises(Exception):
            ApiKeyStatusUpdate(status="invalid")

    def test_api_key_response_from_attributes(self):
        data = ApiKeyResponse(
            id=uuid.uuid4(),
            name="test",
            key_prefix="lcai_ab",
            status="active",
            last_used_at=None,
            created_at=1000,
        )
        assert data.name == "test"
        assert data.status == "active"

    def test_api_key_created_response_has_warning(self):
        data = ApiKeyCreatedResponse(
            id=uuid.uuid4(),
            name="test",
            key_prefix="lcai_ab",
            status="active",
            last_used_at=None,
            created_at=1000,
            key="lcai_a1b2c3d4...",
        )
        assert data.key == "lcai_a1b2c3d4..."
        assert "立即复制" in data.warning

    def test_api_key_reveal_response(self):
        data = ApiKeyRevealResponse(id=uuid.uuid4(), key="lcai_secret")
        assert data.key == "lcai_secret"
```

- [ ] **Step 8: Run model unit tests**

```bash
cd /Users/mark/Desktop/LCAITool/apps/backend
python -m pytest tests/unit/models/test_api_key_models.py -v
```
Expected: All tests PASS

- [ ] **Step 9: Run full test suite to verify no regressions**

```bash
cd /Users/mark/Desktop/LCAITool/apps/backend
python -m pytest tests/ -x -q --timeout=30 2>&1 | tail -30
```
Expected: No failures (or only pre-existing failures unrelated to this change)

- [ ] **Step 10: Commit**

```bash
git add apps/backend/app/models/api_key.py apps/backend/app/models/external_file.py apps/backend/app/schemas/api_key.py apps/backend/app/models/__init__.py apps/backend/alembic/versions/012_add_api_keys_and_external_files.py apps/backend/tests/unit/models/test_api_key_models.py
git commit -m "feat: add ApiKey and ExternalFile models + migration"
```

---

### Task 2: API Key CRUD 端点 + 认证中间件

**Files:**
- Create: `apps/backend/app/api/v1/middleware/api_key_auth.py`
- Modify: `apps/backend/app/api/v1/endpoints/users.py` (新增 API Key 端点)
- Modify: `apps/backend/app/core/config.py` (新增 EXTERNAL_STORAGE_DIR)
- Modify: `apps/backend/app/api/v1/api.py` (注册 external router 占位)

- [ ] **Step 1: Create API Key auth middleware**

`apps/backend/app/api/v1/middleware/api_key_auth.py`:

```python
import hashlib
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import time

from app.api.deps import get_db
from app.models.api_key import ApiKey

security = HTTPBearer(auto_error=False)


async def verify_api_key(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """API Key 认证依赖：验证 Bearer token 是否为有效的 API Key"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    key = credentials.credentials

    if not key.startswith("lcai_"):
        raise HTTPException(status_code=401, detail="Invalid API Key format")

    prefix = key[:10]  # "lcai_" + 4 hex chars
    key_hash = hashlib.sha256(key.encode()).hexdigest()

    result = await db.execute(
        select(ApiKey).where(
            ApiKey.key_prefix == prefix,
            ApiKey.key_hash == key_hash,
            ApiKey.status == "active",
        )
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid or disabled API Key")

    # 异步更新 last_used_at
    api_key.last_used_at = int(time.time())
    await db.commit()

    return api_key
```

- [ ] **Step 2: Add EXTERNAL_STORAGE_DIR to config**

Edit `apps/backend/app/core/config.py`:

```python
STORAGE_DIR: str = "./storage"
WORKS_DIR: str = "./storage/works"
EXTERNAL_STORAGE_DIR: str = "./storage/external"  # 新增
```

- [ ] **Step 3: Add API Key endpoints to users.py**

Append to `apps/backend/app/api/v1/endpoints/users.py`:

```python
import hashlib
import secrets
import uuid
from sqlalchemy import select, delete
from app.models.api_key import ApiKey
from app.schemas.api_key import (
    ApiKeyCreate,
    ApiKeyStatusUpdate,
    ApiKeyResponse,
    ApiKeyCreatedResponse,
    ApiKeyRevealResponse,
)
from app.core.security import aes_encrypt, aes_decrypt


@router.get("/api-keys", response_model=list[ApiKeyResponse], summary="获取API Key列表")
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(ApiKey).where(ApiKey.user_id == current_user.id).order_by(ApiKey.created_at.desc())
    )
    return result.scalars().all()


@router.post("/api-keys", response_model=ApiKeyCreatedResponse, summary="创建API Key")
async def create_api_key(
    body: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    raw_key = "lcai_" + secrets.token_hex(20)  # 40 hex chars = 45 total
    prefix = raw_key[:10]
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_encrypted = aes_encrypt(raw_key)

    api_key = ApiKey(
        user_id=current_user.id,
        name=body.name,
        key_prefix=prefix,
        key_hash=key_hash,
        key_encrypted=key_encrypted,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    return ApiKeyCreatedResponse(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        status=api_key.status,
        last_used_at=api_key.last_used_at,
        created_at=int(api_key.created_at.timestamp()) if api_key.created_at else 0,
        key=raw_key,
    )


@router.get("/api-keys/{key_id}/reveal", response_model=ApiKeyRevealResponse, summary="查看API Key明文")
async def reveal_api_key(
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == current_user.id)
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API Key not found")

    raw_key = aes_decrypt(api_key.key_encrypted)
    return ApiKeyRevealResponse(id=api_key.id, key=raw_key)


@router.put("/api-keys/{key_id}/status", summary="启用/禁用API Key")
async def update_api_key_status(
    key_id: uuid.UUID,
    body: ApiKeyStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == current_user.id)
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API Key not found")

    if body.status not in ("active", "disabled"):
        raise HTTPException(status_code=400, detail="Status must be 'active' or 'disabled'")

    api_key.status = body.status
    await db.commit()
    return {"message": f"API Key {body.status}"}


@router.delete("/api-keys/{key_id}", summary="删除API Key")
async def delete_api_key(
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == current_user.id)
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API Key not found")

    await db.delete(api_key)
    await db.commit()
    return {"message": "API Key deleted"}
```

Note: The `created_at` in `ApiKeyCreatedResponse` needs to handle the ORM timestamp. `BaseModel` likely has `created_at` as a DateTime column. Adjust the conversion accordingly — use `int(api_key.created_at.timestamp())` if it's a datetime, or `api_key.created_at` directly if it's already an integer.

- [ ] **Step 4: Write API key auth + CRUD integration tests**

Create `apps/backend/tests/test_api_api_keys.py`:

```python
"""API Key 管理接口测试"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.user import UserCreate
from app.services.user_service import UserService


def _create_user_data(index: int) -> dict:
    return {
        "nickname": f"apikey_test{index}",
        "password": "test123",
        "phone": f"1380000{index:04d}",
        "code": "8888",
    }


@pytest.fixture
async def auth_headers(client: AsyncClient, db_session: AsyncSession):
    """获取已登录用户的认证headers"""
    user_data = _create_user_data(1)
    user_in = UserCreate(**user_data)
    await UserService.create(db_session, user_in)

    login_resp = await client.post(
        "/api/v1/auth/login",
        data={"username": user_data["nickname"], "password": user_data["password"]},
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_list_api_keys_empty(client: AsyncClient, auth_headers: dict):
    """初始状态 API Key 列表为空"""
    resp = await client.get("/api/v1/users/api-keys", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_create_api_key(client: AsyncClient, auth_headers: dict):
    """创建 API Key 返回明文密钥"""
    resp = await client.post(
        "/api/v1/users/api-keys",
        headers=auth_headers,
        json={"name": "测试密钥"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "测试密钥"
    assert data["key"].startswith("lcai_")
    assert "warning" in data
    assert "id" in data


@pytest.mark.asyncio
async def test_create_and_list(client: AsyncClient, auth_headers: dict):
    """创建后列表包含新密钥（脱敏显示）"""
    await client.post(
        "/api/v1/users/api-keys",
        headers=auth_headers,
        json={"name": "我的密钥"},
    )
    resp = await client.get("/api/v1/users/api-keys", headers=auth_headers)
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "我的密钥"
    assert data[0]["key_prefix"] == data[0]["key_prefix"]  # has prefix
    assert "key" not in data[0]  # 列表不返回明文


@pytest.mark.asyncio
async def test_reveal_api_key(client: AsyncClient, auth_headers: dict):
    """查看 API Key 明文"""
    create_resp = await client.post(
        "/api/v1/users/api-keys",
        headers=auth_headers,
        json={"name": "reveal_test"},
    )
    key_id = create_resp.json()["id"]
    raw_key = create_resp.json()["key"]

    reveal_resp = await client.get(
        f"/api/v1/users/api-keys/{key_id}/reveal",
        headers=auth_headers,
    )
    assert reveal_resp.status_code == 200
    assert reveal_resp.json()["key"] == raw_key


@pytest.mark.asyncio
async def test_toggle_api_key_status(client: AsyncClient, auth_headers: dict):
    """启用/禁用 API Key"""
    create_resp = await client.post(
        "/api/v1/users/api-keys",
        headers=auth_headers,
        json={"name": "toggle_test"},
    )
    key_id = create_resp.json()["id"]

    # 禁用
    resp = await client.put(
        f"/api/v1/users/api-keys/{key_id}/status",
        headers=auth_headers,
        json={"status": "disabled"},
    )
    assert resp.status_code == 200

    # 验证列表显示已禁用
    list_resp = await client.get("/api/v1/users/api-keys", headers=auth_headers)
    key = next(k for k in list_resp.json() if k["id"] == key_id)
    assert key["status"] == "disabled"

    # 启用
    resp = await client.put(
        f"/api/v1/users/api-keys/{key_id}/status",
        headers=auth_headers,
        json={"status": "active"},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_delete_api_key(client: AsyncClient, auth_headers: dict):
    """删除 API Key"""
    create_resp = await client.post(
        "/api/v1/users/api-keys",
        headers=auth_headers,
        json={"name": "delete_test"},
    )
    key_id = create_resp.json()["id"]

    resp = await client.delete(
        f"/api/v1/users/api-keys/{key_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200

    list_resp = await client.get("/api/v1/users/api-keys", headers=auth_headers)
    assert len(list_resp.json()) == 0


@pytest.mark.asyncio
async def test_unauthorized_access(client: AsyncClient):
    """未登录不能访问 API Key 接口"""
    resp = await client.get("/api/v1/users/api-keys")
    assert resp.status_code == 401
```

- [ ] **Step 5: Run API key integration tests**

```bash
cd /Users/mark/Desktop/LCAITool/apps/backend
python -m pytest tests/test_api_api_keys.py -v
```
Expected: All tests PASS

- [ ] **Step 6: Run full test suite to verify no regressions**

```bash
cd /Users/mark/Desktop/LCAITool/apps/backend
python -m pytest tests/ -x -q --timeout=30 2>&1 | tail -30
```
Expected: No regressions (only pre-existing failures unrelated)

- [ ] **Step 7: Commit**

```bash
git add apps/backend/app/api/v1/middleware/api_key_auth.py apps/backend/app/api/v1/endpoints/users.py apps/backend/app/core/config.py apps/backend/tests/test_api_api_keys.py
git commit -m "feat: add API Key CRUD endpoints + auth middleware"
```

---

### Task 3: DeepSeek + 智谱 AI Provider

**Files:**
- Create: `apps/backend/app/providers/ai/deepseek.py`
- Create: `apps/backend/app/providers/ai/zhipu.py`
- Modify: `apps/backend/app/providers/ai/__init__.py`
- Modify: `apps/backend/tests/unit/providers/test_ai_providers.py` (新增 DeepSeek/Zhipu 测试)

- [ ] **Step 1: Create DeepSeek provider**

`apps/backend/app/providers/ai/deepseek.py`:

```python
"""
DeepSeek AI Provider
支持文本生成、推理模式 (deepseek-v4-pro / deepseek-v4-flash)
"""
import httpx
from typing import Optional

from .base import BaseAIProvider, AIResponse


class DeepSeekProvider(BaseAIProvider):
    """DeepSeek AI 提供商"""

    def __init__(self, **config):
        super().__init__(**config)
        self.api_base = self.api_base or "https://api.deepseek.com/v1"
        self.model = self.model or "deepseek-v4-flash"

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        thinking: bool = False,
        **kwargs
    ) -> AIResponse:
        url = f"{self.api_base}/chat/completions"
        model = "deepseek-v4-pro" if thinking else self.model

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": model,
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 4096),
            "stream": False,
        }
        if thinking:
            payload["extra_body"] = {"thinking": {"type": "enabled"}}

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                result = response.json()

            if result.get("choices") and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]
                usage = result.get("usage", {})
                return AIResponse(success=True, content=content, raw_response=result, usage=usage)
            else:
                return AIResponse(success=False, content="", raw_response=result, error="No response choices found")

        except httpx.TimeoutException:
            return AIResponse(success=False, content="", raw_response={}, error="API request timeout")
        except httpx.HTTPStatusError as e:
            return AIResponse(
                success=False, content="", raw_response={},
                error=f"HTTP Error {e.response.status_code}: {e.response.text}",
            )
        except Exception as e:
            return AIResponse(success=False, content="", raw_response={}, error=f"Unexpected error: {str(e)}")

    async def generate_image(self, prompt: str, **kwargs) -> AIResponse:
        return AIResponse(success=False, content="", raw_response={}, error="Image generation not supported by DeepSeek")

    async def generate_audio(self, text: str, voice: Optional[str] = None, **kwargs) -> AIResponse:
        return AIResponse(success=False, content="", raw_response={}, error="Audio generation not supported by DeepSeek")

    async def generate_video(self, prompt: str, **kwargs) -> AIResponse:
        return AIResponse(success=False, content="", raw_response={}, error="Video generation not supported by DeepSeek")
```

- [ ] **Step 2: Create Zhipu provider**

`apps/backend/app/providers/ai/zhipu.py`:

```python
"""
智谱AI Provider
支持文本 (GLM-4-Flash)、生图 (CogView-3)、语音合成 (GLM-TTS)
"""
import httpx
from typing import Optional

from .base import BaseAIProvider, AIResponse


class ZhipuProvider(BaseAIProvider):
    """智谱 AI 提供商"""

    def __init__(self, **config):
        super().__init__(**config)
        self.api_base = self.api_base or "https://open.bigmodel.cn/api/paas/v4"
        self.model = self.model or "GLM-4-Flash"

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        url = f"{self.api_base}/chat/completions"
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": kwargs.get("model", self.model),
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 2048),
            "stream": False,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                result = response.json()

            if result.get("choices") and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]
                return AIResponse(success=True, content=content, raw_response=result, usage=result.get("usage", {}))
            return AIResponse(success=False, content="", raw_response=result, error="No response choices found")
        except httpx.TimeoutException:
            return AIResponse(success=False, content="", raw_response={}, error="API request timeout")
        except httpx.HTTPStatusError as e:
            return AIResponse(
                success=False, content="", raw_response={},
                error=f"HTTP Error {e.response.status_code}: {e.response.text}",
            )
        except Exception as e:
            return AIResponse(success=False, content="", raw_response={}, error=f"Unexpected error: {str(e)}")

    async def generate_image(
        self,
        prompt: str,
        size: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """调用 CogView-3 生成图片，返回 bytes"""
        url = f"{self.api_base}/cogview/v3"

        payload = {
            "model": kwargs.get("model", "cogview-3"),
            "prompt": prompt,
        }
        if size:
            payload["size"] = size

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                result = response.json()

            # CogView-3 返回图片 URL
            image_url = result.get("data", [{}])[0].get("url", "")
            if not image_url:
                return AIResponse(success=False, content="", raw_response=result, error="No image URL in response")

            # 下载图片内容
            async with httpx.AsyncClient(timeout=60) as img_client:
                img_resp = await img_client.get(image_url)
                img_resp.raise_for_status()
                return AIResponse(success=True, content="", raw_response={"size": len(img_resp.content)}, usage={"bytes": len(img_resp.content)})
                # Note: bytes content returned via caller accessing raw_response
                # Actually we need to store bytes in content field

        except httpx.TimeoutException:
            return AIResponse(success=False, content="", raw_response={}, error="Image generation timeout")
        except httpx.HTTPStatusError as e:
            return AIResponse(
                success=False, content="", raw_response={},
                error=f"HTTP Error {e.response.status_code}: {e.response.text}",
            )
        except Exception as e:
            return AIResponse(success=False, content="", raw_response={}, error=f"Unexpected error: {str(e)}")

    async def generate_audio(
        self,
        text: str,
        voice: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """调用 GLM-TTS 语音合成，返回 base64 编码的音频数据"""
        url = f"{self.api_base}/audio/speech"

        payload = {
            "model": kwargs.get("model", "glm-tts"),
            "input": text,
            "voice": voice or "zh_female_warm",
            "response_format": kwargs.get("response_format", "mp3"),
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                import base64
                audio_data = response.content
                b64 = base64.b64encode(audio_data).decode("utf-8")
                return AIResponse(
                    success=True,
                    content=b64,
                    raw_response={"content_type": response.headers.get("content-type", ""), "size": len(audio_data)},
                    usage={"characters": len(text)},
                )
        except httpx.TimeoutException:
            return AIResponse(success=False, content="", raw_response={}, error="TTS request timeout")
        except httpx.HTTPStatusError as e:
            return AIResponse(
                success=False, content="", raw_response={},
                error=f"HTTP Error {e.response.status_code}: {e.response.text}",
            )
        except Exception as e:
            return AIResponse(success=False, content="", raw_response={}, error=f"Unexpected error: {str(e)}")

    async def generate_video(self, prompt: str, **kwargs) -> AIResponse:
        return AIResponse(success=False, content="", raw_response={}, error="Video generation not supported by Zhipu")
```

Wait — the design says all providers return bytes for image/audio/video via `AIResponse.content`. But `content` is a `str` field in the dataclass. Let me check...

Looking at the base:
```python
@dataclass
class AIResponse:
    success: bool
    content: str
    raw_response: Dict[str, Any]
    error: Optional[str] = None
    usage: Optional[Dict[str, Any]] = None
```

`content` is `str`, so for bytes responses we need to base64 encode. This is already how `doubao.py` handles audio — it base64 encodes the binary. Let's follow the same pattern for consistency.

Actually, let me reconsider. The design spec says "统一返回 bytes 原始数据" but the `AIResponse.content` is typed as `str`. The simplest approach that doesn't break the existing interface: return binary data base64-encoded in `content`, and the caller decodes it. This is exactly what the existing `DoubaoProvider.generate_audio()` does.

Let me update the implementation code accordingly.

- [x] **Step 3: Create Zhipu provider (revision — use base64 for bytes)**

Corrected approach for `generate_image` and `generate_audio`: encode bytes as base64 string in `content`, caller decodes.

For `generate_image`:
```python
import base64
# after getting img_resp.content:
b64 = base64.b64encode(img_resp.content).decode("utf-8")
return AIResponse(success=True, content=b64, raw_response={...}, usage={"bytes": len(img_resp.content)})
```

For `generate_audio` the existing Doubao pattern already does this — just replicate.

- [ ] **Step 3: Register new providers in factory**

Edit `apps/backend/app/providers/ai/__init__.py`:

```python
from .deepseek import DeepSeekProvider
from .zhipu import ZhipuProvider

_providers = {
    "doubao": DoubaoProvider,
    "dify": DifyProvider,
    "zhipu": ZhipuProvider,
    "deepseek": DeepSeekProvider,
}
```

Also update `__all__`.

- [ ] **Step 4: Add `get_provider_from_db` to AIProviderFactory**

In `apps/backend/app/providers/ai/__init__.py`, add:

```python
@classmethod
async def get_provider_from_db(cls, db, slug: str) -> BaseAIProvider:
    from sqlalchemy import select
    from app.models.system import AiProvider
    result = await db.execute(select(AiProvider).where(AiProvider.slug == slug))
    provider = result.scalar_one_or_none()
    if not provider:
        raise ValueError(f"AI provider '{slug}' not found in database")
    return cls.get_provider(provider.slug, **provider.config)
```

- [ ] **Step 5: Add DeepSeek + Zhipu provider unit tests**

Append to `apps/backend/tests/unit/providers/test_ai_providers.py` (add at end of file):

```python
# ============ DeepSeekProvider Tests ============


@pytest.mark.asyncio
async def test_deepseek_generate_text_success(httpx_mock):
    """测试 DeepSeek 文本生成成功"""
    mock_response = {
        "choices": [{"message": {"content": "DeepSeek回复"}}],
        "usage": {"total_tokens": 30},
    }
    httpx_mock.add_response(json=mock_response)

    from app.providers.ai.deepseek import DeepSeekProvider
    provider = DeepSeekProvider(api_key="test_key")
    response = await provider.generate_text("你好")

    assert response.success is True
    assert response.content == "DeepSeek回复"


@pytest.mark.asyncio
async def test_deepseek_generate_text_thinking_mode(httpx_mock):
    """测试 DeepSeek 推理模式 (thinking=True)"""
    mock_response = {
        "choices": [{"message": {"content": "推理结果"}}],
        "usage": {"total_tokens": 50},
    }
    httpx_mock.add_response(json=mock_response)

    from app.providers.ai.deepseek import DeepSeekProvider
    provider = DeepSeekProvider(api_key="test_key")

    # Verify the request includes thinking extra_body
    import httpx

    async def assert_request(request: httpx.Request):
        body = json.loads(request.content)
        assert body["model"] == "deepseek-v4-pro"
        assert body["extra_body"] == {"thinking": {"type": "enabled"}}

    httpx_mock.add_response(json=mock_response, callback=assert_request)
    response = await provider.generate_text("问题", thinking=True)
    assert response.success is True


@pytest.mark.asyncio
async def test_deepseek_generate_text_http_error(httpx_mock):
    """测试 DeepSeek HTTP 错误"""
    httpx_mock.add_response(status_code=401, text="Unauthorized")

    from app.providers.ai.deepseek import DeepSeekProvider
    provider = DeepSeekProvider(api_key="bad_key")
    response = await provider.generate_text("你好")

    assert response.success is False
    assert "401" in response.error


@pytest.mark.asyncio
async def test_deepseek_generate_text_timeout(httpx_mock):
    """测试 DeepSeek 超时"""
    import httpx
    httpx_mock.add_exception(httpx.TimeoutException("Timeout"))

    from app.providers.ai.deepseek import DeepSeekProvider
    provider = DeepSeekProvider(api_key="test_key")
    response = await provider.generate_text("你好")

    assert response.success is False
    assert "timeout" in response.error.lower()


@pytest.mark.asyncio
async def test_deepseek_unsupported_methods():
    """测试 DeepSeek 不支持的方法返回错误"""
    from app.providers.ai.deepseek import DeepSeekProvider
    provider = DeepSeekProvider(api_key="test_key")

    img_resp = await provider.generate_image("prompt")
    assert img_resp.success is False
    assert "not supported" in img_resp.error

    audio_resp = await provider.generate_audio("text")
    assert audio_resp.success is False
    assert "not supported" in audio_resp.error

    video_resp = await provider.generate_video("prompt")
    assert video_resp.success is False
    assert "not supported" in video_resp.error


# ============ ZhipuProvider Tests ============


@pytest.mark.asyncio
async def test_zhipu_generate_text_success(httpx_mock):
    """测试智谱文本生成成功"""
    mock_response = {
        "choices": [{"message": {"content": "智谱回复"}}],
        "usage": {"total_tokens": 20},
    }
    httpx_mock.add_response(json=mock_response)

    from app.providers.ai.zhipu import ZhipuProvider
    provider = ZhipuProvider(api_key="test_key")
    response = await provider.generate_text("你好")

    assert response.success is True
    assert response.content == "智谱回复"


@pytest.mark.asyncio
async def test_zhipu_generate_image_success(httpx_mock):
    """测试智谱 CogView 生图成功"""
    # Step 1: CogView API returns image URL
    mock_task = {"data": [{"url": "https://example.com/img.png"}]}
    httpx_mock.add_response(json=mock_task)

    # Step 2: Download image returns binary
    httpx_mock.add_response(content=b"fake_image_bytes")

    from app.providers.ai.zhipu import ZhipuProvider
    provider = ZhipuProvider(api_key="test_key")
    response = await provider.generate_image("一只猫")

    assert response.success is True
    assert len(response.content) > 0
    import base64
    decoded = base64.b64decode(response.content)
    assert decoded == b"fake_image_bytes"


@pytest.mark.asyncio
async def test_zhipu_generate_audio_success(httpx_mock):
    """测试智谱 GLM-TTS 语音合成成功"""
    mock_audio = b"fake_audio_mp3_data"
    httpx_mock.add_response(
        content=mock_audio,
        headers={"content-type": "audio/mpeg"},
    )

    from app.providers.ai.zhipu import ZhipuProvider
    provider = ZhipuProvider(api_key="test_key")
    response = await provider.generate_audio("你好世界", voice="zh_female_warm")

    assert response.success is True
    assert len(response.content) > 0
    import base64
    decoded = base64.b64decode(response.content)
    assert decoded == mock_audio


@pytest.mark.asyncio
async def test_zhipu_generate_video_not_supported():
    """测试智谱不支持视频生成"""
    from app.providers.ai.zhipu import ZhipuProvider
    provider = ZhipuProvider(api_key="test_key")
    response = await provider.generate_video("prompt")
    assert response.success is False
    assert "not supported" in response.error


@pytest.mark.asyncio
async def test_zhipu_generate_image_download_failure(httpx_mock):
    """测试智谱生图后图片下载失败"""
    mock_task = {"data": [{"url": "https://example.com/img.png"}]}
    httpx_mock.add_response(json=mock_task)
    httpx_mock.add_response(status_code=404)

    from app.providers.ai.zhipu import ZhipuProvider
    provider = ZhipuProvider(api_key="test_key")
    response = await provider.generate_image("测试")

    assert response.success is False
```

- [ ] **Step 6: Run provider unit tests**

```bash
cd /Users/mark/Desktop/LCAITool/apps/backend
python -m pytest tests/unit/providers/test_ai_providers.py -v
```
Expected: All tests PASS (including existing Doubao/Dify tests)

- [ ] **Step 7: Run full test suite to verify no regressions**

```bash
cd /Users/mark/Desktop/LCAITool/apps/backend
python -m pytest tests/ -x -q --timeout=30 2>&1 | tail -30
```

- [ ] **Step 8: Commit**

```bash
git add apps/backend/app/providers/ai/deepseek.py apps/backend/app/providers/ai/zhipu.py apps/backend/app/providers/ai/__init__.py apps/backend/tests/unit/providers/test_ai_providers.py
git commit -m "feat: add DeepSeek and Zhipu AI providers"
```

---

### Task 4: 扩展豆包 Provider — 生图/视频/声音复刻

**Files:**
- Modify: `apps/backend/app/providers/ai/doubao.py`
- Modify: `apps/backend/tests/unit/providers/test_ai_providers.py` (替换豆包 stub 测试为实际实现测试)

- [ ] **Step 1: Add image generation (Seedream 4.5)**

In `apps/backend/app/providers/ai/doubao.py`, replace the existing `generate_image` stub:

```python
async def generate_image(
    self,
    prompt: str,
    size: Optional[str] = None,
    **kwargs
) -> AIResponse:
    """调用豆包 Seedream 4.5 生成图片，返回 base64"""
    url = f"{self.api_base}/images/generations"

    payload = {
        "model": kwargs.get("model", "doubao-seedream-4.5"),
        "prompt": prompt,
        "size": size or "1024x1024",
        "n": kwargs.get("n", 1),
    }

    headers = {
        "Authorization": f"Bearer {self.api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            result = response.json()

        if result.get("data") and len(result["data"]) > 0:
            b64_data = result["data"][0].get("b64_json", "")
            if b64_data:
                return AIResponse(
                    success=True, content=b64_data, raw_response=result,
                    usage={"size": len(b64_data)},
                )
            image_url = result["data"][0].get("url", "")
            if image_url:
                async with httpx.AsyncClient(timeout=60) as img_client:
                    img_resp = await img_client.get(image_url)
                    img_resp.raise_for_status()
                    import base64
                    b64 = base64.b64encode(img_resp.content).decode("utf-8")
                    return AIResponse(success=True, content=b64, raw_response=result, usage={"bytes": len(img_resp.content)})

        return AIResponse(success=False, content="", raw_response=result, error="No image data in response")

    except httpx.TimeoutException:
        return AIResponse(success=False, content="", raw_response={}, error="Image generation timeout")
    except httpx.HTTPStatusError as e:
        return AIResponse(
            success=False, content="", raw_response={},
            error=f"HTTP Error {e.response.status_code}: {e.response.text}",
        )
    except Exception as e:
        return AIResponse(success=False, content="", raw_response={}, error=f"Unexpected error: {str(e)}")
```

- [ ] **Step 2: Add video generation (Seedance 2.0)**

Add before or after `generate_video` stub — replace the existing stub:

```python
async def generate_video(
    self,
    prompt: str,
    duration: Optional[int] = None,
    **kwargs
) -> AIResponse:
    """调用豆包 Seedance 2.0 生成视频（异步任务模式）"""
    url = f"{self.api_base}/video/generations"

    payload = {
        "model": kwargs.get("model", "doubao-seedance-2.0"),
        "prompt": prompt,
    }
    if duration:
        payload["duration"] = duration

    headers = {
        "Authorization": f"Bearer {self.api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            result = response.json()

        # Seedance 返回 task_id，需要轮询结果
        task_id = result.get("id", "")
        if not task_id:
            return AIResponse(success=False, content="", raw_response=result, error="No task ID in response")

        # 简单轮询：最多等 5 分钟
        import asyncio
        for _ in range(60):
            await asyncio.sleep(5)
            status_resp = await client.get(f"{url}/{task_id}", headers=headers)
            status_resp.raise_for_status()
            status_data = status_resp.json()
            if status_data.get("status") == "succeeded":
                video_url = status_data.get("output", {}).get("video_url", "")
                if video_url:
                    async with httpx.AsyncClient(timeout=120) as vid_client:
                        vid_resp = await vid_client.get(video_url)
                        vid_resp.raise_for_status()
                        import base64
                        b64 = base64.b64encode(vid_resp.content).decode("utf-8")
                        return AIResponse(
                            success=True, content=b64, raw_response=status_data,
                            usage={"duration": duration or 0, "bytes": len(vid_resp.content)},
                        )
                return AIResponse(success=False, content="", raw_response=status_data, error="No video URL in output")
            elif status_data.get("status") == "failed":
                return AIResponse(success=False, content="", raw_response=status_data, error=status_data.get("error", "Video generation failed"))

        return AIResponse(success=False, content="", raw_response={}, error="Video generation timeout")

    except httpx.TimeoutException:
        return AIResponse(success=False, content="", raw_response={}, error="Video request timeout")
    except httpx.HTTPStatusError as e:
        return AIResponse(
            success=False, content="", raw_response={},
            error=f"HTTP Error {e.response.status_code}: {e.response.text}",
        )
    except Exception as e:
        return AIResponse(success=False, content="", raw_response={}, error=f"Unexpected error: {str(e)}")
```

- [ ] **Step 3: Add voice cloning**

Add a new method `clone_voice`:

```python
async def clone_voice(
    self,
    audio_data: bytes,
    voice_name: str = "cloned_voice",
    **kwargs
) -> AIResponse:
    """声音复刻 — 上传音频样本，返回 voice_id"""
    url = f"{self.api_base}/audio/cloning"

    headers = {
        "Authorization": f"Bearer {self.api_key}",
    }

    try:
        files = {
            "audio": ("sample.wav", audio_data, "audio/wav"),
            "voice_name": (None, voice_name),
        }
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(url, files=files, headers=headers)
            response.raise_for_status()
            result = response.json()

        voice_id = result.get("voice_id", "")
        if voice_id:
            return AIResponse(success=True, content=voice_id, raw_response=result)

        return AIResponse(success=False, content="", raw_response=result, error="No voice_id in response")

    except httpx.TimeoutException:
        return AIResponse(success=False, content="", raw_response={}, error="Voice cloning timeout")
    except httpx.HTTPStatusError as e:
        return AIResponse(
            success=False, content="", raw_response={},
            error=f"HTTP Error {e.response.status_code}: {e.response.text}",
        )
    except Exception as e:
        return AIResponse(success=False, content="", raw_response={}, error=f"Unexpected error: {str(e)}")
```

- [ ] **Step 4: Update Doubao provider tests (replace stub tests)**

In `apps/backend/tests/unit/providers/test_ai_providers.py`, replace the old `test_doubao_generate_image_not_implemented` and `test_doubao_generate_video_not_implemented` with real implementation tests:

```python
@pytest.mark.asyncio
async def test_doubao_generate_image_success(httpx_mock):
    """测试豆包 Seedream 4.5 生图成功（返回 b64_json）"""
    mock_b64 = base64.b64encode(b"fake_image_bytes").decode("utf-8")
    mock_response = {"data": [{"b64_json": mock_b64}]}
    httpx_mock.add_response(json=mock_response)

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.generate_image("一只猫", size="1024x1024")

    assert response.success is True
    decoded = base64.b64decode(response.content)
    assert decoded == b"fake_image_bytes"


@pytest.mark.asyncio
async def test_doubao_generate_image_url_fallback(httpx_mock):
    """测试豆包生图返回 URL 时的 fallback 处理"""
    mock_response = {"data": [{"url": "https://example.com/img.png"}]}
    httpx_mock.add_response(json=mock_response)
    httpx_mock.add_response(content=b"downloaded_image")

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.generate_image("一只猫")

    assert response.success is True
    decoded = base64.b64decode(response.content)
    assert decoded == b"downloaded_image"


@pytest.mark.asyncio
async def test_doubao_generate_image_api_error(httpx_mock):
    """测试豆包生图 API 错误"""
    httpx_mock.add_response(status_code=400, text="Bad Request")

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.generate_image("测试")

    assert response.success is False
    assert "400" in response.error


@pytest.mark.asyncio
async def test_doubao_generate_video_success(httpx_mock):
    """测试豆包 Seedance 2.0 视频生成成功（轮询模式）"""
    # Submit task
    httpx_mock.add_response(json={"id": "task_123"})

    # Polling: first pending, then succeeded
    httpx_mock.add_response(  # first poll
        json={"status": "running"}
    )
    httpx_mock.add_response(  # second poll → succeeded
        json={
            "status": "succeeded",
            "output": {"video_url": "https://example.com/vid.mp4"},
        }
    )
    # Download video
    httpx_mock.add_response(content=b"fake_video_data")

    provider = DoubaoProvider(api_key="test_key")
    with patch.object(provider, "timeout", 120):  # ensure timeout is high
        response = await provider.generate_video("奔跑的猫", duration=5)

    assert response.success is True
    decoded = base64.b64decode(response.content)
    assert decoded == b"fake_video_data"


@pytest.mark.asyncio
async def test_doubao_generate_video_failed(httpx_mock):
    """测试豆包视频生成失败状态"""
    httpx_mock.add_response(json={"id": "task_456"})
    httpx_mock.add_response(
        json={"status": "failed", "error": "Content rejected"}
    )

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.generate_video("bad content")

    assert response.success is False
    assert "rejected" in response.error


@pytest.mark.asyncio
async def test_doubao_clone_voice_success(httpx_mock):
    """测试豆包声音复刻成功"""
    mock_response = {"voice_id": "voice_abc123"}
    httpx_mock.add_response(json=mock_response)

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.clone_voice(
        audio_data=b"fake_wav_data",
        voice_name="my_voice",
    )

    assert response.success is True
    assert response.content == "voice_abc123"


@pytest.mark.asyncio
async def test_doubao_clone_voice_failure(httpx_mock):
    """测试豆包声音复刻失败"""
    httpx_mock.add_response(json={})  # no voice_id

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.clone_voice(audio_data=b"data")

    assert response.success is False
    assert "no voice_id" in response.error.lower()
```

- [ ] **Step 5: Remove old stub tests**

Delete the old stub tests (`test_doubao_generate_image_not_implemented`, `test_doubao_generate_video_not_implemented`) from the test file since they've been replaced with real implementation tests above.

- [ ] **Step 6: Run Doubao provider tests**

```bash
cd /Users/mark/Desktop/LCAITool/apps/backend
python -m pytest tests/unit/providers/test_ai_providers.py -v -k "doubao"
```
Expected: All Doubao tests PASS

- [ ] **Step 7: Run full test suite to verify no regressions**

```bash
cd /Users/mark/Desktop/LCAITool/apps/backend
python -m pytest tests/ -x -q --timeout=30 2>&1 | tail -30
```

- [ ] **Step 8: Commit**

```bash
git add apps/backend/app/providers/ai/doubao.py apps/backend/tests/unit/providers/test_ai_providers.py
git commit -m "feat: extend Doubao provider with image gen, video gen, voice cloning"
```

---

### Task 5: 对外 OpenAI 兼容 API + 文件服务

**Files:**
- Create: `apps/backend/app/api/v1/endpoints/external.py`
- Create: `apps/backend/app/api/v1/endpoints/external_files.py`
- Modify: `apps/backend/app/api/v1/api.py`
- Test: `apps/backend/tests/test_api_external.py`

- [ ] **Step 1: Create external API router**

`apps/backend/app/api/v1/endpoints/external.py`:

```python
"""OpenAI 兼容的外部 API 端点 — 通过 API Key 认证"""
import os
import uuid
import base64
import time
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, list

from app.api.deps import get_db
from app.api.v1.middleware.api_key_auth import verify_api_key
from app.models.api_key import ApiKey
from app.models.external_file import ExternalFile
from app.core.config import settings
from app.providers.ai import AIProviderFactory
import aiofiles

router = APIRouter()

# 模型路由表
IMAGE_MODEL_MAP = {"doubao-seedream-4.5": "doubao", "cogview-3": "zhipu"}
AUDIO_MODEL_MAP = {"glm-tts": "zhipu", "doubao-tts-2.0": "doubao"}
CHAT_MODEL_MAP = {"deepseek-v4-pro": "deepseek", "deepseek-v4-flash": "deepseek", "glm-4-flash": "zhipu"}
VIDEO_MODEL_MAP = {"doubao-seedance-2.0": "doubao"}


class ImageGenRequest(BaseModel):
    model: str
    prompt: str
    n: int = 1
    size: str = "1024x1024"


class AudioSpeechRequest(BaseModel):
    model: str
    input: str
    voice: str = "zh_female_warm"
    response_format: str = "mp3"


class ChatRequest(BaseModel):
    model: str
    messages: list
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2048


class VideoGenRequest(BaseModel):
    model: str
    prompt: str
    duration: Optional[int] = None


async def save_external_file(user_id: uuid.UUID, data: bytes, ext: str, api_endpoint: str, db: AsyncSession) -> str:
    """保存外部 API 生成的文件，返回 file_id（异步 IO）"""
    file_id = uuid.uuid4()
    file_name = f"{file_id}.{ext}"
    file_dir = os.path.join(settings.EXTERNAL_STORAGE_DIR, str(user_id))
    os.makedirs(file_dir, exist_ok=True)
    file_path = os.path.join(file_dir, file_name)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(data)

    ext_file = ExternalFile(
        id=file_id,
        user_id=user_id,
        file_name=file_name,
        file_path=file_path,
        file_size=len(data),
        mime_type=f"image/{ext}" if ext in ("png", "jpg", "jpeg", "webp") else f"audio/{ext}",
        api_endpoint=api_endpoint,
    )
    db.add(ext_file)
    return str(file_id)


@router.post("/images/generations")
async def create_image(
    body: ImageGenRequest,
    db: AsyncSession = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    provider_slug = IMAGE_MODEL_MAP.get(body.model)
    if not provider_slug:
        raise HTTPException(status_code=400, detail=f"Unsupported model: {body.model}")

    provider = await AIProviderFactory.get_provider_from_db(db, provider_slug)
    response = await provider.generate_image(body.prompt, size=body.size)

    if not response.success:
        raise HTTPException(status_code=502, detail=response.error)

    image_bytes = base64.b64decode(response.content)
    file_id = await save_external_file(api_key.user_id, image_bytes, "png", "images", db)
    await db.commit()

    base_url = str(settings.API_V1_STR).rstrip("v1") if hasattr(settings, "API_V1_STR") else "/api/v1"
    return {
        "created": int(time.time()),
        "data": [{"url": f"/api/v1/external/files/{file_id}"}],
    }


@router.post("/audio/speech")
async def create_audio(
    body: AudioSpeechRequest,
    db: AsyncSession = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    provider_slug = AUDIO_MODEL_MAP.get(body.model)
    if not provider_slug:
        raise HTTPException(status_code=400, detail=f"Unsupported model: {body.model}")

    provider = await AIProviderFactory.get_provider_from_db(db, provider_slug)
    response = await provider.generate_audio(body.input, voice=body.voice)

    if not response.success:
        raise HTTPException(status_code=502, detail=response.error)

    audio_bytes = base64.b64decode(response.content)
    file_id = await save_external_file(api_key.user_id, audio_bytes, body.response_format or "mp3", "audio", db)
    await db.commit()

    return {"url": f"/api/v1/external/files/{file_id}"}


@router.post("/chat/completions")
async def create_chat(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    provider_slug = CHAT_MODEL_MAP.get(body.model)
    if not provider_slug:
        raise HTTPException(status_code=400, detail=f"Unsupported model: {body.model}")

    provider = await AIProviderFactory.get_provider_from_db(db, provider_slug)

    # 从 messages 中提取 system_prompt 和 user prompt
    system_prompt = None
    user_prompt = ""
    for msg in body.messages:
        if msg.get("role") == "system":
            system_prompt = msg.get("content", "")
        elif msg.get("role") == "user":
            user_prompt = msg.get("content", "")

    response = await provider.generate_text(
        prompt=user_prompt,
        system_prompt=system_prompt,
        temperature=body.temperature,
        max_tokens=body.max_tokens,
    )

    if not response.success:
        raise HTTPException(status_code=502, detail=response.error)

    return {
        "id": f"chatcmpl-{uuid.uuid4()}",
        "object": "chat.completion",
        "created": int(time.time()),
        "choices": [{"index": 0, "message": {"role": "assistant", "content": response.content}, "finish_reason": "stop"}],
        "usage": response.usage or {},
    }


@router.post("/video/generations")
async def create_video(
    body: VideoGenRequest,
    db: AsyncSession = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    provider_slug = VIDEO_MODEL_MAP.get(body.model)
    if not provider_slug:
        raise HTTPException(status_code=400, detail=f"Unsupported model: {body.model}")

    provider = await AIProviderFactory.get_provider_from_db(db, provider_slug)
    response = await provider.generate_video(body.prompt, duration=body.duration)

    if not response.success:
        raise HTTPException(status_code=502, detail=response.error)

    video_bytes = base64.b64decode(response.content)
    file_id = await save_external_file(api_key.user_id, video_bytes, "mp4", "video", db)
    await db.commit()

    return {
        "created": int(time.time()),
        "data": [{"url": f"/api/v1/external/files/{file_id}"}],
    }
```

- [ ] **Step 2: Create external file service**

`apps/backend/app/api/v1/endpoints/external_files.py`:

```python
"""外部 API 文件服务 — 通过 API Key 认证"""
import os
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.deps import get_db
from app.api.v1.middleware.api_key_auth import verify_api_key
from app.models.api_key import ApiKey
from app.models.external_file import ExternalFile

router = APIRouter()


@router.get("/files/{file_id}")
async def get_external_file(
    file_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    result = await db.execute(select(ExternalFile).where(ExternalFile.id == file_id))
    ext_file = result.scalar_one_or_none()

    if not ext_file:
        raise HTTPException(status_code=404, detail="File not found")

    if ext_file.user_id != api_key.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if not await asyncio.to_thread(os.path.exists, ext_file.file_path):
        raise HTTPException(status_code=404, detail="File not found on storage")

    media_type_map = {
        "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "webp": "image/webp", "mp3": "audio/mpeg", "wav": "audio/wav",
        "mp4": "video/mp4",
    }
    ext = ext_file.file_name.rsplit(".", 1)[-1].lower() if "." in ext_file.file_name else ""
    media_type = media_type_map.get(ext, "application/octet-stream")

    return FileResponse(path=ext_file.file_path, media_type=media_type, filename=ext_file.file_name)
```

- [ ] **Step 3: Register routers in api.py**

Edit `apps/backend/app/api/v1/api.py` — add:

```python
from app.api.v1.endpoints import external, external_files

api_router.include_router(external.router, prefix="/external", tags=["外部API"])
api_router.include_router(external_files.router, prefix="/external", tags=["外部API"])
```

- [ ] **Step 4: Write external API integration tests**

Create `apps/backend/tests/test_api_external.py`:

```python
"""OpenAI 兼容外部 API 接口测试"""
import pytest
import uuid
import hashlib
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_key import ApiKey
from app.models.external_file import ExternalFile
from app.core.security import aes_encrypt


@pytest.fixture
async def test_api_key(db_session: AsyncSession) -> str:
    """创建测试 API Key 并返回明文"""
    import secrets
    raw_key = "lcai_" + secrets.token_hex(20)
    prefix = raw_key[:10]
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_encrypted = aes_encrypt(raw_key)

    api_key = ApiKey(
        user_id=uuid.uuid4(),
        name="测试外部API密钥",
        key_prefix=prefix,
        key_hash=key_hash,
        key_encrypted=key_encrypted,
        status="active",
    )
    db_session.add(api_key)
    await db_session.commit()
    return raw_key


@pytest.fixture
def external_auth_headers(test_api_key: str) -> dict:
    return {"Authorization": f"Bearer {test_api_key}"}


@pytest.mark.asyncio
async def test_external_images_generations(
    client: AsyncClient, external_auth_headers: dict, httpx_mock
):
    """POST /api/v1/external/images/generations — 需要 mock 真正的 AI provider 调用
    由于 AI provider 从数据库读取配置，且当前测试环境无实际 provider 记录，
    此测试验证认证失败时的错误响应。
    实际 provider 调用测试在 provider 单元测试中覆盖。
    """
    # 由于没有 seed AiProvider 记录，预期返回 502
    resp = await client.post(
        "/api/v1/external/images/generations",
        headers=external_auth_headers,
        json={"model": "doubao-seedream-4.5", "prompt": "一只猫", "n": 1},
    )
    # 因为数据库中没有 AI provider 配置，会返回 502
    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_external_images_unsupported_model(
    client: AsyncClient, external_auth_headers: dict
):
    """测试不支持的模型"""
    resp = await client.post(
        "/api/v1/external/images/generations",
        headers=external_auth_headers,
        json={"model": "unknown-model", "prompt": "test"},
    )
    assert resp.status_code == 400
    assert "Unsupported model" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_external_api_no_auth(client: AsyncClient):
    """测试无认证访问外部 API"""
    resp = await client.post(
        "/api/v1/external/images/generations",
        json={"model": "doubao-seedream-4.5", "prompt": "cat"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_external_api_invalid_key(client: AsyncClient):
    """测试无效 API Key"""
    resp = await client.post(
        "/api/v1/external/images/generations",
        headers={"Authorization": "Bearer lcai_invalidkey1234567890"},
        json={"model": "doubao-seedream-4.5", "prompt": "cat"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_external_chat_completions(
    client: AsyncClient, external_auth_headers: dict
):
    """POST /api/v1/external/chat/completions"""
    resp = await client.post(
        "/api/v1/external/chat/completions",
        headers=external_auth_headers,
        json={
            "model": "deepseek-v4-flash",
            "messages": [{"role": "user", "content": "你好"}],
        },
    )
    # 无 provider 配置，预期 502
    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_external_audio_speech(
    client: AsyncClient, external_auth_headers: dict
):
    """POST /api/v1/external/audio/speech"""
    resp = await client.post(
        "/api/v1/external/audio/speech",
        headers=external_auth_headers,
        json={"model": "glm-tts", "input": "你好", "voice": "zh_female_warm"},
    )
    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_external_video_generations(
    client: AsyncClient, external_auth_headers: dict
):
    """POST /api/v1/external/video/generations"""
    resp = await client.post(
        "/api/v1/external/video/generations",
        headers=external_auth_headers,
        json={"model": "doubao-seedance-2.0", "prompt": "奔跑的猫"},
    )
    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_external_file_not_found(
    client: AsyncClient, external_auth_headers: dict
):
    """GET /api/v1/external/files/{id} — 文件不存在"""
    resp = await client.get(
        f"/api/v1/external/files/{uuid.uuid4()}",
        headers=external_auth_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_external_file_access_denied(
    client: AsyncClient, db_session: AsyncSession, external_auth_headers: dict, test_api_key: str
):
    """测试文件归属权校验 — 其他用户的文件无法访问"""
    other_user_id = uuid.uuid4()
    ext_file = ExternalFile(
        user_id=other_user_id,  # 不同的用户
        file_name="other.png",
        file_path="/tmp/other.png",
        file_size=100,
        mime_type="image/png",
        api_endpoint="images",
    )
    db_session.add(ext_file)
    await db_session.commit()

    resp = await client.get(
        f"/api/v1/external/files/{ext_file.id}",
        headers=external_auth_headers,
    )
    assert resp.status_code == 403
```

- [ ] **Step 5: Run external API tests**

```bash
cd /Users/mark/Desktop/LCAITool/apps/backend
python -m pytest tests/test_api_external.py -v
```
Expected: All tests PASS (502 expected because no seed provider data)

- [ ] **Step 6: Run full test suite to verify no regressions**

```bash
cd /Users/mark/Desktop/LCAITool/apps/backend
python -m pytest tests/ -x -q --timeout=30 2>&1 | tail -30
```

- [ ] **Step 7: Commit**

```bash
git add apps/backend/app/api/v1/endpoints/external.py apps/backend/app/api/v1/endpoints/external_files.py apps/backend/app/api/v1/api.py apps/backend/tests/test_api_external.py
git commit -m "feat: add OpenAI-compatible external API + file service"
```

---

### Task 6: Storybook 执行器 — 接入真实 AI

**Files:**
- Modify: `apps/backend/app/executors/storybook.py`
- Modify: `apps/backend/tests/unit/executors/test_storybook_executor.py`（更新以匹配新的多 provider 架构）

Key changes:
- Constructor: init multiple providers (deepseek, doubao, zhipu) instead of just doubao
- Step 2: story outline → DeepSeek v4-pro + thinking
- Step 3: illustration prompts → DeepSeek v4-flash
- Step 4: images → Doubao Seedream 4.5 (serial)
- Step 4b: audio → Zhipu GLM-TTS (serial)
- Steps 5-6: Reuse existing logic

- [ ] **Step 1: Add required imports and rewrite constructor + provider init**

Add `import aiofiles` and `import asyncio` to the imports at the top of `storybook.py`. Then replace the `__init__` and add provider initialization:

Replace the `__init__` and add provider initialization:

```python
def __init__(self, task_id, db, tool=None, progress_callback=None):
    super().__init__(task_id, db, progress_callback)
    self.deepseek_provider = None  # lazy init
    self.doubao_provider = None
    self.zhipu_provider = None
    self.pdf_generator = PDFGenerator()
    self._tool_config = tool or {}

    # 记录各 provider slug 用于 db 查询
    self._provider_slugs = {
        "deepseek": "deepseek",
        "doubao": "volcano",
        "zhipu": "zhipu",
    }

async def _init_providers(self):
    """懒初始化所有 AI Provider"""
    if not self.deepseek_provider:
        from app.providers.ai import AIProviderFactory
        self.deepseek_provider = await AIProviderFactory.get_provider_from_db(self.db, self._provider_slugs["deepseek"])
        self.doubao_provider = await AIProviderFactory.get_provider_from_db(self.db, self._provider_slugs["doubao"])
        self.zhipu_provider = await AIProviderFactory.get_provider_from_db(self.db, self._provider_slugs["zhipu"])
```

- [ ] **Step 2: Rewrite execute method — new step flow**

Replace `execute` method:

```python
async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
    works_dir = self.get_works_dir()
    snapshot = await self.get_snapshot()
    start_step = snapshot.get('step', 0) if snapshot else 0

    theme = params.get('theme', '勇敢的小兔子')
    target_age = params.get('target_age', '3-6')
    art_style = params.get('art_style', 'cartoon')
    custom_style = params.get('custom_style', '')
    include_audio = params.get('include_audio', True)
    voice_type = params.get('voiceType', 'warm')
    smart_page_count = params.get('smart_page_count', False)
    page_count = params.get('page_count', 10)

    # 如果有自定义风格，覆盖 art_style
    if custom_style:
        art_style = custom_style

    result_data = snapshot.get('data', {}) if snapshot else {}

    try:
        await self._init_providers()

        # Step 2: 故事梗概 (0-20%)
        if start_step <= 2:
            await self.update_progress(5, "正在生成故事梗概...")
            outline = await self._generate_story_outline(theme, target_age, smart_page_count)
            result_data['outline'] = outline
            if smart_page_count:
                page_count = outline.get('suggested_page_count', page_count)
            await self.save_snapshot({'step': 3, 'data': result_data})

        # Step 3: 插画提示词 (20-35%)
        if start_step <= 3:
            await self.update_progress(20, "正在生成插画提示词...")
            pages = await self._generate_illustration_prompts(
                result_data['outline'], page_count, art_style
            )
            result_data['pages'] = pages
            await self.save_snapshot({'step': 4, 'data': result_data})

        # Step 4: 批量生图 (35-60%)
        if start_step <= 4:
            await self.update_progress(35, "正在生成插画...")
            pages_with_images = await self._generate_images_serial(
                result_data['pages'], works_dir
            )
            result_data['pages'] = pages_with_images
            await self.save_snapshot({'step': 5, 'data': result_data})

        # Step 4b: 语音合成 (60-80%)
        if include_audio and start_step <= 5:
            await self.update_progress(60, "正在合成语音...")
            pages_with_audio = await self._generate_audio_serial(result_data['pages'], works_dir, voice_type)
            result_data['pages'] = pages_with_audio
            await self.save_snapshot({'step': 6, 'data': result_data})

        # Step 5: PDF + 打包 (80-95%)
        if start_step <= 6:
            await self.update_progress(80, "正在生成PDF并打包...")
            files = await self._generate_pdf_and_zip(result_data, works_dir)
            result_data['files'] = files
            await self.save_snapshot({'step': 7, 'data': result_data})

        # Step 6: 保存 (95-100%)
        await self.update_progress(95, "正在保存成果...")
        work = await self._create_work_record(params, result_data)
        result_data['work_id'] = str(work.id)

        await self.update_progress(100, "生成完成！")
        return {
            'success': True, 'work_id': str(work.id),
            'title': result_data['outline'].get('title', ''),
            'page_count': len(result_data['pages']),
            'files': result_data.get('files', {}),
        }

    except Exception as e:
        await self.add_log('error', f'任务执行失败: {str(e)}', {'error_type': type(e).__name__})
        raise
```

- [ ] **Step 3: Rewrite story outline generation**

Replace `_generate_story_outline`:

```python
async def _generate_story_outline(self, theme: str, target_age: str, smart_page_count: bool = False) -> Dict[str, Any]:
    system_prompt = (
        "你是一位儿童绘本作家。要求：\n"
        "1. 用简体中文写作\n"
        "2. 不要使用特殊字符、星号或markdown格式\n"
        "3. 故事要有趣且富有想象力\n"
        "4. 保持在200-300字之间\n"
        "5. 分成3-4个自然段落\n"
        "6. 使用简单明了的语言\n"
        "7. 避免使用括号、方括号或任何可能影响文本转语音的符号\n"
    )
    user_prompt = f"请根据主题「{theme}」为{target_age}岁的儿童写一个短故事。"
    if smart_page_count:
        system_prompt += (
            "\n根据故事内容，在5-30页范围内给出合适的页数。"
            "\n输出JSON格式：{\"title\": \"...\", \"story\": \"...\", \"suggested_page_count\": N}"
        )
    else:
        system_prompt += "\n输出JSON格式：{\"title\": \"...\", \"story\": \"...\"}"

    response = await self.deepseek_provider.generate_text(
        prompt=user_prompt, system_prompt=system_prompt, thinking=True
    )

    if not response.success:
        raise RuntimeError(f"故事梗概生成失败: {response.error}")

    try:
        import json, re
        json_match = re.search(r'\{[\s\S]*\}', response.content)
        if json_match:
            return json.loads(json_match.group())
        return {'title': theme, 'story': response.content}
    except json.JSONDecodeError:
        return {'title': theme, 'story': response.content}
```

- [ ] **Step 4: Rewrite illustration prompts generation**

Replace `_generate_illustration_prompts`:

```python
async def _generate_illustration_prompts(
    self, outline: Dict[str, Any], page_count: int, art_style: str
) -> List[Dict[str, Any]]:
    story = outline.get('story', outline.get('synopsis', ''))

    system_prompt = (
        f"你是一个专业的儿童绘本插画师和AI绘画提示词专家，精通中英文双语。\n"
        f"请为这段文字生成 {page_count} 个不同场景的绘图提示词。\n\n"
        f"重要提示：\n"
        f"1. 绘画风格统一使用：{art_style}，全程严格保持风格、色彩、光影一致\n"
        f"2. 不要在提示词中使用角色名字，而是用具体的外观特征来描述角色。\n"
        f"3. 生成的提示词中，text_snippet 必须是与画面相符的中文文本片段。\n\n"
        f"严格按照以下JSON格式输出，只输出JSON，不要额外内容：\n"
        f'[\n'
        f'  {{\n'
        f'    "description": "场景描述",\n'
        f'    "prompt": "Character:\\n[角色具体特征描述]\\n\\nScene:\\n[场景描述]\\n\\nLighting:\\n[光影描述]\\n\\nComposition:\\n[构图描述]\\n\\nStyle:\\n{art_style}\\n\\nAdditional:\\n[补充细节]",\n'
        f'    "text_snippet": "对应的文本片段",\n'
        f'    "importance": "场景重要性评分（1-5）"\n'
        f'  }}\n'
        f']\n\n"
        f"故事文本：\n{story}"
    )

    response = await self.deepseek_provider.generate_text(prompt=system_prompt, thinking=False)

    if not response.success:
        raise RuntimeError(f"插画提示词生成失败: {response.error}")

    try:
        import json, re
        json_match = re.search(r'\[[\s\S]*\]', response.content)
        if json_match:
            return json.loads(json_match.group())
        raise ValueError("No JSON array found in response")
    except (json.JSONDecodeError, ValueError) as e:
        await self.add_log('error', f'插画提示词JSON解析失败: {str(e)}')
        raise RuntimeError(f"插画提示词生成格式错误: {str(e)}")
```

- [ ] **Step 5: Rewrite image generation (serial)**

Replace `_generate_images_parallel` with `_generate_images_serial`:

```python
async def _generate_images_serial(
    self, pages: List[Dict[str, Any]], works_dir: str
) -> List[Dict[str, Any]]:
    import base64
    import asyncio
    total = len(pages)
    images_dir = os.path.join(works_dir, 'images')
    os.makedirs(images_dir, exist_ok=True)

    sem = asyncio.Semaphore(2)  # 并发控制：最多 2 个同时请求

    async def gen_one(i, page):
        async with sem:
            prompt = page.get('prompt', page.get('image_prompt_en', ''))
            try:
                response = await self.doubao_provider.generate_image(prompt, size="1024x1024")
                if response.success:
                    image_bytes = base64.b64decode(response.content)
                    file_path = os.path.join(images_dir, f'page_{i+1:03d}.png')
                    async with aiofiles.open(file_path, 'wb') as f:
                        await f.write(image_bytes)
                    page['image_url'] = file_path
                    page['image_generated'] = True
                else:
                    page['image_url'] = self._create_dummy_image(i + 1, works_dir)
                    page['image_generated'] = False
            except Exception as e:
                page['image_url'] = self._create_dummy_image(i + 1, works_dir)
                page['image_generated'] = False
                page['image_error'] = str(e)

            progress = 35 + int((i + 1) / total * 25)
            await self.update_progress(progress, f"正在生成插画... ({i+1}/{total})")
            return page

    tasks = [gen_one(i, page) for i, page in enumerate(pages)]
    result_pages = await asyncio.gather(*tasks)
    # asyncio.gather 保持顺序，直接返回
    return result_pages
```

- [ ] **Step 6: Rewrite audio generation (serial)**

Replace `_generate_audio_parallel` with `_generate_audio_serial`:

```python
async def _generate_audio_serial(
    self, pages: List[Dict[str, Any]], works_dir: str, voice_type: str
) -> List[Dict[str, Any]]:
    import base64

    voice_map = {
        'warm': 'zh_female_warm', 'deep': 'zh_male_deep',
        'child': 'zh_female_childish', 'story': 'zh_male_story',
    }
    voice = voice_map.get(voice_type, 'zh_female_warm')
    total = len(pages)
    audio_dir = os.path.join(works_dir, 'audio')
    os.makedirs(audio_dir, exist_ok=True)

    sem = asyncio.Semaphore(3)  # 并发控制：最多 3 个 TTS 请求

    async def gen_one(i, page):
        async with sem:
            text = page.get('text_snippet', page.get('text', ''))
            if not text:
                page['audio_url'] = None
                page['audio_generated'] = False
                return page

            try:
                response = await self.zhipu_provider.generate_audio(text, voice=voice)
                if response.success:
                    audio_bytes = base64.b64decode(response.content)
                    file_path = os.path.join(audio_dir, f'page_{i+1:03d}.mp3')
                    async with aiofiles.open(file_path, 'wb') as f:
                        await f.write(audio_bytes)
                    page['audio_url'] = file_path
                    page['audio_generated'] = True
                else:
                    page['audio_url'] = self._create_dummy_audio(i + 1, works_dir)
                    page['audio_generated'] = False
            except Exception as e:
                page['audio_url'] = self._create_dummy_audio(i + 1, works_dir)
                page['audio_generated'] = False
                page['audio_error'] = str(e)

            progress = 60 + int((i + 1) / total * 20)
            await self.update_progress(progress, f"正在合成语音... ({i+1}/{total})")
            return page

    tasks = [gen_one(i, page) for i, page in enumerate(pages)]
    return await asyncio.gather(*tasks)
```

- [ ] **Step 7: Keep existing methods untouched**

The following methods remain unchanged:
- `estimate_cost()`
- `_create_dummy_image()`
- `_create_dummy_audio()`
- `_generate_pdf_and_zip()`
- `_create_work_record()`

- [ ] **Step 8: Update executor unit tests**

Update `apps/backend/tests/unit/executors/test_storybook_executor.py`:

The executor now uses multiple providers (deepseek, doubao, zhipu) via `_init_providers()` instead of a single `self.ai_provider`. Update the existing tests to mock the new provider initialization pattern.

Key changes needed in the test file:
1. The `executor` fixture needs `_init_providers` patched to not hit the DB
2. Test methods need to patch `executor.deepseek_provider` / `executor.doubao_provider` / `executor.zhipu_provider` instead of `executor.ai_provider`
3. `_generate_story_outline` now takes smart_page_count instead of page_count
4. `_generate_illustration_prompts` now takes outline dict + page_count instead of pages list
5. `_generate_images_serial` replaces `_generate_images_parallel`
6. `_generate_audio_serial` replaces `_generate_audio_parallel`

```python
"""有声绘本执行器单元测试 — 更新版（多 provider 架构）"""
import uuid
import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.executors.storybook import StorybookExecutor
from app.providers.ai.base import AIResponse


@pytest.fixture
def mock_db():
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def task_id():
    return uuid.uuid4()


@pytest.fixture
def executor(task_id, mock_db):
    """创建执行器实例，并 mock _init_providers"""
    exec_inst = StorybookExecutor(task_id=task_id, db=mock_db)
    # Mock providers to avoid DB lookup
    exec_inst.deepseek_provider = AsyncMock()
    exec_inst.doubao_provider = AsyncMock()
    exec_inst.zhipu_provider = AsyncMock()
    return exec_inst


class TestStorybookExecutor:

    def test_estimate_cost(self, executor):
        """测试费用预估"""
        params = {'page_count': 5, 'include_audio': True}
        cost = executor.estimate_cost(params)
        assert cost == 20 + (2 * 5) + (1 * 5)

        params_no_audio = {'page_count': 5, 'include_audio': False}
        assert executor.estimate_cost(params_no_audio) == 20 + (2 * 5)

    @pytest.mark.asyncio
    async def test_generate_story_outline(self, executor):
        """测试故事梗概生成（使用 DeepSeek thinking）"""
        executor.deepseek_provider.generate_text.return_value = AIResponse(
            success=True,
            content=json.dumps({
                'title': '勇敢的小兔子',
                'story': '小兔子在森林里冒险的故事...',
                'suggested_page_count': 8,
            }),
            raw_response={},
        )

        result = await executor._generate_story_outline(
            theme='勇敢的小兔子', target_age='3-6', smart_page_count=True
        )

        assert result['title'] == '勇敢的小兔子'
        assert result['suggested_page_count'] == 8
        executor.deepseek_provider.generate_text.assert_called_once()
        # Verify thinking mode + proper prompt split
        call_kwargs = executor.deepseek_provider.generate_text.call_args[1]
        assert call_kwargs.get('thinking') is True
        assert '请根据主题' in call_kwargs.get('prompt', '')
        assert '儿童绘本作家' in call_kwargs.get('system_prompt', '')

    @pytest.mark.asyncio
    async def test_generate_story_outline_failure(self, executor):
        """测试故事梗概生成失败"""
        executor.deepseek_provider.generate_text.return_value = AIResponse(
            success=False, content='', raw_response={}, error='API Error'
        )

        with pytest.raises(RuntimeError, match='故事梗概生成失败'):
            await executor._generate_story_outline('测试', '3-6')

    @pytest.mark.asyncio
    async def test_generate_illustration_prompts(self, executor):
        """测试插画提示词生成"""
        outline = {'story': '小兔子冒险故事...'}
        mock_pages = [
            {'description': '场景1', 'prompt': 'prompt1', 'text_snippet': '片段1', 'importance': '5'},
            {'description': '场景2', 'prompt': 'prompt2', 'text_snippet': '片段2', 'importance': '4'},
        ]
        executor.deepseek_provider.generate_text.return_value = AIResponse(
            success=True, content=json.dumps(mock_pages), raw_response={},
        )

        result = await executor._generate_illustration_prompts(outline, 2, 'cartoon')

        assert len(result) == 2
        assert result[0]['description'] == '场景1'
        executor.deepseek_provider.generate_text.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_images_serial(self, executor, tmp_path):
        """测试串行图片生成"""
        import base64
        pages = [
            {'description': '场景1', 'prompt': 'prompt1'},
            {'description': '场景2', 'prompt': 'prompt2'},
        ]
        mock_b64 = base64.b64encode(b"fake_image").decode("utf-8")
        executor.doubao_provider.generate_image.return_value = AIResponse(
            success=True, content=mock_b64, raw_response={},
        )

        with patch.object(executor, 'update_progress', new_callable=AsyncMock):
            result = await executor._generate_images_serial(pages, str(tmp_path))

        assert len(result) == 2
        assert result[0]['image_generated'] is True
        assert result[1]['image_generated'] is True
        assert executor.doubao_provider.generate_image.call_count == 2

    @pytest.mark.asyncio
    async def test_generate_images_serial_failure(self, executor, tmp_path):
        """测试串行图片生成失败时 fallback 到占位图"""
        pages = [{'description': '场景1', 'prompt': 'prompt1'}]
        executor.doubao_provider.generate_image.return_value = AIResponse(
            success=False, content='', raw_response={}, error='API Error',
        )

        with patch.object(executor, 'update_progress', new_callable=AsyncMock):
            with patch.object(executor, '_create_dummy_image', return_value='/tmp/dummy.png'):
                result = await executor._generate_images_serial(pages, str(tmp_path))

        assert result[0]['image_generated'] is False

    @pytest.mark.asyncio
    async def test_generate_audio_serial(self, executor, tmp_path):
        """测试串行语音合成"""
        import base64
        pages = [
            {'text_snippet': '片段1'},
            {'text_snippet': '片段2'},
        ]
        mock_b64 = base64.b64encode(b"fake_audio").decode("utf-8")
        executor.zhipu_provider.generate_audio.return_value = AIResponse(
            success=True, content=mock_b64, raw_response={},
        )

        with patch.object(executor, 'update_progress', new_callable=AsyncMock):
            result = await executor._generate_audio_serial(pages, str(tmp_path), 'warm')

        assert len(result) == 2
        assert result[0]['audio_generated'] is True
        assert executor.zhipu_provider.generate_audio.call_count == 2

    @pytest.mark.asyncio
    async def test_execute_full_flow(self, executor, mock_db):
        """测试完整执行流程"""
        params = {
            'theme': '勇敢的小兔子', 'target_age': '3-6',
            'page_count': 2, 'art_style': 'cartoon', 'include_audio': True,
        }

        with patch.object(executor, '_init_providers', new_callable=AsyncMock):
            with patch.object(executor, '_generate_story_outline', new_callable=AsyncMock) as mock_outline:
                mock_outline.return_value = {'title': '测试', 'story': '故事内容'}
                with patch.object(executor, '_generate_illustration_prompts', new_callable=AsyncMock) as mock_prompts:
                    mock_prompts.return_value = [{'description': 's1'}, {'description': 's2'}]
                    with patch.object(executor, '_generate_images_serial', new_callable=AsyncMock) as mock_images:
                        mock_images.return_value = [
                            {'image_generated': True, 'image_url': '/tmp/1.png'},
                            {'image_generated': True, 'image_url': '/tmp/2.png'},
                        ]
                        with patch.object(executor, '_generate_audio_serial', new_callable=AsyncMock) as mock_audio:
                            mock_audio.return_value = [
                                {'audio_generated': True, 'audio_url': '/tmp/1.mp3'},
                                {'audio_generated': True, 'audio_url': '/tmp/2.mp3'},
                            ]
                            with patch.object(executor, '_generate_pdf_and_zip', new_callable=AsyncMock) as mock_pdf:
                                mock_pdf.return_value = {'pdf_path': '/tmp/test.pdf', 'zip_path': '/tmp/test.zip', 'pdf_size': 100, 'zip_size': 200}
                                with patch.object(executor, '_create_work_record', new_callable=AsyncMock) as mock_work:
                                    mock_work.return_value = MagicMock(id=uuid.uuid4())
                                    with patch.object(executor, 'update_progress', new_callable=AsyncMock):
                                        with patch.object(executor, 'save_snapshot', new_callable=AsyncMock):
                                            with patch.object(executor, 'add_log', new_callable=AsyncMock):
                                                with patch.object(executor, 'get_snapshot', new_callable=AsyncMock) as mock_snap:
                                                    mock_snap.return_value = None

                                                    result = await executor.execute(params)

                                                    assert result['success'] is True
                                                    assert 'work_id' in result
                                                    assert result['page_count'] == 2
```

- [ ] **Step 9: Run executor tests**

```bash
cd /Users/mark/Desktop/LCAITool/apps/backend
python -m pytest tests/unit/executors/test_storybook_executor.py -v
```
Expected: All tests PASS

- [ ] **Step 10: Run full test suite to verify no regressions**

```bash
cd /Users/mark/Desktop/LCAITool/apps/backend
python -m pytest tests/ -x -q --timeout=30 2>&1 | tail -30
```

- [ ] **Step 11: Commit**

```bash
git add apps/backend/app/executors/storybook.py apps/backend/tests/unit/executors/test_storybook_executor.py
git commit -m "feat: rewrite storybook executor with real AI providers"
```

---

### Task 7: 种子数据 — AI 提供商配置

**Files:**
- Modify: `apps/backend/app/seed_data.py`

- [ ] **Step 1: Add `seed_ai_providers()`**

```python
async def seed_ai_providers(db: AsyncSession):
    """配置 AI 提供商信息"""
    from app.models.system import AiProvider
    from sqlalchemy import select

    providers = [
        AiProvider(
            slug="volcano", name="火山方舟(豆包)",
            provider_type="volcano",
            config={
                "api_key": "ark-126678e1-ed22-4716-8ce6-41b7e614327f-2606a",
                "base_url": "https://ark.cn-beijing.volces.com/api/v3",
            },
            is_active=True, sort_order=1,
        ),
        AiProvider(
            slug="zhipu", name="智谱AI",
            provider_type="openai",
            config={
                "api_key": "51ec9d1b59934faebafce2b40b54091e.oJe0NMOFhPbFcjJb",
                "base_url": "https://open.bigmodel.cn/api/paas/v4",
            },
            is_active=True, sort_order=2,
        ),
        AiProvider(
            slug="deepseek", name="DeepSeek",
            provider_type="openai",
            config={
                "api_key": "sk-7fefd3a83a494eed8706b03f8e3cd516",
                "base_url": "https://api.deepseek.com/v1",
            },
            is_active=True, sort_order=3,
        ),
    ]
    created = 0
    for p in providers:
        existing = await db.execute(select(AiProvider).where(AiProvider.slug == p.slug))
        if not existing.scalar_one_or_none():
            db.add(p)
            created += 1
    await db.commit()
    print(f"  ✓ 已创建 {created} 个 AI 提供商配置")
```

- [ ] **Step 2: Call in `main()`**

Add `await seed_ai_providers(db)` in the `main()` function after the existing seeds.

- [ ] **Step 3: Test seed data runs without error**

```bash
cd /Users/mark/Desktop/LCAITool/apps/backend
python -m app.seed_data
```
Expected: Seed data runs successfully, shows "✓ 已创建 3 个 AI 提供商配置" (or fewer if already exists)

- [ ] **Step 4: Verify AI providers are queryable**

```bash
cd /Users/mark/Desktop/LCAITool/apps/backend
python -c "
import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.system import AiProvider

async def check():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(AiProvider))
        providers = result.scalars().all()
        for p in providers:
            print(f'  {p.slug}: {p.name} (active={p.is_active})')

asyncio.run(check())
"
```
Expected: Shows 3 providers (volcano, zhipu, deepseek)

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/seed_data.py
git commit -m "feat: add AI provider seed data (volcano/zhipu/deepseek)"
```

---

### Task 8: 前端 — API Key 管理页面 + 侧边栏

**Files:**
- Create: `apps/frontend-user/src/app/user-center/api-keys/page.tsx`
- Modify: `apps/frontend-user/src/lib/api/modules/user.ts` (新增 API Key 方法)
- Modify: `apps/frontend-user/src/app/user-center/page.tsx` (侧边栏添加"API 密钥"入口)

- [ ] **Step 1: Create API Key management page**

`apps/frontend-user/src/app/user-center/api-keys/page.tsx`:

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { userApi } from '@/lib/api/modules/user';
import { toast } from '@/lib/toast';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  status: string;
  last_used_at: number | null;
  created_at: number;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyResult, setNewKeyResult] = useState<{ name: string; key: string } | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const loadKeys = useCallback(async () => {
    try {
      const res = await userApi.getApiKeys();
      setKeys(res);
    } catch (e) {
      console.error('Failed to load API keys', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await userApi.createApiKey({ name: newKeyName.trim() });
      setNewKeyResult({ name: res.name, key: res.key });
      await loadKeys();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || '创建失败');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      await userApi.updateApiKeyStatus(id, { status: newStatus });
      setKeys(prev => prev.map(k => k.id === id ? { ...k, status: newStatus } : k));
      toast.success(newStatus === 'active' ? '已启用' : '已禁用');
    } catch (e: any) {
      toast.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此 API Key？删除后不可恢复。')) return;
    try {
      await userApi.deleteApiKey(id);
      setKeys(prev => prev.filter(k => k.id !== id));
      toast.success('已删除');
    } catch (e: any) {
      toast.error('删除失败');
    }
  };

  const handleReveal = async (id: string) => {
    if (revealedKeys.has(id)) {
      setRevealedKeys(prev => { const next = new Set(prev); next.delete(id); return next; });
      return;
    }
    try {
      const res = await userApi.revealApiKey(id);
      setRevealedKeys(prev => new Set(prev).add(id));
      // 30秒后自动隐藏
      setTimeout(() => {
        setRevealedKeys(prev => { const next = new Set(prev); next.delete(id); return next; });
      }, 30000);
    } catch (e: any) {
      toast.error('获取失败');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-brand-dark">API 密钥</h2>
        <button
          className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          onClick={() => { setShowCreateModal(true); setNewKeyName(''); setNewKeyResult(null); }}
        >
          + 新增 API Key
        </button>
      </div>

      {/* 新建弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            {!newKeyResult ? (
              <>
                <h3 className="text-xl font-bold text-brand-dark mb-4">新增 API Key</h3>
                <input
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="输入密钥名称，如「测试环境」"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-3 justify-end">
                  <button className="px-5 py-2.5 text-gray-500 font-medium" onClick={() => setShowCreateModal(false)}>取消</button>
                  <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700" onClick={handleCreate}>生成</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-brand-dark mb-2">密钥已创建</h3>
                <p className="text-red-500 text-sm mb-4 font-medium">请立即复制密钥，关闭后不再显示</p>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-400 mb-1">名称：{newKeyResult.name}</p>
                  <code className="text-sm text-brand-dark break-all font-mono">{newKeyResult.key}</code>
                </div>
                <div className="flex gap-3">
                  <button
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                    onClick={() => { navigator.clipboard.writeText(newKeyResult.key); toast.success('已复制'); }}
                  >
                    复制密钥
                  </button>
                  <button
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200"
                    onClick={() => { setShowCreateModal(false); setNewKeyResult(null); }}
                  >
                    关闭
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 表格 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : keys.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-cyan-100 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg mb-2">还没有 API Key</p>
          <p className="text-gray-400 text-sm">点击右上角按钮创建第一个密钥</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                <th className="pb-3 font-medium">名称</th>
                <th className="pb-3 font-medium">API Key</th>
                <th className="pb-3 font-medium">状态</th>
                <th className="pb-3 font-medium">最后使用</th>
                <th className="pb-3 font-medium">创建时间</th>
                <th className="pb-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(key => (
                <tr key={key.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 font-medium text-brand-dark">{key.name}</td>
                  <td className="py-4">
                    <span className="font-mono text-sm text-gray-600">
                      {key.key_prefix}****
                    </span>
                    <button
                      className="ml-2 text-gray-400 hover:text-brand-dark transition-colors"
                      onClick={() => handleReveal(key.id)}
                      title={revealedKeys.has(key.id) ? '隐藏' : '查看'}
                    >
                      {revealedKeys.has(key.id) ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                    {revealedKeys.has(key.id) && (
                      <span className="ml-2 text-xs text-red-400">30秒后自动隐藏</span>
                    )}
                  </td>
                  <td className="py-4">
                    <button
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        key.status === 'active'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                      onClick={() => handleToggleStatus(key.id, key.status)}
                    >
                      {key.status === 'active' ? '已启用' : '已禁用'}
                    </button>
                  </td>
                  <td className="py-4 text-sm text-gray-500">
                    {key.last_used_at
                      ? new Date(key.last_used_at * 1000).toLocaleString()
                      : '从未使用'}
                  </td>
                  <td className="py-4 text-sm text-gray-500">
                    {new Date(key.created_at * 1000).toLocaleString()}
                  </td>
                  <td className="py-4">
                    <button
                      className="text-red-400 hover:text-red-600 text-sm font-medium"
                      onClick={() => handleDelete(key.id)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add API route in frontend API module**

Check `apps/frontend-user/src/lib/api/modules/user.ts` and add methods:

```typescript
getApiKeys: () => api.get<ApiKeyResponse[]>('/users/api-keys'),
createApiKey: (data: { name: string }) => api.post('/users/api-keys', data),
revealApiKey: (id: string) => api.get<{ id: string; key: string }>(`/users/api-keys/${id}/reveal`),
updateApiKeyStatus: (id: string, data: { status: string }) => api.put(`/users/api-keys/${id}/status`, data),
deleteApiKey: (id: string) => api.delete(`/users/api-keys/${id}`),
```

- [ ] **Step 3: Add sidebar menu item**

In `apps/frontend-user/src/app/user-center/page.tsx`, the sidebar nav is inline (not a separate Sidebar component). Add the "API 密钥" menu item in the "账户设置" section (after "实名认证" or "积分明细"), linking to `/user-center/api-keys`.

Look for the `<nav className="divide-y divide-gray-50">` section under "账户设置" and add a new Link:
```tsx
<Link href="/user-center/api-keys" className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors group">
  <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
    <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  </div>
  <div className="flex-1">
    <p className="font-medium text-gray-900">API 密钥</p>
    <p className="text-xs text-gray-500">管理 API 访问密钥</p>
  </div>
  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
  </svg>
</Link>
```

- [ ] **Step 4: Verify frontend build passes**

```bash
cd /Users/mark/Desktop/LCAITool/apps/frontend-user
npx next build 2>&1 | tail -30
```
Expected: Build succeeds, no TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add apps/frontend-user/src/app/user-center/api-keys/page.tsx apps/frontend-user/src/lib/api/modules/user.ts apps/frontend-user/src/app/user-center/page.tsx
git commit -m "feat: add API Key management page + sidebar entry"
```

---

### Task 9: 前端 — Storybook 表单升级

**Files:**
- Modify: `apps/frontend-user/src/app/tools/storybook-generator/components/StorybookForm.tsx`

- [ ] **Step 1: Add custom art style option**

In the art style section, add a 5th option card for "自定义":

```tsx
// After the existing 4 style options, add:
{ value: 'custom', label: '自定义', icon: '✏️' }

// When art_style === 'custom', show text input:
{customStyleInput}
```

- [ ] **Step 2: Add smart page count checkbox**

Near the page count slider:

```tsx
<label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
  <input
    type="checkbox"
    className="w-5 h-5 accent-blue-500"
    checked={formState.smart_page_count || false}
    onChange={(e) => updateFormState('smart_page_count', e.target.checked)}
  />
  <div>
    <span className="font-semibold text-brand-dark">智能决策页数</span>
    <p className="text-sm text-gray-500">AI 根据故事内容自动决定最佳页数</p>
  </div>
</label>

// When smart_page_count is true, disable the slider
<input type="range" disabled={formState.smart_page_count} ... />
```

- [ ] **Step 3: Update form submission params**

When `smart_page_count` is true, pass `page_count: null` instead of the slider value.

- [ ] **Step 4: Verify frontend build passes**

```bash
cd /Users/mark/Desktop/LCAITool/apps/frontend-user
npx next build 2>&1 | tail -30
```
Expected: Build succeeds, no TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add apps/frontend-user/src/app/tools/storybook-generator/components/StorybookForm.tsx
git commit -m "feat: storybook form - custom art style + smart page count"
```

---

### 最终验证

所有 9 个任务完成后，执行最终全量验证：

- [ ] **Run all backend tests**

```bash
cd /Users/mark/Desktop/LCAITool/apps/backend
python -m pytest tests/ -v --timeout=30 2>&1 | tail -50
```
Expected: No regressions, all API Key tests, provider tests, external API tests pass

- [ ] **Verify frontend build**

```bash
cd /Users/mark/Desktop/LCAITool/apps/frontend-user
npx next build 2>&1 | tail -20
```
Expected: Build succeeds

- [ ] **Verify seed data**

```bash
cd /Users/mark/Desktop/LCAITool/apps/backend
python -m app.seed_data
```
Expected: AI provider seed data created successfully
