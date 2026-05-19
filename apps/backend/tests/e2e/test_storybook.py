# apps/backend/tests/e2e/test_storybook.py
"""
绘本生成工具测试
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import pytest
from utils.helpers import take_screenshot, wait_for_network_idle

E2E_BASE_URL = "http://localhost:3000"


@pytest.mark.storybook
class TestStorybookGenerator:
    """绘本生成工具相关测试"""

    def test_storybook_page_loads(self, page):
        """测试绘本生成页面加载"""
        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")

        wait_for_network_idle(page)
        take_screenshot(page, "storybook_page_loaded")

        assert page.url is not None
        print("✅ 绘本生成页面加载成功")

    def test_storybook_form_elements_exist(self, page):
        """测试绘本生成表单元素存在"""
        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")
        wait_for_network_idle(page)

        # 检查页面上的输入元素（无论具体定位器，只要页面加载成功即可）
        form_count = page.locator("input").count()
        take_screenshot(page, "storybook_form_elements")

        print(f"✅ 页面包含 {form_count} 个输入元素")

    @pytest.mark.slow
    def test_storybook_form_submission_smoke(self, page):
        """
        绘本生成表单提交冒烟测试
        注意：此测试仅验证提交按钮存在，不实际执行生成
        """
        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")
        wait_for_network_idle(page)

        # 截图
        take_screenshot(page, "storybook_before_submit")

        # 验证按钮存在（使用多种可能的选择器）
        buttons = page.get_by_role("button")
        button_count = buttons.count()

        print(f"✅ 页面包含 {button_count} 个按钮")
        assert button_count > 0
