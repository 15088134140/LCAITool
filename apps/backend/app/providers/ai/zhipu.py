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

    SUPPORTED_VOICES = [
        "tongtong", "chuichui", "xiaochen",
        "jam", "kazi", "douji", "luodo",
    ]
    SUPPORTED_RESPONSE_FORMATS = ["wav", "pcm"]
    # 智谱图片总像素上限: 2^21 = 2,097,152
    MAX_IMAGE_PIXELS = 2 ** 21

    def __init__(self, **config):
        super().__init__(**config)

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """
        调用智谱 GLM 大模型生成文本
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

        payload = {
            "model": self.text_model,
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
        调用智谱 CogView 生成图片（OpenAI 兼容接口）
        端点: POST /v4/images/generations
        注意：图片总像素上限为 2^21 (2,097,152)，超出将返回错误
        """
        # 校验图片尺寸（像素上限 2^21）
        if size is not None:
            parts = size.split("x")
            if len(parts) != 2:
                return AIResponse(
                    success=False, content="", raw_response={},
                    error=f"图片尺寸格式错误 '{size}'，请使用 WxH 格式（如 1024x1024）"
                )
            try:
                w, h = int(parts[0]), int(parts[1])
                if w * h > self.MAX_IMAGE_PIXELS:
                    return AIResponse(
                        success=False, content="", raw_response={},
                        error=f"图片尺寸 '{size}' 总像素 {w*h} 超出上限 {self.MAX_IMAGE_PIXELS}，"
                              f"智谱支持最大 2048x1024 或 1024x2048"
                    )
            except ValueError:
                return AIResponse(
                    success=False, content="", raw_response={},
                    error=f"图片尺寸格式错误 '{size}'，宽高必须为数字"
                )

        if not self.image_model:
            return AIResponse(
                success=False, content="", raw_response={},
                error=f"provider '{self.slug}' 未配置 image_model"
            )

        url = f"{self.base_url}/images/generations"

        payload = {
            "model": self.image_model,
            "prompt": prompt,
            "size": size or "1024x1024",
            "n": kwargs.get("n", 1)
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        try:
            # 调用智谱 CogView API
            async with httpx.AsyncClient(timeout=self.image_timeout) as client:
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

            image_data = result["data"][0]

            # 优先使用 b64_json 直接返回
            if "b64_json" in image_data:
                return AIResponse(
                    success=True,
                    content=image_data["b64_json"],
                    raw_response=result,
                    usage={"images": 1}
                )

            # 否则通过 URL 下载后 base64 编码
            image_url = image_data.get("url", "")
            if not image_url:
                return AIResponse(
                    success=False,
                    content="",
                    raw_response=result,
                    error="No image URL or b64_json in CogView response"
                )

            async with httpx.AsyncClient(timeout=self.image_timeout) as client:
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
        支持音色: tongtong(彤彤), chuichui(锤锤), xiaochen(小陈), jam/kazi/douji/luodo
        支持格式: wav, pcm
        """
        # 校验音色
        if voice is not None and voice not in self.SUPPORTED_VOICES:
            return AIResponse(
                success=False,
                content="",
                raw_response={},
                error=f"不支持的音色 '{voice}'，智谱支持: {', '.join(self.SUPPORTED_VOICES)}"
            )

        # 校验响应格式
        response_format = kwargs.get("response_format")
        if response_format is not None and response_format not in self.SUPPORTED_RESPONSE_FORMATS:
            return AIResponse(
                success=False,
                content="",
                raw_response={},
                error=f"不支持的音频格式 '{response_format}'，智谱支持: {', '.join(self.SUPPORTED_RESPONSE_FORMATS)}"
            )

        if not self.audio_model:
            return AIResponse(
                success=False, content="", raw_response={},
                error=f"provider '{self.slug}' 未配置 audio_model"
            )

        url = f"{self.base_url}/audio/speech"

        payload = {
            "model": self.audio_model,
            "input": text,
            "voice": voice or "tongtong",
            "response_format": response_format or "wav"
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

    async def clone_voice(
        self,
        audio_data: bytes,
        voice_name: str = "cloned_voice",
        **kwargs
    ) -> AIResponse:
        """
        智谱暂不支持声音复刻
        """
        return AIResponse(
            success=False,
            content="",
            raw_response={},
            error="Voice cloning not implemented for Zhipu provider"
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
