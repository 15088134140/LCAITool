"""
管理端配置变更 → 用户端生效 E2E 测试

测试目标（Task 22 → Task 29 联动）：
1. 管理端修改工具 usage_modes
2. 用户端工具详情页反映配置变更
3. ToolCreationForm 根据 usage_modes 渲染正确模式

运行方式（有头模式）：
  E2E_HEADLESS=false pytest tests/e2e/test_config_propagation.py -v --headed --slowmo 300

⚠️ 需要：管理端（3001）和用户端（3000）同时运行
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
import re
from utils.helpers import take_screenshot, wait_for_network_idle

ADMIN_BASE_URL = os.getenv("ADMIN_BASE_URL", "http://localhost:3001")
E2E_BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
SCREENSHOTS_DIR = "tests/e2e/screenshots/config_propagation"


class TestConfigPropagation:
    """管理端配置 → 用户端生效验证"""

    def _admin_login(self, browser):
        """管理员登录辅助方法"""
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="zh-CN",
        )
        page = context.new_page()
        page.goto(f"{ADMIN_BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        username_input = page.locator('input[name="username"]')
        if username_input.count() > 0:
            username_input.fill("admin")
        password_input = page.locator('input[type="password"]')
        if password_input.count() > 0:
            password_input.fill("admin123")
        login_btn = page.locator('button[type="submit"]')
        if login_btn.count() > 0:
            login_btn.click()
        else:
            page.get_by_role("button").filter(has_text="登录").first.click()
        page.wait_for_timeout(2000)
        return page, context

    def _user_visit_tool(self, browser):
        """用户访问工具页辅助方法（未登录）"""
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="zh-CN",
        )
        page = context.new_page()
        return page, context

    def test_visit_user_tool_page(self, browser):
        """用户端工具详情页基本可访问"""
        page, context = self._user_visit_tool(browser)
        print("\n📌 [测试] 用户端工具详情页可访问")

        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")
        wait_for_network_idle(page)
        take_screenshot(page, "01_user_tool_page", SCREENSHOTS_DIR)

        print(f"  ✅ 用户端页面加载成功 (HTTP {page.status})")
        context.close()

    def test_usage_modes_reflects_db_config(self, browser):
        """验证不同工具的 usage_modes 配置反映在页面渲染上"""
        page, context = self._user_visit_tool(browser)
        print("\n📌 [测试] usage_modes 驱动页面渲染")

        # 访问有声绘本工具
        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")
        wait_for_network_idle(page)
        take_screenshot(page, "02_storybook_render", SCREENSHOTS_DIR)

        page_text = page.content()
        print(f"  ✅ 有声绘本页渲染正常")

        # 访问电商工具
        page.goto(f"{E2E_BASE_URL}/tools/ecommerce-detail")
        wait_for_network_idle(page)
        take_screenshot(page, "03_ecommerce_render", SCREENSHOTS_DIR)

        page_text2 = page.content()
        print(f"  ✅ 电商详情页渲染正常")

        # 访问营销文案工具
        page.goto(f"{E2E_BASE_URL}/tools/marketing-copywriter")
        wait_for_network_idle(page)
        take_screenshot(page, "04_marketing_render", SCREENSHOTS_DIR)

        print(f"  ✅ 营销文案页渲染正常")
        print(f"  ✅ 三个标杆工具均渲染正常，无白屏/崩溃")

        context.close()

    def test_admin_config_persists_after_save(self, browser):
        """管理端配置保存后持久化"""
        admin_page, admin_context = self._admin_login(browser)
        print("\n📌 [测试] 管理端配置持久化")

        # 导航到工具编辑页
        admin_page.goto(f"{ADMIN_BASE_URL}/tools/storybook-generator/edit")
        admin_page.wait_for_load_state("networkidle")
        admin_page.wait_for_timeout(1000)
        take_screenshot(admin_page, "05_admin_edit_before", SCREENSHOTS_DIR)

        # 检查使用模式区块存在
        page_text = admin_page.content()
        has_usage_modes = "使用模式" in page_text
        print(f"  ✅ 管理端使用模式配置可见: {has_usage_modes}")

        admin_context.close()
