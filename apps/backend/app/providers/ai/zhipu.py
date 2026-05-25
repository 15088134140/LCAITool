"""
智谱 AI 提供商
支持文本生成 (GLM-4)、图片生成 (CogView-3)、语音合成 (GLM-TTS)
"""
import base64
import httpx
from typing import Optional, Dict, Any

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
        """
        调用智谱 GLM 大模型生成文本
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
        调用智谱 CogView-3 生成图片
        调用 CogView API 获取图片 URL，然后下载并 base64 编码
        """
        url = f"{self.api_base}/cogview/v3"

        payload = {
            "model": kwargs.get("model", "cogview-3"),
            "prompt": prompt
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        try:
            # 第一步：调用 CogView API 获取图片 URL
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                result = response.json()

            if not result.get("data") or len(result["data"]) == 0:
                return AIResponse(
                    success=False,
                    content="",
                    raw_response=result,
                    error="No image data in CogView response"
                )

            image_url = result["data"][0].get("url", "")
            if not image_url:
                return AIResponse(
                    success=False,
                    content="",
                    raw_response=result,
                    error="No image URL in CogView response"
                )

            # 第二步：下载图片并 base64 编码
            async with httpx.AsyncClient(timeout=120) as client:
                img_response = await client.get(image_url)
                img_response.raise_for_status()
                img_bytes = img_response.content

            img_base64 = base64.b64encode(img_bytes).decode("utf-8")

            return AIResponse(
                success=True,
                content=img_base64,
                raw_response={
                    "image_url": image_url,
                    "content_type": img_response.headers.get("content-type", ""),
                    "size": len(img_bytes)
                },
                usage={"images": 1}
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

    async def generate_audio(
        self,
        text: str,
        voice: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """
        调用智谱 GLM-TTS 生成语音
        """
        url = f"{self.api_base}/audio/speech"

        payload = {
            "model": kwargs.get("model", "glm-tts"),
            "input": text,
            "voice": voice or "zh_female_warm",
            "response_format": kwargs.get("response_format", "mp3")
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()

                audio_bytes = response.content
                audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

                return AIResponse(
                    success=True,
                    content=audio_base64,
                    raw_response={
                        "content_type": response.headers.get("content-type", ""),
                        "size": len(audio_bytes)
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
        智谱暂不支持视频生成
        """
        return AIResponse(
            success=False,
            content="",
            raw_response={},
            error="Video generation not implemented for Zhipu provider"
        )
