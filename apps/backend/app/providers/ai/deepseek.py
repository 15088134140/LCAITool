"""
DeepSeek AI 提供商
支持文本生成（含思考模式）、暂不支持图片/语音/视频生成
"""
import httpx
from typing import Optional, Dict, Any

from .base import BaseAIProvider, AIResponse


class DeepSeekProvider(BaseAIProvider):
    """DeepSeek AI 提供商"""

    def __init__(self, **config):
        super().__init__(**config)

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """
        调用 DeepSeek 大模型生成文本
        支持 thinking 模式：设置 thinking=True 启用深度思考
        """
        if not self.text_model:
            return AIResponse(
                success=False, content="", raw_response={},
                error=f"provider '{self.slug}' 未配置 text_model"
            )

        url = f"{self.base_url}/chat/completions"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        # 思考模式：thinking=True 时启用 extra_body 中的 thinking 配置（不再切换 model）
        thinking = kwargs.pop("thinking", False)
        extra_body = {"thinking": {"type": "enabled"}} if thinking else None

        payload = {
            "model": self.text_model,
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 2048),
            "stream": False
        }

        if extra_body:
            payload["extra_body"] = extra_body

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                result = response.json()

            if result.get("choices") and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]
                usage = result.get("usage", {})
                return AIResponse(
                    success=True,
                    content=content,
                    raw_response=result,
                    usage=usage
                )
            else:
                return AIResponse(
                    success=False,
                    content="",
                    raw_response=result,
                    error="No response choices found"
                )

        except httpx.TimeoutException:
            return AIResponse(
                success=False,
                content="",
                raw_response={},
                error="API request timeout"
            )
        except httpx.HTTPStatusError as e:
            error_msg = f"HTTP Error {e.response.status_code}: {e.response.text}"
            return AIResponse(
                success=False,
                content="",
                raw_response={"status_code": e.response.status_code, "text": e.response.text},
                error=error_msg
            )
        except Exception as e:
            return AIResponse(
                success=False,
                content="",
                raw_response={},
                error=f"Unexpected error: {str(e)}"
            )

    async def generate_image(
        self,
        prompt: str,
        size: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """
        DeepSeek 暂不支持图片生成
        """
        return AIResponse(
            success=False,
            content="",
            raw_response={},
            error="Image generation not implemented for DeepSeek provider"
        )

    async def generate_audio(
        self,
        text: str,
        voice: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """
        DeepSeek 暂不支持语音生成
        """
        return AIResponse(
            success=False,
            content="",
            raw_response={},
            error="Audio generation not implemented for DeepSeek provider"
        )

    async def generate_video(
        self,
        prompt: str,
        duration: Optional[int] = None,
        **kwargs
    ) -> AIResponse:
        """
        DeepSeek 暂不支持视频生成
        """
        return AIResponse(
            success=False,
            content="",
            raw_response={},
            error="Video generation not implemented for DeepSeek provider"
        )

    async def clone_voice(
        self,
        audio_data: bytes,
        voice_name: str = "cloned_voice",
        **kwargs
    ) -> AIResponse:
        """
        DeepSeek 暂不支持声音复刻
        """
        return AIResponse(
            success=False,
            content="",
            raw_response={},
            error="Voice cloning not implemented for DeepSeek provider"
        )
