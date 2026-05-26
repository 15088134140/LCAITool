"""
AI Provider 抽象基类
定义所有AI提供商需要实现的接口
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class AIResponse:
    """AI 调用响应数据类"""
    success: bool
    content: str
    raw_response: Dict[str, Any]
    error: Optional[str] = None
    usage: Optional[Dict[str, Any]] = None


class BaseAIProvider(ABC):
    """AI 提供商抽象基类"""

    def __init__(self, **config):
        """
        初始化提供商
        :param config: 配置参数（api_key, api_base, model, timeout等）
        """
        self.config = config
        self.api_key = config.get("api_key", "")
        self.api_base = config.get("api_base", "")
        self.model = config.get("model", "")
        self.timeout = config.get("timeout", 120)                # 文本/音频/克隆
        self.image_timeout = config.get("image_timeout", 300)    # 图片生成
        self.video_timeout = config.get("video_timeout", 600)    # 视频生成

    @abstractmethod
    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """
        生成文本
        :param prompt: 用户提示词
        :param system_prompt: 系统提示词
        :param kwargs: 其他参数（temperature, max_tokens等）
        :return: AIResponse
        """
        pass

    @abstractmethod
    async def generate_image(
        self,
        prompt: str,
        size: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """
        生成图片
        :param prompt: 图片提示词
        :param size: 图片尺寸（如 "1024x1024"）
        :param kwargs: 其他参数
        :return: AIResponse
        """
        pass

    @abstractmethod
    async def generate_audio(
        self,
        text: str,
        voice: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """
        生成语音
        :param text: 要转换的文本
        :param voice: 声音类型
        :param kwargs: 其他参数
        :return: AIResponse
        """
        pass

    @abstractmethod
    async def generate_video(
        self,
        prompt: str,
        duration: Optional[int] = None,
        **kwargs
    ) -> AIResponse:
        """
        生成视频
        :param prompt: 视频提示词
        :param duration: 视频时长（秒）
        :param kwargs: 其他参数
        :return: AIResponse
        """
        pass

    async def clone_voice(
        self,
        audio_data: bytes,
        voice_name: str = "cloned_voice",
        **kwargs
    ) -> AIResponse:
        """
        声音复刻（默认不支持）
        :param audio_data: 音频二进制数据
        :param voice_name: 声音名称
        :param kwargs: 其他参数
        :return: AIResponse
        """
        return AIResponse(
            success=False,
            content="",
            raw_response={},
            error=f"Voice cloning not implemented for {self.__class__.__name__} provider"
        )
