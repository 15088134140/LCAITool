"""
火山方舟-豆包 AI 提供商
支持文本生成、语音合成
"""
import httpx
from typing import Optional, Dict, Any
import json

from .base import BaseAIProvider, AIResponse


class DoubaoProvider(BaseAIProvider):
    """火山方舟-豆包 AI 提供商"""

    def __init__(self, **config):
        super().__init__(**config)
        self.api_base = self.api_base or "https://ark.cn-beijing.volces.com/api/v3"
        self.model = self.model or "doubao-pro-32k"
        self.audio_model = config.get("audio_model", "doubao-tts")

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """
        调用豆包大模型生成文本
        """
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
            "stream": False
        }

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
        豆包暂不支持图片生成，返回 NotImplemented
        """
        return AIResponse(
            success=False,
            content="",
            raw_response={},
            error="Image generation not implemented for Doubao provider"
        )

    async def generate_audio(
        self,
        text: str,
        voice: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """
        调用豆包语音合成接口
        """
        url = f"{self.api_base}/audio/speech"

        payload = {
            "model": kwargs.get("audio_model", self.audio_model),
            "input": text,
            "voice": voice or "zh_female_qingxin",
            "response_format": kwargs.get("response_format", "mp3"),
            "speed": kwargs.get("speed", 1.0)
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()

                # 返回音频二进制数据的base64或URL
                audio_data = response.content
                import base64
                audio_base64 = base64.b64encode(audio_data).decode('utf-8')

                return AIResponse(
                    success=True,
                    content=audio_base64,
                    raw_response={
                        "content_type": response.headers.get("content-type", ""),
                        "size": len(audio_data)
                    },
                    usage={"characters": len(text)}
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

    async def generate_video(
        self,
        prompt: str,
        duration: Optional[int] = None,
        **kwargs
    ) -> AIResponse:
        """
        豆包暂不支持视频生成，返回 NotImplemented
        """
        return AIResponse(
            success=False,
            content="",
            raw_response={},
            error="Video generation not implemented for Doubao provider"
        )
