"""
外部 OpenAI 兼容 API
通过 API Key 认证（非 JWT），对外提供 OpenAI 兼容的 AI 能力接口。
支持：图片生成、语音合成、对话补全、视频生成。
"""
import base64
import json
import os
import time
import uuid
from typing import Any, Dict, List, Optional

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.v1.middleware.api_key_auth import verify_api_key
from app.core.config import settings
from app.models.api_key import ApiKey
from app.models.external_file import ExternalFile
from app.providers.ai import AIProviderFactory

router = APIRouter(dependencies=[Depends(verify_api_key)])

# ========== Model Routing Tables ==========
# Maps OpenAI-compatible model names to internal provider slugs

IMAGE_MODEL_MAP: Dict[str, str] = {
    "doubao-seedream-4.5": "doubao",
    "cogview-3": "zhipu",
}

AUDIO_MODEL_MAP: Dict[str, str] = {
    "glm-tts": "zhipu",
    "doubao-tts-2.0": "doubao",
}

CHAT_MODEL_MAP: Dict[str, str] = {
    "deepseek-v4-pro": "deepseek",
    "deepseek-v4-flash": "deepseek",
    "glm-4-flash": "zhipu",
}

VIDEO_MODEL_MAP: Dict[str, str] = {
    "doubao-seedance-2.0": "doubao",
}

# ========== MIME Type Mapping ==========

EXTENSION_MIME_MAP: Dict[str, str] = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
}


def _get_mime_type(ext: str) -> str:
    """Get MIME type from file extension, default to octet-stream."""
    return EXTENSION_MIME_MAP.get(ext, "application/octet-stream")


# ========== Pydantic Schemas ==========


class ImageGenerationRequest(BaseModel):
    """OpenAI /images/generations 兼容请求体"""
    model: str
    prompt: str
    n: int = 1
    size: str = "1024x1024"


class AudioSpeechRequest(BaseModel):
    """OpenAI /audio/speech 兼容请求体"""
    model: str
    input: str
    voice: str = "zh_female_warm"
    response_format: str = "mp3"


class ChatMessage(BaseModel):
    """对话消息"""
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    """OpenAI /chat/completions 兼容请求体"""
    model: str
    messages: List[ChatMessage]
    temperature: float = 0.7
    max_tokens: int = 2048


class VideoGenerationRequest(BaseModel):
    """视频生成请求体（OpenAI 兼容扩展）"""
    model: str
    prompt: str
    duration: Optional[int] = None


# ========== File Save Helper ==========


async def save_external_file(
    db: AsyncSession,
    user_id: uuid.UUID,
    file_data: bytes,
    file_ext: str,
    mime_type: str,
    api_endpoint: str,
) -> str:
    """将文件保存到外部存储目录并创建 ExternalFile 记录。

    Args:
        db: 数据库会话
        user_id: 所属用户 ID
        file_data: 文件二进制数据
        file_ext: 文件扩展名（如 "png", "mp3"）
        mime_type: MIME 类型
        api_endpoint: 来源端点标识（如 "images/generations"）

    Returns:
        文件记录的 UUID 字符串
    """
    file_id = str(uuid.uuid4())
    file_name = f"{file_id}.{file_ext}"

    user_dir = os.path.join(settings.EXTERNAL_STORAGE_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)

    file_path = os.path.join(user_dir, file_name)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(file_data)

    ext_file = ExternalFile(
        id=uuid.UUID(file_id),
        user_id=user_id,
        file_name=file_name,
        file_path=file_path,
        file_size=len(file_data),
        mime_type=mime_type,
        api_endpoint=api_endpoint,
    )
    db.add(ext_file)
    await db.commit()
    await db.refresh(ext_file)

    return str(ext_file.id)


def _build_file_url(request: Request, file_id: str) -> str:
    """构建外部文件的完整下载 URL。"""
    base = str(request.base_url).rstrip("/")
    return f"{base}{settings.API_V1_STR}/external/files/{file_id}"


# ========== Endpoints ==========


@router.post("/images/generations", summary="图片生成（OpenAI 兼容）")
async def images_generations(
    body: ImageGenerationRequest,
    request: Request,
    api_key: ApiKey = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """OpenAI 兼容的图片生成接口。

    根据 model 名称路由到对应的 AI 提供商，生成图片后保存到本地存储，
    返回可访问的文件 URL。
    """
    provider_slug = IMAGE_MODEL_MAP.get(body.model)
    if not provider_slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image model: {body.model}",
        )

    try:
        provider = await AIProviderFactory.get_provider_from_db(db, provider_slug)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    ai_resp = await provider.generate_image(
        prompt=body.prompt,
        size=body.size,
        n=body.n,
        model=body.model,
    )
    if not ai_resp.success:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=ai_resp.error)

    # 提供商标 content 返回 base64 编码的图片数据
    image_bytes = base64.b64decode(ai_resp.content)

    file_id = await save_external_file(
        db=db,
        user_id=api_key.user_id,
        file_data=image_bytes,
        file_ext="png",
        mime_type="image/png",
        api_endpoint="images/generations",
    )

    file_url = _build_file_url(request, file_id)

    return {
        "created": int(time.time()),
        "data": [{"url": file_url}],
    }


@router.post("/audio/speech", summary="语音合成（OpenAI 兼容）")
async def audio_speech(
    body: AudioSpeechRequest,
    request: Request,
    api_key: ApiKey = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """OpenAI 兼容的语音合成接口。

    根据 model 名称路由到对应的 AI 提供商，生成语音后保存到本地存储，
    返回可访问的文件 URL。
    """
    provider_slug = AUDIO_MODEL_MAP.get(body.model)
    if not provider_slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio model: {body.model}",
        )

    try:
        provider = await AIProviderFactory.get_provider_from_db(db, provider_slug)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    ai_resp = await provider.generate_audio(
        text=body.input,
        voice=body.voice,
        response_format=body.response_format,
    )
    if not ai_resp.success:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=ai_resp.error)

    audio_bytes = base64.b64decode(ai_resp.content)

    file_ext = body.response_format or "mp3"
    mime_type = _get_mime_type(f".{file_ext}")
    file_id = await save_external_file(
        db=db,
        user_id=api_key.user_id,
        file_data=audio_bytes,
        file_ext=file_ext,
        mime_type=mime_type,
        api_endpoint="audio/speech",
    )

    file_url = _build_file_url(request, file_id)

    return {"url": file_url}


@router.post("/chat/completions", summary="对话补全（OpenAI 兼容）")
async def chat_completions(
    body: ChatCompletionRequest,
    request: Request,
    api_key: ApiKey = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """OpenAI 兼容的对话补全接口。

    根据 model 名称路由到对应的 AI 提供商，返回标准的 OpenAI 聊天补全响应格式。
    从 messages 列表中提取 system 和 user 角色的内容传递给提供商。
    """
    provider_slug = CHAT_MODEL_MAP.get(body.model)
    if not provider_slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported chat model: {body.model}",
        )

    try:
        provider = await AIProviderFactory.get_provider_from_db(db, provider_slug)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    # 从消息列表中提取 system_prompt 和 user prompt
    system_prompt: Optional[str] = None
    user_prompt = ""
    for msg in body.messages:
        if msg.role == "system":
            system_prompt = msg.content
        elif msg.role == "user":
            user_prompt = msg.content

    ai_resp = await provider.generate_text(
        prompt=user_prompt,
        system_prompt=system_prompt,
        temperature=body.temperature,
        max_tokens=body.max_tokens,
        model=body.model,
    )
    if not ai_resp.success:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=ai_resp.error)

    usage = ai_resp.usage or {}

    return {
        "id": f"chatcmpl-{uuid.uuid4().hex}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": body.model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": ai_resp.content},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
        },
    }


@router.post("/video/generations", summary="视频生成（OpenAI 兼容扩展）")
async def video_generations(
    body: VideoGenerationRequest,
    request: Request,
    api_key: ApiKey = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """OpenAI 兼容扩展的视频生成接口。

    根据 model 名称路由到对应的 AI 提供商，生成视频后保存到本地存储，
    返回可访问的文件 URL。
    """
    provider_slug = VIDEO_MODEL_MAP.get(body.model)
    if not provider_slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported video model: {body.model}",
        )

    try:
        provider = await AIProviderFactory.get_provider_from_db(db, provider_slug)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    ai_resp = await provider.generate_video(
        prompt=body.prompt,
        duration=body.duration,
    )
    if not ai_resp.success:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=ai_resp.error)

    video_bytes = base64.b64decode(ai_resp.content)

    file_id = await save_external_file(
        db=db,
        user_id=api_key.user_id,
        file_data=video_bytes,
        file_ext="mp4",
        mime_type="video/mp4",
        api_endpoint="video/generations",
    )

    file_url = _build_file_url(request, file_id)

    return {
        "created": int(time.time()),
        "data": [{"url": file_url}],
    }
