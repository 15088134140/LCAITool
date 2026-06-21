"""外部 API + 文件服务 集成测试"""
import hashlib
import secrets
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_key import ApiKey
from app.models.external_file import ExternalFile
from app.models.system import AiProvider
from app.models.user import User


@pytest.fixture
async def test_api_key(db_session: AsyncSession, verified_user_id: uuid.UUID) -> str:
    """创建一个活跃的 API Key，返回原始密钥字符串。"""
    raw_key = "lcai_" + secrets.token_hex(20)
    api_key = ApiKey(
        id=uuid.uuid4(),
        user_id=verified_user_id,
        name="test-external-key",
        key_prefix=raw_key[:10],
        key_hash=hashlib.sha256(raw_key.encode()).hexdigest(),
        key_encrypted="test_encrypted_placeholder",
        status="active",
    )
    db_session.add(api_key)
    await db_session.commit()
    return raw_key


@pytest.fixture
async def external_auth_headers(test_api_key: str) -> dict:
    """返回 API Key 认证的请求头。"""
    return {"Authorization": f"Bearer {test_api_key}"}


@pytest.fixture
async def other_user_id(db_session: AsyncSession) -> uuid.UUID:
    """创建另一个用户，用于文件归属权测试。"""
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        nickname="其他用户",
        balance=500,
        status=1,
    )
    db_session.add(user)
    await db_session.commit()
    return user_id


# ==================== 认证相关 ====================


@pytest.mark.asyncio
async def test_external_api_no_auth(client: AsyncClient):
    """无认证头请求应返回 401。"""
    response = await client.post(
        "/api/v1/external/images/generations",
        json={"provider": "volcano", "prompt": "test"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_external_api_invalid_key(client: AsyncClient):
    """无效 API Key 请求应返回 401。"""
    response = await client.post(
        "/api/v1/external/images/generations",
        json={"provider": "volcano", "prompt": "test"},
        headers={"Authorization": "Bearer lcai_invalidkey1234567890"},
    )
    assert response.status_code == 401


# ==================== 图片生成 ====================


@pytest.mark.asyncio
async def test_external_images_generations(
    client: AsyncClient,
    external_auth_headers: dict,
):
    """图片生成请求，无 Provider 配置 → 503。"""
    response = await client.post(
        "/api/v1/external/images/generations",
        json={"provider": "volcano", "prompt": "一只可爱的小猫"},
        headers=external_auth_headers,
    )
    assert response.status_code == 503
    data = response.json()
    # 项目使用自定义错误格式：{"code": 503, "message": "...", ...}
    assert "message" in data
    assert "AI 提供商 'volcano' 未配置" in data["message"]
    assert data["error_code"] == "AI_PROVIDER_CONFIG_ERROR"
    assert "detail" not in data


@pytest.mark.asyncio
async def test_external_images_unsupported_provider(
    client: AsyncClient,
    external_auth_headers: dict,
):
    """不存在的 provider slug → 503（DB 查询不到）。"""
    response = await client.post(
        "/api/v1/external/images/generations",
        json={"provider": "nonexistent-provider", "prompt": "test"},
        headers=external_auth_headers,
    )
    assert response.status_code == 503
    data = response.json()
    assert "message" in data
    assert "未配置" in data["message"]
    assert data["error_code"] == "AI_PROVIDER_CONFIG_ERROR"


@pytest.mark.asyncio
async def test_external_images_provider_missing_required_config(
    client: AsyncClient,
    external_auth_headers: dict,
    db_session: AsyncSession,
):
    """Provider 存在但缺少 base_url/model 等必要配置时，应返回本地配置错误且不调用上游。"""
    db_session.add(AiProvider(
        id=uuid.uuid4(),
        slug="volcano",
        name="火山方舟",
        provider_type="volcano",
        config={"api_key": "test_key"},
        is_active=True,
        sort_order=1,
    ))
    await db_session.commit()

    response = await client.post(
        "/api/v1/external/images/generations",
        json={"provider": "volcano", "prompt": "test"},
        headers=external_auth_headers,
    )

    assert response.status_code == 503
    data = response.json()
    assert data["error_code"] == "AI_PROVIDER_CONFIG_ERROR"
    assert "缺少必要配置" in data["message"]
    assert "base_url" in data["message"]
    assert "image_model" in data["message"]


# ==================== 对话补全 ====================


@pytest.mark.asyncio
async def test_external_chat_completions(
    client: AsyncClient,
    external_auth_headers: dict,
):
    """对话补全请求，无 Provider 配置 → 503。"""
    response = await client.post(
        "/api/v1/external/chat/completions",
        json={
            "provider": "deepseek",
            "messages": [
                {"role": "system", "content": "你是一个助手"},
                {"role": "user", "content": "你好"},
            ],
            "temperature": 0.7,
            "max_tokens": 256,
        },
        headers=external_auth_headers,
    )
    assert response.status_code == 503
    data = response.json()
    assert "message" in data
    assert data["error_code"] == "AI_PROVIDER_CONFIG_ERROR"


@pytest.mark.asyncio
async def test_external_chat_unsupported_provider(
    client: AsyncClient,
    external_auth_headers: dict,
):
    """不存在的 provider slug → 503（DB 查询不到）。"""
    response = await client.post(
        "/api/v1/external/chat/completions",
        json={
            "provider": "gpt",
            "messages": [{"role": "user", "content": "Hello"}],
        },
        headers=external_auth_headers,
    )
    assert response.status_code == 503
    data = response.json()
    assert "message" in data
    assert data["error_code"] == "AI_PROVIDER_CONFIG_ERROR"


# ==================== 语音合成 ====================


@pytest.mark.asyncio
async def test_external_audio_speech(
    client: AsyncClient,
    external_auth_headers: dict,
):
    """语音合成请求，无 Provider 配置 → 503。"""
    response = await client.post(
        "/api/v1/external/audio/speech",
        json={
            "provider": "zhipu",
            "input": "你好，欢迎使用语音合成服务",
            "voice": "zh_female_warm",
            "response_format": "mp3",
        },
        headers=external_auth_headers,
    )
    assert response.status_code == 503
    data = response.json()
    assert "message" in data
    assert data["error_code"] == "AI_PROVIDER_CONFIG_ERROR"


@pytest.mark.asyncio
async def test_external_audio_unsupported_provider(
    client: AsyncClient,
    external_auth_headers: dict,
):
    """不存在的 provider slug → 503（DB 查询不到）。"""
    response = await client.post(
        "/api/v1/external/audio/speech",
        json={
            "provider": "unknown-tts",
            "input": "test",
            "voice": "default",
        },
        headers=external_auth_headers,
    )
    assert response.status_code == 503
    data = response.json()
    assert "message" in data
    assert data["error_code"] == "AI_PROVIDER_CONFIG_ERROR"


# ==================== 视频生成 ====================


@pytest.mark.asyncio
async def test_external_video_generations(
    client: AsyncClient,
    external_auth_headers: dict,
):
    """视频生成请求，无 Provider 配置 → 503。"""
    response = await client.post(
        "/api/v1/external/video/generations",
        json={
            "provider": "volcano",
            "prompt": "一只奔跑的马",
            "duration": 5,
        },
        headers=external_auth_headers,
    )
    assert response.status_code == 503
    data = response.json()
    assert "message" in data
    assert data["error_code"] == "AI_PROVIDER_CONFIG_ERROR"


@pytest.mark.asyncio
async def test_external_video_unsupported_provider(
    client: AsyncClient,
    external_auth_headers: dict,
):
    """不存在的 provider slug → 503（DB 查询不到）。"""
    response = await client.post(
        "/api/v1/external/video/generations",
        json={
            "provider": "unknown-video-provider",
            "prompt": "test",
        },
        headers=external_auth_headers,
    )
    assert response.status_code == 503
    data = response.json()
    assert "message" in data
    assert data["error_code"] == "AI_PROVIDER_CONFIG_ERROR"


# ==================== 文件服务 ====================


@pytest.mark.asyncio
async def test_external_file_not_found(
    client: AsyncClient,
    external_auth_headers: dict,
):
    """访问不存在的文件 → 404。"""
    fake_id = uuid.uuid4()
    response = await client.get(
        f"/api/v1/external/files/{fake_id}",
        headers=external_auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_external_file_invalid_uuid(
    client: AsyncClient,
    external_auth_headers: dict,
):
    """无效的 UUID 格式 → 404。"""
    response = await client.get(
        "/api/v1/external/files/not-a-uuid",
        headers=external_auth_headers,
    )
    assert response.status_code == 404
