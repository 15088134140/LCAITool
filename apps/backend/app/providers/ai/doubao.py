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

    SUPPORTED_IMAGE_SIZES = ["1024x1024", "1920x1920", "1440x2560", "2560x1440"]

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """
        调用火山方舟 Chat API 生成文本
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

        thinking = kwargs.pop("thinking", False)

        payload = {
            "model": self.text_model,
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 2048),
            "thinking": {"type": "enabled" if thinking else "disabled"},
            "stream": False
        }
        if thinking:
            payload["reasoning_effort"] = "max"

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
        支持尺寸: 1024x1024, 1920x1920, 1440x2560, 2560x1440
        """
        # 校验图片尺寸
        if size is not None and size not in self.SUPPORTED_IMAGE_SIZES:
            return AIResponse(
                success=False,
                content="",
                raw_response={},
                error=f"不支持的图片尺寸 '{size}'，豆包支持: {', '.join(self.SUPPORTED_IMAGE_SIZES)}"
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
            "size": size or "1920x1920",
            "n": kwargs.get("n", 1),
            "watermark": kwargs.get("watermark", False)
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=self.image_timeout) as client:
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
        Doubao 暂不支持语音合成（火山方舟 Ark API 无 TTS 端点）
        """
        return AIResponse(
            success=False,
            content="",
            raw_response={},
            error="Audio generation not implemented for Doubao provider"
        )

    def _build_video_content(
        self,
        prompt: str,
        images: Optional[list] = None
    ) -> list:
        """
        构建 Seedance 视频生成的 content 数组
        返回 [{type:text, text:prompt}] + images 的 {type:image_url, image_url: {url: ...}, role?}
        prompt 为空且无有效图片时返回空 list
        """
        content = []

        if prompt:
            content.append({"type": "text", "text": prompt})

        if images:
            for img in images:
                # 跳过非 dict 项，避免 .get() 崩溃
                if not isinstance(img, dict):
                    continue
                image_url = img.get("url") or img.get("data", "")
                if image_url:
                    item = {"type": "image_url", "image_url": {"url": image_url}}
                    if img.get("role"):
                        item["role"] = img["role"]
                    content.append(item)

        return content

    def _extract_video_url(self, task_result: Dict[str, Any]) -> str:
        """
        从任务结果中提取视频 URL
        优先顶层 content.video_url，兼容 task.content 或 task.output 中的 video_url
        """
        # 优先顶层 content.video_url (官方 Ark API)
        content = task_result.get("content", {})
        if isinstance(content, dict) and "video_url" in content:
            return content["video_url"]

        # 兼容旧格式：task.content 或 task.output
        task = task_result.get("task") or {}
        task_content = task.get("content", {})
        if isinstance(task_content, dict) and "video_url" in task_content:
            return task_content["video_url"]

        task_output = task.get("output", {})
        if isinstance(task_output, dict) and "video_url" in task_output:
            return task_output["video_url"]

        # 兼容顶层 output 或 video_url
        output = task_result.get("output", {})
        if isinstance(output, dict) and "video_url" in output:
            return output["video_url"]

        return task_result.get("video_url", "")

    def _extract_error_message(self, task_result: Dict[str, Any]) -> str:
        """
        从任务结果中提取错误消息
        兼容顶层 error 字典/字符串 与 task.error 字典/字符串
        """
        # 优先顶层 error
        error = task_result.get("error")

        # 兼容 task.error
        if error is None:
            task = task_result.get("task") or {}
            error = task.get("error", "Video generation failed")

        if isinstance(error, dict):
            return error.get("message", str(error))
        elif isinstance(error, str):
            return error
        else:
            return str(error)

    async def generate_video(
        self,
        prompt: str,
        duration: Optional[int] = None,
        **kwargs
    ) -> AIResponse:
        """
        调用豆包 Seedance 生成视频（异步任务轮询模式）
        官方 Ark API: POST /api/v3/contents/generations/tasks
        提交任务后轮询状态，成功则下载视频并 base64 编码
        """
        if not self.video_model:
            return AIResponse(
                success=False, content="", raw_response={},
                error=f"provider '{self.slug}' 未配置 video_model"
            )

        create_url = f"{self.base_url}/contents/generations/tasks"

        # 构建 content 数组（支持多图）
        images = kwargs.get("images")
        content = self._build_video_content(prompt, images)

        if not content:
            return AIResponse(
                success=False,
                content="",
                raw_response={},
                error="Seedance video content is empty"
            )

        # 构建 payload - 默认 watermark=False，且不允许 kwargs 覆盖为 True
        payload = {
            "model": self.video_model,
            "content": content,
            "watermark": False,
        }

        # 可选字段：有值时才加入
        if duration is not None:
            payload["duration"] = duration
        if kwargs.get("resolution"):
            payload["resolution"] = kwargs["resolution"]
        if kwargs.get("ratio"):
            payload["ratio"] = kwargs["ratio"]
        if "generate_audio" in kwargs:
            payload["generate_audio"] = bool(kwargs["generate_audio"])
        if "return_last_frame" in kwargs:
            payload["return_last_frame"] = bool(kwargs["return_last_frame"])
        if kwargs.get("seed") is not None:
            payload["seed"] = kwargs["seed"]
        if kwargs.get("camera_fixed") is not None:
            payload["camera_fixed"] = kwargs["camera_fixed"]

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        try:
            # 第一步：提交视频生成任务
            async with httpx.AsyncClient(timeout=self.video_timeout) as client:
                response = await client.post(create_url, json=payload, headers=headers)
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
            poll_url = f"{self.base_url}/contents/generations/tasks/{task_id}"
            max_polls = kwargs.get("max_polls", 60)
            poll_interval = kwargs.get("poll_interval", 5)

            for _ in range(max_polls):
                await asyncio.sleep(poll_interval)

                async with httpx.AsyncClient(timeout=self.video_timeout) as client:
                    poll_response = await client.get(poll_url, headers=headers)
                    poll_response.raise_for_status()
                    poll_result = poll_response.json()

                # 兼容顶层 status 或 task.status
                status = poll_result.get("status", "")
                if not status and "task" in poll_result:
                    status = poll_result["task"].get("status", "")

                if status == "succeeded":
                    video_url = self._extract_video_url(poll_result)
                    if not video_url:
                        return AIResponse(
                            success=False,
                            content="",
                            raw_response=poll_result,
                            error="No video URL in succeeded task"
                        )

                    async with httpx.AsyncClient(timeout=self.video_timeout) as client:
                        video_response = await client.get(video_url)
                        video_response.raise_for_status()
                        video_bytes = video_response.content

                    video_base64 = base64.b64encode(video_bytes).decode("utf-8")

                    # 返回完整 poll_result，确保 content.video_url 存在
                    raw_response = poll_result.copy()
                    # 额外补充下载元数据
                    raw_response["_download"] = {
                        "content_type": video_response.headers.get("content-type", ""),
                        "size": len(video_bytes)
                    }
                    return AIResponse(
                        success=True,
                        content=video_base64,
                        raw_response=raw_response,
                        usage=poll_result.get("usage", {})
                    )

                elif status in ("failed", "expired"):
                    error_msg = self._extract_error_message(poll_result)
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
        url = f"{self.base_url}/audio/cloning"

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
