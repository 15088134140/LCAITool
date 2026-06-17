"""
执行器费用预估单元测试
覆盖：StorybookExecutor、EcommerceExecutor、MarketingExecutor 的 estimate_cost 方法
"""
import inspect
import pytest
from app.executors.base import BaseToolExecutor
from app.executors.storybook import StorybookExecutor
from app.executors.ecommerce import DIFY_STEP_MAP, EcommerceExecutor
from app.executors.marketing import MarketingExecutor


class TestStorybookCostEstimate:
    """有声绘本执行器费用预估测试"""

    def test_storybook_cost_estimate_default(self):
        """默认参数：5页，含音频"""
        executor = StorybookExecutor.__new__(StorybookExecutor)
        executor._tool_config = {
            'base_fee': 20,
            'image_fee': 2,
            'audio_fee': 1,
        }
        params = {'page_count': 5, 'voiceType': 'tongtong'}
        cost = executor.estimate_cost(params)
        # base_fee(20) + image_fee(2) * 5 + audio_fee(1) * 5 = 35
        assert cost == 35

    def test_storybook_cost_estimate_no_audio(self):
        """voiceType 为 none 时不含音频"""
        executor = StorybookExecutor.__new__(StorybookExecutor)
        executor._tool_config = {
            'base_fee': 20,
            'image_fee': 2,
            'audio_fee': 1,
        }
        params = {'page_count': 5, 'voiceType': 'none'}
        cost = executor.estimate_cost(params)
        # base_fee(20) + image_fee(2) * 5 = 30
        assert cost == 30

    def test_storybook_cost_estimate_ignores_legacy_include_audio(self):
        """include_audio 不再控制费用，音频由 voiceType 决定"""
        executor = StorybookExecutor.__new__(StorybookExecutor)
        executor._tool_config = {
            'base_fee': 20,
            'image_fee': 2,
            'audio_fee': 1,
        }
        params = {'page_count': 5, 'voiceType': 'tongtong', 'include_audio': False}
        cost = executor.estimate_cost(params)
        assert cost == 35

    def test_storybook_cost_estimate_more_pages(self):
        """更多页数"""
        executor = StorybookExecutor.__new__(StorybookExecutor)
        executor._tool_config = {
            'base_fee': 20,
            'image_fee': 2,
            'audio_fee': 1,
        }
        params = {'page_count': 10, 'voiceType': 'tongtong'}
        cost = executor.estimate_cost(params)
        # base_fee(20) + image_fee(2) * 10 + audio_fee(1) * 10 = 50
        assert cost == 50

    def test_storybook_cost_estimate_custom_fees(self):
        """自定义费用配置"""
        executor = StorybookExecutor.__new__(StorybookExecutor)
        executor._tool_config = {
            'base_fee': 50,
            'image_fee': 3,
            'audio_fee': 2,
        }
        params = {'page_count': 8, 'voiceType': 'tongtong'}
        cost = executor.estimate_cost(params)
        # base_fee(50) + image_fee(3) * 8 + audio_fee(2) * 8 = 90
        assert cost == 90


class TestEcommerceCostEstimate:
    """电商详情页执行器费用预估测试"""

    def test_ecommerce_cost_estimate_default(self):
        """默认参数：3主图 + 3详情图"""
        executor = EcommerceExecutor.__new__(EcommerceExecutor)
        executor._tool_config = {
            'base_fee': 12,
            'image_fee': 2,
        }
        params = {'mainImageCount': 3, 'detailImageCount': 3}
        cost = executor.estimate_cost(params)
        # base_fee(12) + (3+3) * image_fee(2) = 24
        assert cost == 24

    def test_ecommerce_cost_estimate_more_images(self):
        """更多图片"""
        executor = EcommerceExecutor.__new__(EcommerceExecutor)
        executor._tool_config = {
            'base_fee': 12,
            'image_fee': 2,
        }
        params = {'mainImageCount': 5, 'detailImageCount': 5}
        cost = executor.estimate_cost(params)
        # base_fee(12) + (5+5) * image_fee(2) = 32
        assert cost == 32

    def test_ecommerce_cost_estimate_no_detail_images(self):
        """无详情图"""
        executor = EcommerceExecutor.__new__(EcommerceExecutor)
        executor._tool_config = {
            'base_fee': 12,
            'image_fee': 2,
        }
        params = {'mainImageCount': 1, 'detailImageCount': 0}
        cost = executor.estimate_cost(params)
        # base_fee(12) + (1+0) * image_fee(2) = 14
        assert cost == 14

    def test_ecommerce_cost_estimate_ignores_legacy_snake_case_counts(self):
        """旧下划线字段不再参与费用计算"""
        executor = EcommerceExecutor.__new__(EcommerceExecutor)
        executor._tool_config = {
            'base_fee': 12,
            'image_fee': 2,
        }
        params = {'main_image_count': 5, 'detail_image_count': 5}
        cost = executor.estimate_cost(params)
        # 使用新驼峰字段默认值 3 + 3
        assert cost == 24


class TestMarketingCostEstimate:
    """营销文案执行器费用预估测试"""

    def test_marketing_cost_estimate_default(self):
        """默认参数：仅基础费"""
        executor = MarketingExecutor.__new__(MarketingExecutor)
        executor._tool_config = {
            'base_fee': 8,
        }
        params = {'platform_count': 3}
        cost = executor.estimate_cost(params)
        # base_fee(8)
        assert cost == 8

    def test_marketing_cost_estimate_custom_fee(self):
        """自定义基础费"""
        executor = MarketingExecutor.__new__(MarketingExecutor)
        executor._tool_config = {
            'base_fee': 15,
        }
        params = {'platform_count': 5}
        cost = executor.estimate_cost(params)
        # base_fee(15)
        assert cost == 15

    def test_marketing_cost_estimate_empty_params(self):
        """空参数"""
        executor = MarketingExecutor.__new__(MarketingExecutor)
        executor._tool_config = {
            'base_fee': 8,
        }
        params = {}
        cost = executor.estimate_cost(params)
        # base_fee(8)
        assert cost == 8


class TestExecutorDeliveryWording:
    def test_mock_executor_pdf_step_does_not_mention_packaging(self):
        source = inspect.getsource(BaseToolExecutor._mock_execute)

        assert "正在生成PDF..." in source
        assert "正在生成PDF并打包" not in source
        assert "PDF排版与打包" not in source

    def test_marketing_executor_delivery_step_does_not_mention_packaging(self):
        source = inspect.getsource(MarketingExecutor.execute)

        assert "正在保存成果..." in source
        assert "正在打包成果" not in source
        assert "打包交付" not in source

    def test_ecommerce_package_step_uses_save_delivery_wording(self):
        assert DIFY_STEP_MAP["package"]["name"] == "保存交付"


class TestCostEdgeCases:
    """费用预估边界情况测试"""

    def test_cost_with_zero_fees(self):
        """所有费用为0"""
        executor = StorybookExecutor.__new__(StorybookExecutor)
        executor._tool_config = {
            'base_fee': 0,
            'image_fee': 0,
            'audio_fee': 0,
        }
        params = {'page_count': 5, 'voiceType': 'tongtong'}
        cost = executor.estimate_cost(params)
        assert cost == 0

    def test_cost_with_zero_page_count(self):
        """页数为0时按1页兜底预估"""
        executor = StorybookExecutor.__new__(StorybookExecutor)
        executor._tool_config = {
            'base_fee': 20,
            'image_fee': 2,
            'audio_fee': 1,
        }
        params = {'page_count': 0, 'voiceType': 'tongtong'}
        cost = executor.estimate_cost(params)
        # base_fee(20) + image_fee(2) * 1 + audio_fee(1) * 1 = 23
        assert cost == 23

    def test_cost_with_null_fees(self):
        """费用配置为 None 时使用默认值"""
        executor = StorybookExecutor.__new__(StorybookExecutor)
        executor._tool_config = {}
        params = {'page_count': 5, 'voiceType': 'tongtong'}
        cost = executor.estimate_cost(params)
        # defaults: base_fee(20) + image_fee(2)*5 + audio_fee(1)*5 = 35
        assert cost == 35

    def test_ecommerce_cost_with_zero_images(self):
        """图片数量为0"""
        executor = EcommerceExecutor.__new__(EcommerceExecutor)
        executor._tool_config = {
            'base_fee': 12,
            'image_fee': 2,
        }
        params = {'mainImageCount': 0, 'detailImageCount': 0}
        cost = executor.estimate_cost(params)
        # base_fee(12)
        assert cost == 12
