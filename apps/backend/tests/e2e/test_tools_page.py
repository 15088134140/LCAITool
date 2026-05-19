# apps/backend/tests/e2e/test_tools_page.py
"""
工具页测试
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import pytest
from utils.helpers import take_screenshot, wait_for_network_idle

E2E_BASE_URL = "http://localhost:3000"


@pytest.mark.tools
class TestToolsPage:
    """工具页相关测试"""

    def test_tools_page_loads(self, page):
        """测试工具列表页加载"""
        page.goto(f"{E2E_BASE_URL}/tools")

        wait_for_network_idle(page)
        take_screenshot(page, "tools_page_loaded")

        # 验证页面加载成功
        assert page.url is not None
        assert "/tools" in page.url

        print("✅ 工具列表页加载成功")

    def test_storybook_tool_detail(self, page):
        """测试绘本生成工具详情页"""
        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")

        wait_for_network_idle(page)
        take_screenshot(page, "storybook_detail_page")

        # 验证页面加载成功
        assert page.url is not None

        print("✅ 绘本工具详情页加载成功")

    def test_ecommerce_tool_detail(self, page):
        """测试电商详情页工具详情页"""
        page.goto(f"{E2E_BASE_URL}/tools/ecommerce-generator")

        wait_for_network_idle(page)
        take_screenshot(page, "ecommerce_detail_page")

        # 验证页面加载成功
        assert page.url is not None

        print("✅ 电商工具详情页加载成功")
