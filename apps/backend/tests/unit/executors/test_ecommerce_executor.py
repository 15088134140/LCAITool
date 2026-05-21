"""
电商详情页执行器单元测试
"""
import uuid
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.executors.ecommerce import EcommerceExecutor
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
    return EcommerceExecutor(task_id=task_id, db=mock_db)


class TestEcommerceExecutor:
    """电商详情页执行器测试"""

    def test_estimate_cost(self, executor):
        """测试费用预估"""
        # 基础测试 - 默认3主图+3详情图
        params = {}
        cost = executor.estimate_cost(params)
        assert cost == 12 + (3 + 3) * 2  # 基础费 + 6张图片 * 2积分
        assert cost == 24

        # 自定义数量
        params_custom = {
            'main_image_count': 5,
            'detail_image_count': 5
        }
        cost_custom = executor.estimate_cost(params_custom)
        assert cost_custom == 12 + (5 + 5) * 2
        assert cost_custom == 32

        # 只有主图
        params_only_main = {
            'main_image_count': 5,
            'detail_image_count': 0
        }
        cost_only_main = executor.estimate_cost(params_only_main)
        assert cost_only_main == 12 + 5 * 2
        assert cost_only_main == 22

    def test_style_configs(self, executor):
        """测试风格配置"""
        assert 'minimal' in executor.STYLE_CONFIGS
        assert 'tech' in executor.STYLE_CONFIGS
        assert 'lifestyle' in executor.STYLE_CONFIGS
        assert 'luxury' in executor.STYLE_CONFIGS

        minimal_config = executor.STYLE_CONFIGS['minimal']
        assert 'name' in minimal_config
        assert 'description' in minimal_config
        assert 'prompt_keywords' in minimal_config

        tech_config = executor.STYLE_CONFIGS['tech']
        assert tech_config['name'] == '科技风'
        assert 'futuristic' in tech_config['prompt_keywords']

    def test_constants(self):
        """测试常量配置"""
        assert EcommerceExecutor.BASE_FEE == 12
        assert EcommerceExecutor.IMAGE_FEE_PER_IMAGE == 2
        assert EcommerceExecutor.MAX_PARALLEL_IMAGES == 4

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
            'data': {'copywriting': {'title': '测试商品'}}
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
    async def test_generate_copywriting(self, executor):
        """测试商品文案生成"""
        mock_response = AIResponse(
            success=True,
            content=json.dumps({
                'title': '高品质无线蓝牙耳机 降噪长续航',
                'subtitle': '畅享纯净音质，开启沉浸式听觉体验',
                'selling_points': [
                    {'title': '主动降噪', 'content': '先进的主动降噪技术，隔绝外界干扰'},
                    {'title': '超长续航', 'content': '单次充电可使用30小时'},
                    {'title': 'HiFi音质', 'content': '高保真音频单元，音质出众'},
                    {'title': '舒适佩戴', 'content': '人体工学设计，长时间佩戴不累'},
                    {'title': '蓝牙5.3', 'content': '最新蓝牙技术，连接稳定快速'}
                ],
                'long_description': '这款无线蓝牙耳机采用先进的主动降噪技术...',
                'usage_scenarios': ['通勤路上', '办公学习', '运动健身', '休闲娱乐'],
                'spec_intro': '详细规格参数请参考产品详情页'
            }),
            raw_response={}
        )

        with patch.object(executor.ai_provider, 'generate_text', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_response

            result = await executor._generate_copywriting(
                product_name='无线蓝牙耳机',
                product_category='数码3C',
                key_features=['降噪', '长续航', 'HiFi'],
                target_audience='年轻人、上班族'
            )

            assert result['title'] == '高品质无线蓝牙耳机 降噪长续航'
            assert 'subtitle' in result
            assert len(result['selling_points']) >= 5
            assert 'long_description' in result
            mock_generate.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_copywriting_failure(self, executor):
        """测试商品文案生成失败"""
        mock_response = AIResponse(
            success=False,
            content='',
            raw_response={},
            error='API Error'
        )

        with patch.object(executor.ai_provider, 'generate_text', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_response

            with pytest.raises(RuntimeError, match='商品文案生成失败'):
                await executor._generate_copywriting(
                    product_name='测试商品',
                    product_category='general',
                    key_features=[],
                    target_audience='general'
                )

    @pytest.mark.asyncio
    async def test_generate_main_images(self, executor):
        """测试商品主图生成"""
        copywriting = {
            'title': '高品质无线蓝牙耳机',
            'subtitle': '降噪长续航'
        }

        mock_response = AIResponse(
            success=True,
            content='http://example.com/image.png',
            raw_response={}
        )

        with patch.object(executor.ai_provider, 'generate_image', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_response

            with patch.object(executor, 'update_progress', new_callable=AsyncMock):
                result = await executor._generate_main_images(copywriting, 'tech', 3)

                assert len(result) == 3
                assert all(img.get('generated') is True for img in result)
                assert mock_generate.call_count == 3
                assert result[0]['style'] == executor.STYLE_CONFIGS['tech']['name']

    @pytest.mark.asyncio
    async def test_generate_detail_images(self, executor):
        """测试详情页分段图片生成"""
        copywriting = {
            'title': '高品质无线蓝牙耳机',
            'selling_points': [
                {'title': '主动降噪', 'content': '先进的主动降噪技术'},
                {'title': '超长续航', 'content': '单次充电可使用30小时'},
                {'title': 'HiFi音质', 'content': '高保真音频单元'}
            ]
        }

        mock_response = AIResponse(
            success=True,
            content='http://example.com/detail.png',
            raw_response={}
        )

        with patch.object(executor.ai_provider, 'generate_image', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_response

            with patch.object(executor, 'update_progress', new_callable=AsyncMock):
                result = await executor._generate_detail_images(copywriting, 'lifestyle', 3)

                assert len(result) == 3
                assert all(img.get('generated') is True for img in result)
                assert mock_generate.call_count == 3
                assert 'type' in result[0]

    @pytest.mark.asyncio
    async def test_generate_psd_packages(self, executor):
        """测试PSD源文件打包"""
        result_data = {
            'copywriting': {'title': '测试商品'},
            'main_images': [{'index': 0, 'image_url': 'test.png'}],
            'detail_images': [{'index': 0, 'image_url': 'detail.png'}]
        }

        with patch.object(executor, 'add_log', new_callable=AsyncMock):
            result = await executor._generate_psd_packages(result_data)

            assert 'psd_files' in result
            assert 'temp_dir' in result
            assert 'psd_available' in result
            assert len(result['psd_files']) >= 1  # 至少有文案JSON

    @pytest.mark.asyncio
    async def test_generate_zip_package(self, executor):
        """测试ZIP包生成"""
        import os
        import tempfile

        # 创建临时测试文件
        _, temp_img = tempfile.mkstemp(suffix='.png')

        result_data = {
            'copywriting': {'title': '测试商品'},
            'main_images': [{'index': 0, 'image_url': temp_img}],
            'detail_images': [{'index': 0, 'image_url': temp_img}],
            'psd_files': {
                'psd_files': [],
                'psd_available': False
            }
        }

        try:
            result = await executor._generate_zip_package(result_data)

            assert 'zip_path' in result
            assert 'zip_size' in result
            assert os.path.exists(result['zip_path'])
            assert result['zip_size'] > 0

        finally:
            # 清理临时文件
            os.unlink(temp_img)
            if 'zip_path' in result and os.path.exists(result['zip_path']):
                os.unlink(result['zip_path'])

    @pytest.mark.asyncio
    async def test_execute_full_flow(self, executor, mock_db):
        """测试完整执行流程"""
        params = {
            'product_name': '无线蓝牙耳机',
            'product_category': '数码3C',
            'key_features': ['降噪', '长续航', 'HiFi'],
            'style': 'tech',
            'main_image_count': 3,
            'detail_image_count': 3,
            'target_audience': '年轻人、上班族'
        }

        # Mock 各种内部方法
        with patch.object(executor, '_generate_copywriting', new_callable=AsyncMock) as mock_copy:
            mock_copy.return_value = {
                'title': '高品质无线蓝牙耳机 降噪长续航',
                'subtitle': '畅享纯净音质',
                'selling_points': [{'title': '降噪', 'content': '主动降噪技术'}],
                'long_description': '详细描述...',
                'usage_scenarios': ['通勤', '办公'],
                'spec_intro': '规格说明...'
            }

            with patch.object(executor, '_generate_main_images', new_callable=AsyncMock) as mock_main:
                mock_main.return_value = [
                    {'index': 0, 'image_url': 'main1.png', 'generated': True},
                    {'index': 1, 'image_url': 'main2.png', 'generated': True},
                    {'index': 2, 'image_url': 'main3.png', 'generated': True}
                ]

                with patch.object(executor, '_generate_detail_images', new_callable=AsyncMock) as mock_detail:
                    mock_detail.return_value = [
                        {'index': 0, 'image_url': 'detail1.png', 'generated': True},
                        {'index': 1, 'image_url': 'detail2.png', 'generated': True},
                        {'index': 2, 'image_url': 'detail3.png', 'generated': True}
                    ]

                    with patch.object(executor, '_generate_psd_packages', new_callable=AsyncMock) as mock_psd:
                        mock_psd.return_value = {
                            'psd_files': [],
                            'temp_dir': '/tmp/test',
                            'psd_available': False
                        }

                        with patch.object(executor, '_generate_zip_package', new_callable=AsyncMock) as mock_zip:
                            mock_zip.return_value = {
                                'zip_path': '/tmp/test.zip',
                                'zip_size': 1024,
                                'main_image_count': 3,
                                'detail_image_count': 3
                            }

                            with patch.object(executor, '_create_work_record', new_callable=AsyncMock) as mock_work:
                                mock_work.return_value = MagicMock(id=uuid.uuid4())

                                with patch.object(executor, 'update_progress', new_callable=AsyncMock):
                                    with patch.object(executor, 'save_snapshot', new_callable=AsyncMock):
                                        with patch.object(executor, 'add_log', new_callable=AsyncMock):
                                            with patch.object(executor, 'get_snapshot', new_callable=AsyncMock) as mock_get:
                                                mock_get.return_value = None

                                                result = await executor.execute(params)

                                                assert result['success'] is True
                                                assert 'work_id' in result
                                                assert result['main_image_count'] == 3
                                                assert result['detail_image_count'] == 3
