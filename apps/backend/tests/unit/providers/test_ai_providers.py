"""
AI Providers 单元测试
使用 pytest-httpx 模拟 API 调用
"""
import inspect
import pytest
import json
import base64
from unittest.mock import patch

from app.providers.ai import (
    AIProviderFactory,
    DoubaoProvider,
    DifyProvider,
    DeepSeekProvider,
    ZhipuProvider,
    AIResponse,
    BaseAIProvider
)


# ============ AIResponse Tests ============

def test_ai_response_creation():
    """测试 AIResponse 创建"""
    response = AIResponse(
        success=True,
        content="Hello World",
        raw_response={"choices": [{"text": "Hello World"}]},
        error=None,
        usage={"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}
    )
    assert response.success is True
    assert response.content == "Hello World"
    assert response.error is None
    assert response.usage["total_tokens"] == 15


def test_ai_response_error():
    """测试 AIResponse 错误情况"""
    response = AIResponse(
        success=False,
        content="",
        raw_response={},
        error="API request failed"
    )
    assert response.success is False
    assert response.error == "API request failed"


# ============ Factory Tests ============

def test_factory_get_doubao_provider():
    """测试工厂获取豆包提供商"""
    provider = AIProviderFactory.get_provider("volcano", api_key="test_key")
    assert isinstance(provider, DoubaoProvider)
    assert provider.api_key == "test_key"


def test_factory_get_dify_provider():
    """测试工厂获取 Dify 提供商"""
    provider = AIProviderFactory.get_provider("dify", api_key="test_key", workflow_id="test_workflow")
    assert isinstance(provider, DifyProvider)
    assert provider.api_key == "test_key"
    assert provider.workflow_id == "test_workflow"


def test_factory_unsupported_provider():
    """测试不支持的提供商"""
    with pytest.raises(ValueError) as excinfo:
        AIProviderFactory.get_provider("unsupported_provider")
    assert "Unsupported AI provider" in str(excinfo.value)


def test_factory_case_insensitive():
    """测试提供商名称大小写不敏感"""
    provider1 = AIProviderFactory.get_provider("DOUBAO", api_key="test")
    provider2 = AIProviderFactory.get_provider("Doubao", api_key="test")
    assert isinstance(provider1, DoubaoProvider)
    assert isinstance(provider2, DoubaoProvider)


def test_factory_register_provider():
    """测试注册新的提供商"""
    class TestProvider(BaseAIProvider):
        async def generate_text(self, prompt, system_prompt=None, **kwargs):
            return AIResponse(success=True, content="test", raw_response={})
        async def generate_image(self, prompt, size=None, **kwargs):
            return AIResponse(success=True, content="test", raw_response={})
        async def generate_audio(self, text, voice=None, **kwargs):
            return AIResponse(success=True, content="test", raw_response={})
        async def generate_video(self, prompt, duration=None, **kwargs):
            return AIResponse(success=True, content="test", raw_response={})

    AIProviderFactory.register_provider("test", TestProvider)
    provider = AIProviderFactory.get_provider("test", api_key="test_key")
    assert isinstance(provider, TestProvider)


# ============ DoubaoProvider Tests ============

def test_doubao_generate_text_signature_matches_deepseek_kwargs_style():
    """测试豆包文本生成签名与 DeepSeek 一样通过 kwargs 接收 thinking"""
    doubao_signature = inspect.signature(DoubaoProvider.generate_text)
    deepseek_signature = inspect.signature(DeepSeekProvider.generate_text)

    assert "thinking" not in doubao_signature.parameters
    assert list(doubao_signature.parameters) == list(deepseek_signature.parameters)


@pytest.mark.asyncio
async def test_doubao_generate_text_success(httpx_mock):
    """测试豆包文本生成成功"""
    mock_response = {
        "choices": [
            {
                "message": {"content": "这是豆包的回复"},
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 10,
            "completion_tokens": 20,
            "total_tokens": 30
        }
    }

    httpx_mock.add_response(json=mock_response)

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.generate_text("你好，请介绍一下自己")

    assert response.success is True
    assert response.content == "这是豆包的回复"
    assert response.usage["total_tokens"] == 30
    assert response.error is None

    request_payload = json.loads(httpx_mock.get_requests()[0].content)
    assert request_payload["model"] == "deepseek-v4-flash-260425"
    assert request_payload["thinking"] == {"type": "disabled"}


@pytest.mark.asyncio
async def test_doubao_generate_text_with_system_prompt(httpx_mock):
    """测试豆包文本生成带系统提示词"""
    mock_response = {
        "choices": [
            {"message": {"content": "我是助手"}}
        ],
        "usage": {"total_tokens": 20}
    }

    httpx_mock.add_response(json=mock_response)

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.generate_text(
        prompt="你好",
        system_prompt="你是一个专业的助手"
    )

    assert response.success is True
    assert response.content == "我是助手"


@pytest.mark.asyncio
async def test_doubao_generate_text_thinking_uses_pro_model(httpx_mock):
    """测试豆包文本生成开启深度思考模式"""
    mock_response = {
        "choices": [
            {"message": {"content": "深度思考后的回复", "reasoning_content": "思考过程"}}
        ],
        "usage": {"total_tokens": 50}
    }

    httpx_mock.add_response(json=mock_response)

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.generate_text(prompt="分析这个问题", thinking=True)

    assert response.success is True
    assert response.content == "深度思考后的回复"

    request_payload = json.loads(httpx_mock.get_requests()[0].content)
    assert request_payload["model"] == "deepseek-v4-pro-260425"
    assert request_payload["thinking"] == {"type": "enabled"}
    assert request_payload["reasoning_effort"] == "max"


@pytest.mark.asyncio
async def test_doubao_generate_text_timeout(httpx_mock):
    """测试豆包文本生成超时"""
    import httpx
    httpx_mock.add_exception(httpx.TimeoutException("Timeout"))

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.generate_text("你好")

    assert response.success is False
    assert "timeout" in response.error.lower()


@pytest.mark.asyncio
async def test_doubao_generate_text_http_error(httpx_mock):
    """测试豆包文本生成HTTP错误"""
    httpx_mock.add_response(status_code=401, text="Unauthorized")

    provider = DoubaoProvider(api_key="invalid_key")
    response = await provider.generate_text("你好")

    assert response.success is False
    assert "401" in response.error


@pytest.mark.asyncio
async def test_doubao_generate_image_success(httpx_mock):
    """测试豆包 Seedream 图片生成成功（b64_json 直接返回）"""
    mock_b64 = base64.b64encode(b"fake_image_bytes").decode("utf-8")
    httpx_mock.add_response(
        json={"data": [{"b64_json": mock_b64, "revised_prompt": ""}]}
    )

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.generate_image("一只可爱的猫")

    assert response.success is True
    assert response.content == mock_b64
    assert response.usage["images"] == 1


@pytest.mark.asyncio
async def test_doubao_generate_image_url_fallback(httpx_mock):
    """测试豆包 Seedream 图片生成 URL 回退（下载后 base64 编码）"""
    # 第一步：API 返回图片 URL
    httpx_mock.add_response(
        json={"data": [{"url": "https://example.com/img.png"}]}
    )
    # 第二步：下载图片
    httpx_mock.add_response(content=b"fake_image_bytes")

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.generate_image("一只可爱的猫")

    assert response.success is True
    assert len(response.content) > 0
    decoded = base64.b64decode(response.content)
    assert decoded == b"fake_image_bytes"
    assert response.usage["images"] == 1


@pytest.mark.asyncio
async def test_doubao_generate_image_api_error(httpx_mock):
    """测试豆包图片生成 API 错误"""
    httpx_mock.add_response(status_code=400, text="Bad Request")

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.generate_image("一只猫")

    assert response.success is False
    assert "400" in response.error


@pytest.mark.asyncio
async def test_doubao_generate_video_success(httpx_mock):
    """测试豆包 Seedance 视频生成成功（提交 -> 轮询 -> 下载）"""
    # 1. 提交任务
    httpx_mock.add_response(json={"id": "task_123"})
    # 2. 第一次轮询 - 运行中
    httpx_mock.add_response(
        json={"task": {"id": "task_123", "status": "running"}}
    )
    # 3. 第二次轮询 - 成功
    httpx_mock.add_response(
        json={
            "task": {
                "id": "task_123",
                "status": "succeeded",
                "output": {"video_url": "https://example.com/video.mp4"}
            }
        }
    )
    # 4. 下载视频
    httpx_mock.add_response(content=b"fake_video_bytes")

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.generate_video(
        "一只猫在跑步",
        duration=10,
        poll_interval=0.001,
        max_polls=10
    )

    assert response.success is True
    assert len(response.content) > 0
    decoded = base64.b64decode(response.content)
    assert decoded == b"fake_video_bytes"
    assert response.usage["video_duration"] == 10


@pytest.mark.asyncio
async def test_doubao_generate_video_failed(httpx_mock):
    """测试豆包 Seedance 视频生成失败（提交 -> 轮询 -> 失败）"""
    # 1. 提交任务
    httpx_mock.add_response(json={"id": "task_123"})
    # 2. 轮询 - 失败
    httpx_mock.add_response(
        json={
            "task": {
                "id": "task_123",
                "status": "failed",
                "error": "Model inference error"
            }
        }
    )

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.generate_video(
        "一只猫在跑步",
        poll_interval=0.001,
        max_polls=10
    )

    assert response.success is False
    assert "Model inference error" in response.error


@pytest.mark.asyncio
async def test_doubao_clone_voice_success(httpx_mock):
    """测试豆包声音复刻成功"""
    httpx_mock.add_response(
        json={"voice_id": "voice_abc123", "message": "success"}
    )

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.clone_voice(
        audio_data=b"fake_audio_bytes",
        voice_name="my_voice"
    )

    assert response.success is True
    assert response.content == "voice_abc123"
    assert response.usage["voice_name"] == "my_voice"


@pytest.mark.asyncio
async def test_doubao_clone_voice_failure(httpx_mock):
    """测试豆包声音复刻失败（无 voice_id）"""
    httpx_mock.add_response(json={"message": "ok"})

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.clone_voice(
        audio_data=b"fake_audio_bytes"
    )

    assert response.success is False
    assert "voice_id" in response.error.lower()


@pytest.mark.asyncio
async def test_doubao_generate_audio_success(httpx_mock):
    """测试豆包语音生成成功"""
    mock_audio_data = b"fake audio data"

    httpx_mock.add_response(
        content=mock_audio_data,
        headers={"content-type": "audio/mpeg"}
    )

    provider = DoubaoProvider(api_key="test_key")
    response = await provider.generate_audio("你好，世界")

    assert response.success is True
    assert len(response.content) > 0  # base64 encoded
    # 验证base64解码后的数据
    decoded = base64.b64decode(response.content)
    assert decoded == mock_audio_data
    assert response.usage["characters"] == 5


# ============ DifyProvider Tests ============

@pytest.mark.asyncio
async def test_dify_run_workflow_success(httpx_mock):
    """测试 Dify 工作流运行成功"""
    mock_response = {
        "code": 0,
        "outputs": {
            "result": "工作流执行结果",
            "image_url": "https://example.com/image.png"
        },
        "metadata": {
            "usage": {"total_tokens": 50}
        }
    }

    httpx_mock.add_response(json=mock_response)

    provider = DifyProvider(api_key="test_key", workflow_id="test_workflow_id")
    response = await provider.run_workflow({"prompt": "生成一个故事"})

    assert response.success is True
    assert "工作流执行结果" in response.content
    assert response.usage["total_tokens"] == 50


@pytest.mark.asyncio
async def test_dify_run_workflow_succeeded_status(httpx_mock):
    """测试 Dify 工作流 succeeded 状态"""
    mock_response = {
        "status": "succeeded",
        "outputs": {
            "output": "执行成功"
        }
    }

    httpx_mock.add_response(json=mock_response)

    provider = DifyProvider(api_key="test_key", workflow_id="test_workflow_id")
    response = await provider.run_workflow({"prompt": "测试"})

    assert response.success is True
    assert response.content == "执行成功"


@pytest.mark.asyncio
async def test_dify_run_workflow_no_workflow_id():
    """测试 Dify 工作流没有 workflow_id"""
    provider = DifyProvider(api_key="test_key")
    response = await provider.run_workflow({"prompt": "测试"})
    assert response.success is False
    assert "workflow_id is required" in response.error


@pytest.mark.asyncio
async def test_dify_run_workflow_failed(httpx_mock):
    """测试 Dify 工作流执行失败"""
    mock_response = {
        "code": 1,
        "message": "工作流执行失败"
    }

    httpx_mock.add_response(json=mock_response)

    provider = DifyProvider(api_key="test_key", workflow_id="test_workflow")
    response = await provider.run_workflow({"prompt": "测试"})

    assert response.success is False
    assert "工作流执行失败" in response.error


@pytest.mark.asyncio
async def test_dify_generate_text(httpx_mock):
    """测试 Dify 生成文本"""
    mock_response = {
        "code": 0,
        "outputs": {"result": "生成的文本内容"}
    }

    httpx_mock.add_response(json=mock_response)

    provider = DifyProvider(api_key="test_key", workflow_id="text_workflow")
    response = await provider.generate_text("写一首诗")

    assert response.success is True
    assert "生成的文本内容" in response.content


@pytest.mark.asyncio
async def test_dify_generate_image(httpx_mock):
    """测试 Dify 生成图片"""
    mock_response = {
        "code": 0,
        "outputs": {"image_url": "https://example.com/image.png"}
    }

    httpx_mock.add_response(json=mock_response)

    provider = DifyProvider(api_key="test_key", workflow_id="image_workflow")
    response = await provider.generate_image("一只可爱的猫", size="1024x1024")

    assert response.success is True


@pytest.mark.asyncio
async def test_dify_generate_audio(httpx_mock):
    """测试 Dify 生成语音"""
    mock_response = {
        "code": 0,
        "outputs": {"audio_url": "https://example.com/audio.mp3"}
    }

    httpx_mock.add_response(json=mock_response)

    provider = DifyProvider(api_key="test_key", workflow_id="audio_workflow")
    response = await provider.generate_audio("你好，世界", voice="female")

    assert response.success is True


@pytest.mark.asyncio
async def test_dify_generate_video(httpx_mock):
    """测试 Dify 生成视频"""
    mock_response = {
        "code": 0,
        "outputs": {"video_url": "https://example.com/video.mp4"}
    }

    httpx_mock.add_response(json=mock_response)

    provider = DifyProvider(api_key="test_key", workflow_id="video_workflow")
    response = await provider.generate_video("一只猫在跑步", duration=10)

    assert response.success is True


@pytest.mark.asyncio
async def test_dify_workflow_timeout(httpx_mock):
    """测试 Dify 工作流超时"""
    import httpx
    httpx_mock.add_exception(httpx.TimeoutException("Timeout"))

    provider = DifyProvider(api_key="test_key", workflow_id="test")
    response = await provider.run_workflow({"prompt": "test"})

    assert response.success is False
    assert "timeout" in response.error.lower()


@pytest.mark.asyncio
async def test_dify_workflow_exception():
    """测试 Dify 工作流异常"""
    provider = DifyProvider(api_key="test_key", workflow_id="test")

    # 模拟API调用时的异常
    with patch('httpx.AsyncClient.post') as mock_post:
        class MockContext:
            async def __aenter__(self):
                raise Exception("Unknown error")
            async def __aexit__(self, *args):
                pass
        mock_post.return_value = MockContext()

        response = await provider.run_workflow({"prompt": "test"})

        assert response.success is False
        assert "Unexpected error" in response.error


@pytest.mark.asyncio
async def test_dify_workflow_http_error(httpx_mock):
    """测试 Dify 工作流HTTP错误"""
    httpx_mock.add_response(status_code=500, text="Internal Server Error")

    provider = DifyProvider(api_key="test_key", workflow_id="test_workflow")
    response = await provider.run_workflow({"prompt": "测试"})

    assert response.success is False
    assert "500" in response.error


# ============ Integration Tests ============

def test_provider_config_merge():
    """测试配置合并（环境变量 + 传入参数）"""
    import os

    # 设置环境变量
    os.environ["VOLCANO_API_KEY"] = "env_key"
    os.environ["VOLCANO_API_BASE"] = "https://env.api.com"
    os.environ["VOLCANO_MODEL"] = "env_model"

    # 不传配置，使用环境变量
    provider1 = AIProviderFactory.get_provider("volcano")
    assert provider1.api_key == "env_key"
    assert provider1.api_base == "https://env.api.com"
    assert provider1.model == "env_model"

    # 传入配置覆盖环境变量
    provider2 = AIProviderFactory.get_provider("volcano", api_key="custom_key")
    assert provider2.api_key == "custom_key"  # 传入的优先级更高
    assert provider2.api_base == "https://env.api.com"  # 环境变量的值

    # 清理环境变量
    del os.environ["DOUBAO_API_KEY"]
    del os.environ["DOUBAO_API_BASE"]
    del os.environ["DOUBAO_MODEL"]


# ============ DeepSeekProvider Tests ============

@pytest.mark.asyncio
async def test_deepseek_generate_text_success(httpx_mock):
    """测试 DeepSeek 文本生成成功"""
    mock_response = {
        "choices": [
            {
                "message": {"content": "这是 DeepSeek 的回复"},
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 15,
            "completion_tokens": 25,
            "total_tokens": 40
        }
    }

    httpx_mock.add_response(json=mock_response)

    provider = DeepSeekProvider(api_key="test_key")
    response = await provider.generate_text("你好，请介绍一下自己")

    assert response.success is True
    assert response.content == "这是 DeepSeek 的回复"
    assert response.usage["total_tokens"] == 40
    assert response.error is None


@pytest.mark.asyncio
async def test_deepseek_generate_text_thinking_mode(httpx_mock):
    """测试 DeepSeek 思考模式"""
    mock_response = {
        "choices": [
            {
                "message": {"content": "思考后的回复"},
                "finish_reason": "stop"
            }
        ],
        "usage": {"total_tokens": 50}
    }

    httpx_mock.add_response(json=mock_response)

    provider = DeepSeekProvider(api_key="test_key")
    response = await provider.generate_text("复杂推理问题", thinking=True)

    assert response.success is True
    assert response.content == "思考后的回复"

    # 验证请求中使用了正确的模型和 extra_body
    request = httpx_mock.get_request()
    body = request.content.decode()
    assert "deepseek-v4-pro" in body
    assert "thinking" in body
    assert "enabled" in body


@pytest.mark.asyncio
async def test_deepseek_generate_text_http_error(httpx_mock):
    """测试 DeepSeek 文本生成 HTTP 错误"""
    httpx_mock.add_response(status_code=401, text="Unauthorized")

    provider = DeepSeekProvider(api_key="invalid_key")
    response = await provider.generate_text("你好")

    assert response.success is False
    assert "401" in response.error


@pytest.mark.asyncio
async def test_deepseek_generate_text_timeout(httpx_mock):
    """测试 DeepSeek 文本生成超时"""
    import httpx
    httpx_mock.add_exception(httpx.TimeoutException("Timeout"))

    provider = DeepSeekProvider(api_key="test_key")
    response = await provider.generate_text("你好")

    assert response.success is False
    assert "timeout" in response.error.lower()


@pytest.mark.asyncio
async def test_deepseek_unsupported_methods():
    """测试 DeepSeek 不支持的生成方法"""
    provider = DeepSeekProvider(api_key="test_key")

    # 图片生成
    img_response = await provider.generate_image("一只猫")
    assert img_response.success is False
    assert "not implemented" in img_response.error.lower()

    # 音频生成
    audio_response = await provider.generate_audio("你好")
    assert audio_response.success is False
    assert "not implemented" in audio_response.error.lower()

    # 视频生成
    video_response = await provider.generate_video("一只猫在跑步")
    assert video_response.success is False
    assert "not implemented" in video_response.error.lower()


# ============ ZhipuProvider Tests ============

@pytest.mark.asyncio
async def test_zhipu_generate_text_success(httpx_mock):
    """测试智谱文本生成成功"""
    mock_response = {
        "choices": [
            {
                "message": {"content": "这是智谱的回复"},
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 10,
            "completion_tokens": 20,
            "total_tokens": 30
        }
    }

    httpx_mock.add_response(json=mock_response)

    provider = ZhipuProvider(api_key="test_key")
    response = await provider.generate_text("你好，请介绍一下自己")

    assert response.success is True
    assert response.content == "这是智谱的回复"
    assert response.usage["total_tokens"] == 30
    assert response.error is None


@pytest.mark.asyncio
async def test_zhipu_generate_image_success(httpx_mock):
    """测试智谱 CogView-3 图片生成成功"""
    # 第一步：CogView API 返回图片 URL
    httpx_mock.add_response(
        json={"data": [{"url": "https://example.com/img.png"}]}
    )
    # 第二步：下载图片
    httpx_mock.add_response(content=b"fake_image_bytes")

    provider = ZhipuProvider(api_key="test_key")
    response = await provider.generate_image("一只可爱的猫")

    assert response.success is True
    assert len(response.content) > 0  # base64 编码后的数据
    # 验证 base64 解码后是原始图片数据
    decoded = base64.b64decode(response.content)
    assert decoded == b"fake_image_bytes"
    assert response.usage["images"] == 1


@pytest.mark.asyncio
async def test_zhipu_generate_audio_success(httpx_mock):
    """测试智谱 GLM-TTS 语音生成成功"""
    mock_audio_data = b"fake audio data from zhipu"

    httpx_mock.add_response(
        content=mock_audio_data,
        headers={"content-type": "audio/mpeg"}
    )

    provider = ZhipuProvider(api_key="test_key")
    response = await provider.generate_audio("你好，世界")

    assert response.success is True
    assert len(response.content) > 0
    decoded = base64.b64decode(response.content)
    assert decoded == mock_audio_data
    assert response.usage["characters"] == 5


@pytest.mark.asyncio
async def test_zhipu_generate_video_not_supported():
    """测试智谱视频生成未实现"""
    provider = ZhipuProvider(api_key="test_key")
    response = await provider.generate_video("一只猫在跑步")

    assert response.success is False
    assert "not implemented" in response.error.lower()


@pytest.mark.asyncio
async def test_zhipu_generate_image_download_failure(httpx_mock):
    """测试智谱 CogView 图片下载失败"""
    # 第一步：CogView API 返回图片 URL
    httpx_mock.add_response(
        json={"data": [{"url": "https://example.com/img.png"}]}
    )
    # 第二步：下载图片时返回 404
    httpx_mock.add_response(status_code=404, text="Not Found")

    provider = ZhipuProvider(api_key="test_key")
    response = await provider.generate_image("一只猫")

    assert response.success is False
    assert "404" in response.error
