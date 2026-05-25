"""
火山方舟-豆包 AI 提供商
支持文本生成、语音合成、图片生成(Seedream 4.5)、视频生成(Seedance 2.0)、声音复刻
"""
import asyncio
import base64
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
        调用豆包 Seedream 4.5 生成图片
        支持 b64_json 直接返回或 URL 下载后 base64 编码
        """
        url = f"{self.api_base}/images/generations"

        payload = {
            "model": kwargs.get("model", "doubao-seedream-4.5"),
            "prompt": prompt,
            "size": size or kwargs.get("size", "1024x1024"),
            "n": kwargs.get("n", 1)
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                result = response.json()

            if not result.get("data") or len(result["data"]) == 0:
                return AIResponse(
                    success=False,
                    content="",
                    raw_response=result,
                    error="No image data in Seedream response"
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
                    error="No image URL or b64_json in Seedream response"
                )

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
        调用豆包 Seedance 2.0 生成视频（异步任务轮询模式）
        提交任务后轮询状态，成功则下载视频并 base64 编码
        """
        url = f"{self.api_base}/video/generations"

        payload = {
            "model": kwargs.get("model", "doubao-seedance-2.0"),
            "prompt": prompt,
        }
        if duration:
            payload["duration"] = duration

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        try:
            # 第一步：提交视频生成任务
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
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

            # 第二步：轮询任务状态
            poll_url = f"{url}/{task_id}"
            max_polls = kwargs.get("max_polls", 60)
            poll_interval = kwargs.get("poll_interval", 5)

            for _ in range(max_polls):
                await asyncio.sleep(poll_interval)

                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    poll_response = await client.get(poll_url, headers=headers)
                    poll_response.raise_for_status()
                    poll_result = poll_response.json()

                task_info = poll_result.get("task", {})
                status = task_info.get("status", "")

                if status == "succeeded":
                    video_url = task_info.get("output", {}).get("video_url", "")
                    if not video_url:
                        return AIResponse(
                            success=False,
                            content="",
                            raw_response=poll_result,
                            error="No video URL in succeeded task"
                        )

                    async with httpx.AsyncClient(timeout=self.timeout) as client:
                        video_response = await client.get(video_url)
                        video_response.raise_for_status()
                        video_bytes = video_response.content

                    video_base64 = base64.b64encode(video_bytes).decode("utf-8")

                    return AIResponse(
                        success=True,
                        content=video_base64,
                        raw_response={
                            "video_url": video_url,
                            "content_type": video_response.headers.get("content-type", ""),
                            "size": len(video_bytes)
                        },
                        usage={"video_duration": duration}
                    )

                elif status == "failed":
                    error_msg = task_info.get("error", "Video generation failed")
                    return AIResponse(
                        success=False,
                        content="",
                        raw_response=poll_result,
                        error=error_msg
                    )

            # 轮询超时
            return AIResponse(
                success=False,
                content="",
                raw_response={},
                error="Video generation polling timeout"
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
        调用豆包声音复刻接口
        上传音频文件，返回 voice_id
        """
        url = f"{self.api_base}/audio/cloning"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
        }

        files = {
            "audio": ("audio.wav", audio_data, "audio/wav"),
            "voice_name": (None, voice_name),
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, files=files, headers=headers)
                response.raise_for_status()
                result = response.json()

            voice_id = result.get("voice_id")
            if not voice_id:
                return AIResponse(
                    success=False,
                    content="",
                    raw_response=result,
                    error="No voice_id in clone voice response"
                )

            return AIResponse(
                success=True,
                content=voice_id,
                raw_response=result,
                usage={"voice_name": voice_name}
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
