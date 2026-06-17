"""
外部 API — 直连 AI 提供商
通过 API Key 认证（非 JWT），直接传入 provider slug 调用 AI 能力。
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
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.v1.middleware.api_key_auth import verify_api_key
from app.core.config import settings
from app.models.api_key import ApiKey
from app.models.external_file import ExternalFile
from app.providers.ai import AIProviderFactory

router = APIRouter(dependencies=[Depends(verify_api_key)])

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


async def _resolve_provider(db: AsyncSession, provider_slug: str):
    """根据 provider slug 获取 AI 提供商实例。"""
    from app.core.exceptions import ConfigurationError
    try:
        return await AIProviderFactory.get_provider_from_db(db, provider_slug)
    except (ValueError, ConfigurationError) as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))


# ========== Pydantic Schemas ==========


class ImageGenerationRequest(BaseModel):
    """图片生成请求"""
    provider: str = Field(examples=["volcano"])
    prompt: str = Field(examples=["一只可爱的橘猫坐在窗边，阳光洒在它的身上，温馨治愈的插画风格，色彩柔和"])
    n: int = Field(default=1, examples=[1])
    size: Optional[str] = Field(
        default=None,
        examples=["1920x1920", "1440x2560", "1024x1024"],
        description="图片尺寸（WxH 格式）。不传则使用提供商默认尺寸。"
                    "豆包支持: 1024x1024,1920x1920,1440x2560,2560x1440；"
                    "智谱总像素上限 2^21 (最大 2048x1024)",
    )


class AudioSpeechRequest(BaseModel):
    """语音合成请求"""
    provider: str = Field(examples=["zhipu"])
    input: str = Field(examples=["你好，欢迎使用灵创AI工具箱。今天我们为你准备了一个关于星空探险的故事，让我们一起出发吧！"])
    voice: Optional[str] = Field(
        default=None,
        examples=["tongtong", "zh_female_warm"],
        description="音色名称。不传则使用提供商默认音色。各提供商音色不同："
                    "智谱=tongtong(彤彤)|chuichui(锤锤)|xiaochen(小陈)|jam|kazi|douji|luodo。"
                    "注意：火山方舟(volcano) Ark API 不支持 TTS，请使用智谱(zhipu)",
    )
    response_format: Optional[str] = Field(
        default=None,
        examples=["wav", "mp3"],
        description="音频格式。不传则使用提供商默认（智谱默认wav）。"
                    "智谱支持: wav,pcm。"
                    "注意：火山方舟(volcano) Ark API 不支持 TTS，请使用智谱(zhipu)",
    )


class ChatMessage(BaseModel):
    """对话消息"""
    role: str = Field(examples=["user", "system"])
    content: str = Field(examples=["用简单的语言解释什么是人工智能"])


class ChatCompletionRequest(BaseModel):
    """对话补全请求"""
    provider: str = Field(examples=["deepseek"])
    messages: List[ChatMessage] = Field(examples=[
        [
            {"role": "system", "content": "你是一个专业的AI助手，请用简洁的语言回答用户问题。"},
            {"role": "user", "content": "用简单的语言解释什么是人工智能"},
        ]
    ])
    temperature: float = Field(default=0.7, examples=[0.7])
    max_tokens: int = Field(default=2048, examples=[2048])


class VideoGenerationRequest(BaseModel):
    """视频生成请求"""
    provider: str = Field(examples=["volcano"])
    prompt: str = Field(examples=["一只蝴蝶在花丛中翩翩起舞，夕阳西下，金色的光芒洒在花瓣上，画面唯美梦幻"])
    duration: Optional[int] = Field(default=None, examples=[5])


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
    """构建外部文件的完整下载 URL（含 api_key 查询参数，支持 <img> 等嵌入场景）。"""
    base = str(request.base_url).rstrip("/")
    # 从当前请求的 Authorization header 提取 api_key
    auth = request.headers.get("Authorization", "")
    api_key_str = auth[7:] if auth.startswith("Bearer ") else ""
    url = f"{base}{settings.API_V1_STR}/external/files/{file_id}"
    if api_key_str:
        url += f"?api_key={api_key_str}"
    return url


# ========== Endpoints ==========


@router.post("/images/generations", summary="图片生成")
async def images_generations(
    body: ImageGenerationRequest,
    request: Request,
    api_key: ApiKey = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """调用指定 AI 提供商生成图片，保存到本地存储，返回文件 URL。

    size 为可选参数，不传则使用提供商默认尺寸。
    传入不支持的尺寸将返回错误信息（智谱总像素上限 2^21）。
    """
    provider = await _resolve_provider(db, body.provider)

    # 提前提交，避免 AI 长耗时期间 DB 事务挂起
    await db.commit()

    ai_resp = await provider.generate_image(
        prompt=body.prompt,
        size=body.size,
        n=body.n,
    )
    if not ai_resp.success:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=ai_resp.error)

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


@router.post("/audio/speech", summary="语音合成")
async def audio_speech(
    body: AudioSpeechRequest,
    request: Request,
    api_key: ApiKey = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """调用指定 AI 提供商合成语音，保存到本地存储，返回文件 URL。

    voice 和 response_format 为可选参数。
    不传则使用提供商默认值；传入不支持的音色或格式将返回错误信息。
    """
    provider = await _resolve_provider(db, body.provider)

    # 提前提交，避免 AI 长耗时期间 DB 事务挂起
    await db.commit()

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


@router.post("/chat/completions", summary="对话补全")
async def chat_completions(
    body: ChatCompletionRequest,
    request: Request,
    api_key: ApiKey = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """调用指定 AI 提供商进行对话补全，返回标准响应格式。

    从 messages 列表中提取 system 和 user 角色的内容传递给提供商。
    """
    provider = await _resolve_provider(db, body.provider)

    # 从消息列表中提取 system_prompt 和 user prompt
    system_prompt: Optional[str] = None
    user_prompt = ""
    for msg in body.messages:
        if msg.role == "system":
            system_prompt = msg.content
        elif msg.role == "user":
            user_prompt = msg.content

    # 提前提交，避免 AI 长耗时期间 DB 事务挂起
    await db.commit()

    ai_resp = await provider.generate_text(
        prompt=user_prompt,
        system_prompt=system_prompt,
        temperature=body.temperature,
        max_tokens=body.max_tokens,
    )
    if not ai_resp.success:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=ai_resp.error)

    usage = ai_resp.usage or {}

    return {
        "id": f"chatcmpl-{uuid.uuid4().hex}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": body.provider,
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


@router.post("/video/generations", summary="视频生成")
async def video_generations(
    body: VideoGenerationRequest,
    request: Request,
    api_key: ApiKey = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """调用指定 AI 提供商生成视频，保存到本地存储，返回文件 URL。"""
    provider = await _resolve_provider(db, body.provider)

    # 提前提交，避免 AI 长耗时期间 DB 事务挂起
    await db.commit()

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
