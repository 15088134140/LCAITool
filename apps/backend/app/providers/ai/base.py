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
        :param config: 配置参数（必填: api_key, base_url；可选: text_model, image_model, video_model, audio_model, *_timeout, slug）
        :raises ConfigurationError: 当 api_key 或 base_url 缺失时
        """
        from app.core.exceptions import ConfigurationError

        slug = config.get("slug", "<unknown>")
        api_key = config.get("api_key")
        base_url = config.get("base_url")
        if not api_key:
            raise ConfigurationError(f"ai provider 未配置 api_key: {slug}")
        if not base_url:
            raise ConfigurationError(f"ai provider 未配置 base_url: {slug}")

        self.config = config
        self.slug = slug
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.text_model = config.get("text_model")
        self.image_model = config.get("image_model")
        self.video_model = config.get("video_model")
        self.audio_model = config.get("audio_model")
        self.timeout = config.get("timeout", 120)
        self.image_timeout = config.get("image_timeout", 300)
        self.video_timeout = config.get("video_timeout", 600)

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
