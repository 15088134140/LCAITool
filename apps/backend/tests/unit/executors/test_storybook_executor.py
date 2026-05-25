"""
有声绘本执行器单元测试 — 更新版（多 Provider 架构）
"""
import uuid
import json
import base64
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.executors.storybook import StorybookExecutor
from app.providers.ai.base import AIResponse


@pytest.fixture
def mock_db():
    """模拟数据库会话"""
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def task_id():
    """生成测试任务ID"""
    return uuid.uuid4()


@pytest.fixture
def executor(task_id, mock_db):
    """创建执行器实例，并手动注入 mock provider"""
    exec_inst = StorybookExecutor(task_id=task_id, db=mock_db)
    exec_inst.deepseek_provider = AsyncMock()
    exec_inst.doubao_provider = AsyncMock()
    exec_inst.zhipu_provider = AsyncMock()
    return exec_inst


class TestStorybookExecutor:
    """有声绘本执行器测试（多 Provider 架构）"""

    def test_estimate_cost(self, executor):
        """测试费用预估"""
        # 基础测试：5页 + 音频
        params = {'page_count': 5, 'include_audio': True}
        cost = executor.estimate_cost(params)
        assert cost == 20 + (2 * 5) + (1 * 5)
        assert cost == 35

        # 不包含音频
        params_no_audio = {'page_count': 5, 'include_audio': False}
        cost_no_audio = executor.estimate_cost(params_no_audio)
        assert cost_no_audio == 20 + (2 * 5)
        assert cost_no_audio == 30

        # 不同页数
        params_more_pages = {'page_count': 10, 'include_audio': True}
        cost_more = executor.estimate_cost(params_more_pages)
        assert cost_more == 20 + (2 * 10) + (1 * 10)
        assert cost_more == 50

    @pytest.mark.asyncio
    async def test_update_progress(self, executor, mock_db):
        """测试进度更新"""
        with patch('app.executors.base.TaskService.update_task_status', new_callable=AsyncMock) as mock_update:
            await executor.update_progress(50, "测试进度")
            mock_update.assert_called_once_with(
                db=mock_db,
                task_id=executor.task_id,
                progress=50,
                message="测试进度"
            )

    @pytest.mark.asyncio
    async def test_add_log(self, executor, mock_db):
        """测试添加日志"""
        with patch('app.executors.base.TaskService.add_task_log', new_callable=AsyncMock) as mock_add_log:
            await executor.add_log('info', '测试消息', {'key': 'value'})
            mock_add_log.assert_called_once_with(
                db=mock_db,
                task_id=executor.task_id,
                level='info',
                message='测试消息',
                details={'key': 'value'}
            )

    @pytest.mark.asyncio
    async def test_save_and_get_snapshot(self, executor, mock_db):
        """测试快照保存和获取"""
        snapshot_data = {
            'step': 2,
            'data': {'outline': {'title': '测试故事'}}
        }

        with patch('app.executors.base.TaskService.save_snapshot', new_callable=AsyncMock) as mock_save:
            await executor.save_snapshot(snapshot_data)
            mock_save.assert_called_once_with(
                db=mock_db,
                task_id=executor.task_id,
                snapshot_data=snapshot_data
            )

        # 重置缓存以测试get_snapshot
        executor._snapshot = None
        with patch('app.executors.base.TaskService.get_snapshot', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = snapshot_data
            result = await executor.get_snapshot()
            assert result == snapshot_data
            mock_get.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_story_outline(self, executor):
        """测试故事大纲生成（DeepSeek thinking 模式）"""
        executor.deepseek_provider.generate_text.return_value = AIResponse(
            success=True,
            content=json.dumps({
                'title': '勇敢的小兔子',
                'story': '小兔子在森林里冒险的故事...',
                'suggested_page_count': 8
            }),
            raw_response={},
        )

        result = await executor._generate_story_outline(
            theme='勇敢的小兔子', target_age='3-6', smart_page_count=True
        )

        assert result['title'] == '勇敢的小兔子'
        assert result['suggested_page_count'] == 8

        # 验证调用参数
        call_kwargs = executor.deepseek_provider.generate_text.call_args[1]
        assert call_kwargs.get('thinking') is True
        assert '请根据主题' in call_kwargs.get('prompt', '')
        assert '儿童绘本作家' in call_kwargs.get('system_prompt', '')

    @pytest.mark.asyncio
    async def test_generate_story_outline_failure(self, executor):
        """测试故事大纲生成失败"""
        executor.deepseek_provider.generate_text.return_value = AIResponse(
            success=False, content='', raw_response={}, error='API Error'
        )

        with pytest.raises(RuntimeError, match='故事梗概生成失败'):
            await executor._generate_story_outline(theme='测试', target_age='3-6')

    @pytest.mark.asyncio
    async def test_generate_illustration_prompts(self, executor):
        """测试插画提示词批量生成（DeepSeek）"""
        outline = {'story': '小兔子冒险故事...'}
        mock_pages = [
            {'description': '场景1', 'prompt': 'prompt1', 'text_snippet': '片段1', 'importance': '5'},
            {'description': '场景2', 'prompt': 'prompt2', 'text_snippet': '片段2', 'importance': '4'},
        ]
        executor.deepseek_provider.generate_text.return_value = AIResponse(
            success=True, content=json.dumps(mock_pages), raw_response={},
        )

        result = await executor._generate_illustration_prompts(outline, 2, 'cartoon')
        assert len(result) == 2
        assert result[0]['description'] == '场景1'
        assert result[1]['prompt'] == 'prompt2'

    @pytest.mark.asyncio
    async def test_generate_illustration_prompts_failure(self, executor):
        """测试插画提示词生成失败"""
        executor.deepseek_provider.generate_text.return_value = AIResponse(
            success=False, content='', raw_response={}, error='API Error'
        )

        with pytest.raises(RuntimeError, match='插画提示词生成失败'):
            await executor._generate_illustration_prompts({'story': 'test'}, 2, 'cartoon')

    @pytest.mark.asyncio
    async def test_generate_images_serial(self, executor, tmp_path):
        """测试串行图片生成（豆包 Seedream 4.5）"""
        pages = [
            {'description': '场景1', 'prompt': 'prompt1'},
            {'description': '场景2', 'prompt': 'prompt2'},
        ]
        mock_b64 = base64.b64encode(b"fake_image_data").decode("utf-8")
        executor.doubao_provider.generate_image.return_value = AIResponse(
            success=True, content=mock_b64, raw_response={},
        )

        with patch.object(executor, 'update_progress', new_callable=AsyncMock):
            result = await executor._generate_images_serial(pages, str(tmp_path))

        assert len(result) == 2
        assert result[0]['image_generated'] is True
        assert executor.doubao_provider.generate_image.call_count == 2

    @pytest.mark.asyncio
    async def test_generate_images_serial_failure(self, executor, tmp_path):
        """测试图片生成失败回退"""
        pages = [{'description': '场景1', 'prompt': 'prompt1'}]
        executor.doubao_provider.generate_image.return_value = AIResponse(
            success=False, content='', raw_response={}, error='API Error',
        )

        with patch.object(executor, 'update_progress', new_callable=AsyncMock):
            with patch.object(executor, '_create_dummy_image', return_value='/tmp/dummy.png'):
                result = await executor._generate_images_serial(pages, str(tmp_path))

        assert result[0]['image_generated'] is False

    @pytest.mark.asyncio
    async def test_generate_audio_serial(self, executor, tmp_path):
        """测试串行语音合成（智谱 GLM-TTS）"""
        pages = [
            {'text_snippet': '片段1'},
            {'text_snippet': '片段2'},
        ]
        mock_b64 = base64.b64encode(b"fake_audio_data").decode("utf-8")
        executor.zhipu_provider.generate_audio.return_value = AIResponse(
            success=True, content=mock_b64, raw_response={},
        )

        with patch.object(executor, 'update_progress', new_callable=AsyncMock):
            result = await executor._generate_audio_serial(pages, str(tmp_path), 'warm')

        assert len(result) == 2
        assert result[0]['audio_generated'] is True
        assert executor.zhipu_provider.generate_audio.call_count == 2

    @pytest.mark.asyncio
    async def test_execute_full_flow(self, executor, mock_db):
        """测试完整执行流程（所有步骤 mock）"""
        params = {
            'theme': '勇敢的小兔子',
            'target_age': '3-6',
            'page_count': 2,
            'art_style': 'cartoon',
            'include_audio': True,
        }

        with patch.object(executor, '_init_providers', new_callable=AsyncMock):
            with patch.object(executor, '_generate_story_outline', new_callable=AsyncMock) as mock_outline:
                mock_outline.return_value = {'title': '测试', 'story': '故事内容'}

                with patch.object(executor, '_generate_illustration_prompts', new_callable=AsyncMock) as mock_prompts:
                    mock_prompts.return_value = [
                        {'description': 's1'},
                        {'description': 's2'},
                    ]

                    with patch.object(executor, '_generate_images_serial', new_callable=AsyncMock) as mock_images:
                        mock_images.return_value = [
                            {'image_generated': True, 'image_url': '/tmp/1.png'},
                            {'image_generated': True, 'image_url': '/tmp/2.png'},
                        ]

                        with patch.object(executor, '_generate_audio_serial', new_callable=AsyncMock) as mock_audio:
                            mock_audio.return_value = [
                                {'audio_generated': True, 'audio_url': '/tmp/1.mp3'},
                                {'audio_generated': True, 'audio_url': '/tmp/2.mp3'},
                            ]

                            with patch.object(executor, '_generate_pdf_and_zip', new_callable=AsyncMock) as mock_pdf:
                                mock_pdf.return_value = {
                                    'pdf_path': '/tmp/test.pdf',
                                    'zip_path': '/tmp/test.zip',
                                    'pdf_size': 100,
                                    'zip_size': 200,
                                }

                                with patch.object(executor, '_create_work_record', new_callable=AsyncMock) as mock_work:
                                    mock_work.return_value = MagicMock(id=uuid.uuid4())

                                    with patch.object(executor, 'update_progress', new_callable=AsyncMock):
                                        with patch.object(executor, 'save_snapshot', new_callable=AsyncMock):
                                            with patch.object(executor, 'add_log', new_callable=AsyncMock):
                                                with patch.object(executor, 'get_snapshot', new_callable=AsyncMock) as mock_snap:
                                                    mock_snap.return_value = None

                                                    result = await executor.execute(params)

                                                    assert result['success'] is True
                                                    assert 'work_id' in result
                                                    assert result['page_count'] == 2
