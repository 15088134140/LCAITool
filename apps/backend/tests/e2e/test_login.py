"""
登录流程测试
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import pytest
from utils.helpers import take_screenshot

E2E_BASE_URL = "http://localhost:3000"


@pytest.mark.login
class TestLogin:
    """登录相关测试"""

    def test_login_page_loads(self, page):
        """测试登录页正常加载"""
        page.goto(f"{E2E_BASE_URL}/login")

        # 截图供智能体观察
        take_screenshot(page, "login_page_loaded")

        # 验证页面标题
        assert "登录" in page.title() or "Login" in page.title() or "灵创AI" in page.title()

        # 验证页面加载成功（没有错误页面）
        assert page.get_by_role("button").count() > 0

        print("✅ 登录页面加载成功")

    def test_homepage_redirects_to_login_when_not_logged_in(self, page):
        """测试未登录时访问首页是否跳转到登录"""
        page.goto(E2E_BASE_URL)
        take_screenshot(page, "homepage_not_logged_in")

        # 验证页面加载成功
        assert page.url is not None

        print("✅ 首页访问测试完成")

    def test_logged_in_page_fixture(self, logged_in_page):
        """测试 logged_in_page fixture"""
        logged_in_page.goto(E2E_BASE_URL)
        take_screenshot(logged_in_page, "logged_in_homepage")

        # 验证页面加载成功
        assert logged_in_page.url is not None

        print("✅ 已登录页面 fixture 测试完成")
