"""外部 OpenAI 兼容 API + 文件服务 集成测试"""
import hashlib
import secrets
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_key import ApiKey
from app.models.external_file import ExternalFile
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
        json={"model": "doubao-seedream-4.5", "prompt": "test"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_external_api_invalid_key(client: AsyncClient):
    """无效 API Key 请求应返回 401。"""
    response = await client.post(
        "/api/v1/external/images/generations",
        json={"model": "doubao-seedream-4.5", "prompt": "test"},
        headers={"Authorization": "Bearer lcai_invalidkey1234567890"},
    )
    assert response.status_code == 401


# ==================== 图片生成 ====================


@pytest.mark.asyncio
async def test_external_images_generations(
    client: AsyncClient,
    external_auth_headers: dict,
):
    """图片生成请求，无 Provider 配置 → 502。"""
    response = await client.post(
        "/api/v1/external/images/generations",
        json={"model": "doubao-seedream-4.5", "prompt": "一只可爱的小猫"},
        headers=external_auth_headers,
    )
    assert response.status_code == 502
    data = response.json()
    # 项目使用自定义错误格式：{"code": 502, "message": "...", ...}
    assert "message" in data
    assert "detail" not in data


@pytest.mark.asyncio
async def test_external_images_unsupported_model(
    client: AsyncClient,
    external_auth_headers: dict,
):
    """不支持的图片模型 → 400。"""
    response = await client.post(
        "/api/v1/external/images/generations",
        json={"model": "nonexistent-model-v9", "prompt": "test"},
        headers=external_auth_headers,
    )
    assert response.status_code == 400
    data = response.json()
    assert "message" in data
    assert "Unsupported" in data["message"]


# ==================== 对话补全 ====================


@pytest.mark.asyncio
async def test_external_chat_completions(
    client: AsyncClient,
    external_auth_headers: dict,
):
    """对话补全请求，无 Provider 配置 → 502。"""
    response = await client.post(
        "/api/v1/external/chat/completions",
        json={
            "model": "deepseek-v4-flash",
            "messages": [
                {"role": "system", "content": "你是一个助手"},
                {"role": "user", "content": "你好"},
            ],
            "temperature": 0.7,
            "max_tokens": 256,
        },
        headers=external_auth_headers,
    )
    assert response.status_code == 502
    data = response.json()
    assert "message" in data


@pytest.mark.asyncio
async def test_external_chat_unsupported_model(
    client: AsyncClient,
    external_auth_headers: dict,
):
    """不支持的对话模型 → 400。"""
    response = await client.post(
        "/api/v1/external/chat/completions",
        json={
            "model": "gpt-5",
            "messages": [{"role": "user", "content": "Hello"}],
        },
        headers=external_auth_headers,
    )
    assert response.status_code == 400
    data = response.json()
    assert "Unsupported" in data["message"]


# ==================== 语音合成 ====================


@pytest.mark.asyncio
async def test_external_audio_speech(
    client: AsyncClient,
    external_auth_headers: dict,
):
    """语音合成请求，无 Provider 配置 → 502。"""
    response = await client.post(
        "/api/v1/external/audio/speech",
        json={
            "model": "glm-tts",
            "input": "你好，欢迎使用语音合成服务",
            "voice": "zh_female_warm",
            "response_format": "mp3",
        },
        headers=external_auth_headers,
    )
    assert response.status_code == 502
    data = response.json()
    assert "message" in data


@pytest.mark.asyncio
async def test_external_audio_unsupported_model(
    client: AsyncClient,
    external_auth_headers: dict,
):
    """不支持的语音模型 → 400。"""
    response = await client.post(
        "/api/v1/external/audio/speech",
        json={
            "model": "unknown-tts",
            "input": "test",
            "voice": "default",
        },
        headers=external_auth_headers,
    )
    assert response.status_code == 400
    data = response.json()
    assert "Unsupported" in data["message"]


# ==================== 视频生成 ====================


@pytest.mark.asyncio
async def test_external_video_generations(
    client: AsyncClient,
    external_auth_headers: dict,
):
    """视频生成请求，无 Provider 配置 → 502。"""
    response = await client.post(
        "/api/v1/external/video/generations",
        json={
            "model": "doubao-seedance-2.0",
            "prompt": "一只奔跑的马",
            "duration": 5,
        },
        headers=external_auth_headers,
    )
    assert response.status_code == 502
    data = response.json()
    assert "message" in data


@pytest.mark.asyncio
async def test_external_video_unsupported_model(
    client: AsyncClient,
    external_auth_headers: dict,
):
    """不支持的视频模型 → 400。"""
    response = await client.post(
        "/api/v1/external/video/generations",
        json={
            "model": "unknown-video-model",
            "prompt": "test",
        },
        headers=external_auth_headers,
    )
    assert response.status_code == 400
    data = response.json()
    assert "Unsupported" in data["message"]


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


@pytest.mark.asyncio
async def test_external_file_access_denied(
    client: AsyncClient,
    db_session: AsyncSession,
    external_auth_headers: dict,
    verified_user_id: uuid.UUID,
    other_user_id: uuid.UUID,
):
    """文件属于其他用户，API Key 无权访问 → 403。"""
    # 创建一个属于 other_user 的文件
    file_id = uuid.uuid4()
    ext_file = ExternalFile(
        id=file_id,
        user_id=other_user_id,
        file_name="test.txt",
        file_path="/tmp/test_external_access_denied.txt",
        file_size=10,
        mime_type="text/plain",
        api_endpoint="images/generations",
    )
    db_session.add(ext_file)
    await db_session.commit()

    # 用 verified_user_id 的 API Key 访问 other_user 的文件
    response = await client.get(
        f"/api/v1/external/files/{file_id}",
        headers=external_auth_headers,
    )
    assert response.status_code == 403
