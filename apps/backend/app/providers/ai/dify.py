"""
Dify 工作流提供商
支持调用 Dify 工作流 API
"""
import httpx
from typing import Optional, Dict, Any
import json

from .base import BaseAIProvider, AIResponse


class DifyProvider(BaseAIProvider):
    """Dify 工作流提供商"""

    def __init__(self, **config):
        super().__init__(**config)
        self.api_base = self.api_base or "https://api.dify.ai/v1"
        self.workflow_id = config.get("workflow_id", "")

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """
        通过 Dify 工作流生成文本
        将 prompt 作为 inputs 参数传入
        """
        inputs = {"prompt": prompt}
        if system_prompt:
            inputs["system_prompt"] = system_prompt

        return await self.run_workflow(inputs, **kwargs)

    async def generate_image(
        self,
        prompt: str,
        size: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """
        通过 Dify 工作流生成图片
        """
        inputs = {"prompt": prompt}
        if size:
            inputs["size"] = size

        return await self.run_workflow(inputs, **kwargs)

    async def generate_audio(
        self,
        text: str,
        voice: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """
        通过 Dify 工作流生成语音
        """
        inputs = {"text": text}
        if voice:
            inputs["voice"] = voice

        return await self.run_workflow(inputs, **kwargs)

    async def generate_video(
        self,
        prompt: str,
        duration: Optional[int] = None,
        **kwargs
    ) -> AIResponse:
        """
        通过 Dify 工作流生成视频
        """
        inputs = {"prompt": prompt}
        if duration:
            inputs["duration"] = duration

        return await self.run_workflow(inputs, **kwargs)

    async def run_workflow(
        self,
        inputs: Dict[str, Any],
        **kwargs
    ) -> AIResponse:
        """
        运行 Dify 工作流
        :param inputs: 工作流输入参数
        :param kwargs: 其他参数（workflow_id, user_id等）
        :return: AIResponse
        """
        workflow_id = kwargs.get("workflow_id", self.workflow_id)
        if not workflow_id:
            return AIResponse(
                success=False,
                content="",
                raw_response={},
                error="workflow_id is required"
            )

        url = f"{self.api_base}/workflows/run"

        payload = {
            "workflow_id": workflow_id,
            "inputs": inputs,
            "user": kwargs.get("user_id", "default_user"),
            "response_mode": "blocking"
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

            # 处理 Dify 工作流响应
            if result.get("code") == 0 or result.get("status") == "succeeded":
                # 成功响应，提取输出内容
                outputs = result.get("outputs", {})
                # Dify 工作流通常在 outputs 中返回结果
                content = json.dumps(outputs, ensure_ascii=False) if outputs else ""

                # 尝试提取主要输出字段
                if isinstance(outputs, dict):
                    for key in ["result", "output", "content", "text", "answer"]:
                        if key in outputs:
                            content = str(outputs[key])
                            break

                return AIResponse(
                    success=True,
                    content=content,
                    raw_response=result,
                    usage=result.get("metadata", {}).get("usage", {})
                )
            else:
                error_msg = result.get("message", "Workflow execution failed")
                return AIResponse(
                    success=False,
                    content="",
                    raw_response=result,
                    error=error_msg
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
