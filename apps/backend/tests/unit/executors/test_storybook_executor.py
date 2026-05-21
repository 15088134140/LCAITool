"""
有声绘本执行器单元测试
"""
import uuid
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
    """创建执行器实例"""
    return StorybookExecutor(task_id=task_id, db=mock_db)


class TestStorybookExecutor:
    """有声绘本执行器测试"""

    def test_estimate_cost(self, executor):
        """测试费用预估"""
        # 基础测试
        params = {
            'page_count': 5,
            'include_audio': True
        }
        cost = executor.estimate_cost(params)
        assert cost == 20 + (2 * 5) + (1 * 5)  # 基础费 + 图片费 + 音频费
        assert cost == 35

        # 不包含音频
        params_no_audio = {
            'page_count': 5,
            'include_audio': False
        }
        cost_no_audio = executor.estimate_cost(params_no_audio)
        assert cost_no_audio == 20 + (2 * 5)
        assert cost_no_audio == 30

        # 不同页数
        params_more_pages = {
            'page_count': 10,
            'include_audio': True
        }
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
        """测试故事大纲生成"""
        mock_response = AIResponse(
            success=True,
            content=json.dumps({
                'title': '勇敢的小兔子',
                'characters': ['小兔子', '小熊', '狐狸'],
                'synopsis': '小兔子在森林里冒险的故事',
                'moral': '勇敢和友谊的重要性',
                'plot_points': ['出发', '遇到困难', '解决问题', '回家']
            }),
            raw_response={}
        )

        with patch.object(executor.ai_provider, 'generate_text', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_response

            result = await executor._generate_story_outline(
                theme='勇敢的小兔子',
                target_age='3-6',
                page_count=5
            )

            assert result['title'] == '勇敢的小兔子'
            assert 'characters' in result
            assert 'synopsis' in result
            mock_generate.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_story_outline_failure(self, executor):
        """测试故事大纲生成失败"""
        mock_response = AIResponse(
            success=False,
            content='',
            raw_response={},
            error='API Error'
        )

        with patch.object(executor.ai_provider, 'generate_text', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_response

            with pytest.raises(RuntimeError, match='故事大纲生成失败'):
                await executor._generate_story_outline(
                    theme='测试',
                    target_age='3-6',
                    page_count=5
                )

    @pytest.mark.asyncio
    async def test_generate_story_pages(self, executor):
        """测试分页故事文本生成"""
        outline = {
            'title': '测试故事',
            'characters': ['角色A', '角色B'],
            'synopsis': '这是一个测试故事'
        }

        mock_response = AIResponse(
            success=True,
            content=json.dumps([
                {'page_number': 1, 'title': '开始', 'text': '故事开始了'},
                {'page_number': 2, 'title': '发展', 'text': '故事发展中'},
                {'page_number': 3, 'title': '结局', 'text': '故事结束了'}
            ]),
            raw_response={}
        )

        with patch.object(executor.ai_provider, 'generate_text', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_response

            result = await executor._generate_story_pages(outline, 3)

            assert len(result) == 3
            assert result[0]['page_number'] == 1
            assert result[0]['title'] == '开始'
            mock_generate.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_illustration_prompts(self, executor):
        """测试插画提示词生成"""
        pages = [
            {'page_number': 1, 'title': '第一页', 'text': '小兔子在森林里散步'},
            {'page_number': 2, 'title': '第二页', 'text': '小兔子遇到了小熊'}
        ]

        mock_response = AIResponse(
            success=True,
            content=json.dumps({
                'image_prompt_en': 'cute rabbit walking in forest',
                'image_prompt_zh': '可爱的兔子在森林里散步',
                'style_keywords': 'watercolor, children book'
            }),
            raw_response={}
        )

        with patch.object(executor.ai_provider, 'generate_text', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_response

            result = await executor._generate_illustration_prompts(pages, 'watercolor')

            assert len(result) == 2
            assert 'image_prompt_en' in result[0]
            assert 'image_prompt_zh' in result[0]
            assert mock_generate.call_count == 2

    @pytest.mark.asyncio
    async def test_generate_images_parallel(self, executor):
        """测试并行图片生成"""
        pages = [
            {'page_number': 1, 'title': '第一页', 'image_prompt_en': 'prompt 1'},
            {'page_number': 2, 'title': '第二页', 'image_prompt_en': 'prompt 2'},
            {'page_number': 3, 'title': '第三页', 'image_prompt_en': 'prompt 3'}
        ]

        mock_response = AIResponse(
            success=True,
            content='http://example.com/image.png',
            raw_response={}
        )

        with patch.object(executor.ai_provider, 'generate_image', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_response

            with patch.object(executor, 'update_progress', new_callable=AsyncMock):
                result = await executor._generate_images_parallel(pages, 'watercolor')

                assert len(result) == 3
                assert all(page.get('image_generated') is True for page in result)
                assert mock_generate.call_count == 3

    @pytest.mark.asyncio
    async def test_generate_audio_parallel(self, executor):
        """测试并行音频生成"""
        pages = [
            {'page_number': 1, 'title': '第一页', 'text': '故事文本1'},
            {'page_number': 2, 'title': '第二页', 'text': '故事文本2'}
        ]

        mock_response = AIResponse(
            success=True,
            content='http://example.com/audio.mp3',
            raw_response={}
        )

        with patch.object(executor.ai_provider, 'generate_audio', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_response

            with patch.object(executor, 'update_progress', new_callable=AsyncMock):
                result = await executor._generate_audio_parallel(pages)

                assert len(result) == 2
                assert all(page.get('audio_generated') is True for page in result)
                assert mock_generate.call_count == 2

    @pytest.mark.asyncio
    async def test_execute_full_flow(self, executor, mock_db):
        """测试完整执行流程"""
        params = {
            'theme': '勇敢的小兔子',
            'target_age': '3-6',
            'page_count': 3,
            'art_style': 'watercolor',
            'include_audio': True,
            'language': 'zh'
        }

        # Mock 各种内部方法
        with patch.object(executor, '_generate_story_outline', new_callable=AsyncMock) as mock_outline:
            mock_outline.return_value = {
                'title': '勇敢的小兔子',
                'characters': ['小兔子'],
                'synopsis': '小兔子的冒险故事',
                'moral': '勇敢',
                'plot_points': ['开始', '发展', '结局']
            }

            with patch.object(executor, '_generate_story_pages', new_callable=AsyncMock) as mock_pages:
                mock_pages.return_value = [
                    {'page_number': 1, 'title': '开始', 'text': '故事开始了'},
                    {'page_number': 2, 'title': '发展', 'text': '故事发展中'},
                    {'page_number': 3, 'title': '结局', 'text': '故事结束了'}
                ]

                with patch.object(executor, '_generate_illustration_prompts', new_callable=AsyncMock) as mock_prompts:
                    mock_prompts.return_value = [
                        {'page_number': 1, 'image_prompt_en': 'p1'},
                        {'page_number': 2, 'image_prompt_en': 'p2'},
                        {'page_number': 3, 'image_prompt_en': 'p3'}
                    ]

                    with patch.object(executor, '_generate_images_parallel', new_callable=AsyncMock) as mock_images:
                        mock_images.return_value = [
                            {'page_number': 1, 'image_url': 'img1.png', 'image_generated': True},
                            {'page_number': 2, 'image_url': 'img2.png', 'image_generated': True},
                            {'page_number': 3, 'image_url': 'img3.png', 'image_generated': True}
                        ]

                        with patch.object(executor, '_generate_audio_parallel', new_callable=AsyncMock) as mock_audio:
                            mock_audio.return_value = [
                                {'page_number': 1, 'audio_url': 'audio1.mp3', 'audio_generated': True},
                                {'page_number': 2, 'audio_url': 'audio2.mp3', 'audio_generated': True},
                                {'page_number': 3, 'audio_url': 'audio3.mp3', 'audio_generated': True}
                            ]

                            with patch.object(executor, '_generate_pdf_and_zip', new_callable=AsyncMock) as mock_pdf:
                                mock_pdf.return_value = {
                                    'pdf_path': '/tmp/test.pdf',
                                    'zip_path': '/tmp/test.zip',
                                    'pdf_size': 1024,
                                    'zip_size': 2048
                                }

                                with patch.object(executor, '_create_work_record', new_callable=AsyncMock) as mock_work:
                                    mock_work.return_value = MagicMock(id=uuid.uuid4())

                                    with patch.object(executor, 'update_progress', new_callable=AsyncMock):
                                        with patch.object(executor, 'save_snapshot', new_callable=AsyncMock):
                                            with patch.object(executor, 'add_log', new_callable=AsyncMock):
                                                with patch.object(executor, 'get_snapshot', new_callable=AsyncMock) as mock_get_snapshot:
                                                    mock_get_snapshot.return_value = None

                                                    result = await executor.execute(params)

                                                    assert result['success'] is True
                                                    assert 'work_id' in result
                                                    assert result['page_count'] == 3

    def test_constants(self):
        """测试常量配置"""
        assert StorybookExecutor.BASE_FEE == 20
        assert StorybookExecutor.IMAGE_FEE_PER_PAGE == 2
        assert StorybookExecutor.AUDIO_FEE_PER_PAGE == 1
        assert StorybookExecutor.MAX_PARALLEL_IMAGES == 3
        assert StorybookExecutor.MAX_PARALLEL_AUDIOS == 5


# 需要导入json
import json
