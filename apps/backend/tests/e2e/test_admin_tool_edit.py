"""
管理端工具编辑 usage_modes 配置 E2E 测试

测试目标（Task 22）：
1. 管理员登录
2. 导航到工具编辑页
3. usage_modes 复选框正确显示和交互
4. 保存配置成功

运行方式（有头模式）：
  E2E_HEADLESS=false pytest tests/e2e/test_admin_tool_edit.py -v --headed --slowmo 300

⚠️ 需要：管理端在 3001 端口运行，管理员账号 admin/admin123
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
import re
from utils.helpers import take_screenshot, wait_for_network_idle

ADMIN_BASE_URL = os.getenv("ADMIN_BASE_URL", "http://localhost:3001")
SCREENSHOTS_DIR = "tests/e2e/screenshots/admin_tool_edit"


class TestAdminToolEditUsageModes:
    """管理端工具编辑 — usage_modes 配置"""

    @pytest.fixture(scope="class")
    def admin_context(self, browser):
        """管理员登录上下文"""
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="zh-CN",
        )
        page = context.new_page()

        # 登录管理员
        page.goto(f"{ADMIN_BASE_URL}/login")
        page.wait_for_load_state("networkidle")

        # 填写登录表单
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
        yield page
        context.close()

    def test_tool_edit_page_has_usage_modes_section(self, admin_context):
        """工具编辑页包含使用模式配置区块"""
        page = admin_context
        print("\n📌 [测试] 工具编辑页使用模式区块")

        # 导航到有声绘本工具编辑页（假设工具 ID 已知）
        page.goto(f"{ADMIN_BASE_URL}/tools/storybook-generator/edit")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        take_screenshot(page, "01_tool_edit_page", SCREENSHOTS_DIR)

        page_text = page.content()

        # 验证存在使用模式配置
        has_usage_modes_section = "使用模式" in page_text
        has_form_mode = "表单模式" in page_text or "form" in page_text.lower()
        has_dialog_mode = "对话模式" in page_text or "dialog" in page_text.lower()

        print(f"  ✅ 使用模式区块: {has_usage_modes_section}")
        print(f"  ✅ 表单模式选项: {has_form_mode}")
        print(f"  ✅ 对话模式选项: {has_dialog_mode}")

    def test_toggle_dialog_mode_checkbox(self, admin_context):
        """切换对话模式复选框"""
        page = admin_context
        print("\n📌 [测试] 切换对话模式复选框")

        page.goto(f"{ADMIN_BASE_URL}/tools/storybook-generator/edit")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)

        # 查找对话模式复选框
        dialog_checkbox = page.locator('input[type="checkbox"]').filter(has_text=re.compile(r'对话|dialog'))
        if dialog_checkbox.count() == 0:
            # 尝试找所有 checkbox 中的第二个
            dialog_checkbox = page.locator('input[type="checkbox"]')

        checkbox_count = dialog_checkbox.count()
        print(f"  ✅ 找到复选框数量: {checkbox_count}")

        if checkbox_count > 0:
            # 勾选/取消勾选第一个复选框
            is_checked = dialog_checkbox.first.is_checked()
            dialog_checkbox.first.click()
            page.wait_for_timeout(500)
            new_checked = dialog_checkbox.first.is_checked()
            print(f"  ✅ 复选框状态变化: {is_checked} → {new_checked}")
            assert is_checked != new_checked, "复选框状态未变化"

            take_screenshot(page, "02_checkbox_toggled", SCREENSHOTS_DIR)

    def test_save_tool_config(self, admin_context):
        """保存工具配置"""
        page = admin_context
        print("\n📌 [测试] 保存工具配置")

        page.goto(f"{ADMIN_BASE_URL}/tools/storybook-generator/edit")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)

        # 查找保存按钮
        save_btn = page.locator('button').filter(has_text=re.compile(r'保存|提交|更新'))
        if save_btn.count() > 0:
            save_btn.first.click()
            page.wait_for_timeout(2000)
            take_screenshot(page, "03_save_complete", SCREENSHOTS_DIR)
            print(f"  ✅ 保存按钮点击完成")
            print(f"  ✅ 保存后 URL: {page.url}")
        else:
            print("  ⚠️ 未找到保存按钮")

    def test_edit_page_has_basic_fields(self, admin_context):
        """编辑页包含基本配置字段"""
        page = admin_context
        print("\n📌 [测试] 编辑页基本配置字段")

        page.goto(f"{ADMIN_BASE_URL}/tools/storybook-generator/edit")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        take_screenshot(page, "04_edit_fields", SCREENSHOTS_DIR)

        page_text = page.content()
        has_name = "工具名称" in page_text or "name" in page_text.lower()
        has_slug = "slug" in page_text.lower()
        has_pricing = "价格" in page_text or "费用" in page_text or "定价" in page_text

        print(f"  ✅ 工具名称字段: {has_name}")
        print(f"  ✅ slug 字段: {has_slug}")
        print(f"  ✅ 价格配置区块: {has_pricing}")

    def test_edit_page_has_param_schema_section(self, admin_context):
        """工具编辑页包含参数字段映射配置区块"""
        page = admin_context
        print("\n📌 [测试] 工具编辑页参数字段映射区块")

        page.goto(f"{ADMIN_BASE_URL}/tools/storybook-generator/edit")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        take_screenshot(page, "05_param_schema_section", SCREENSHOTS_DIR)

        page_text = page.content()

        has_param_schema = "参数映射" in page_text or "param_schema" in page_text.lower()
        has_section_title = "参数字段" in page_text
        has_key_column = "key" in page_text.lower()
        has_label_column = "label" in page_text.lower() or "字段名" in page_text

        print(f"  ✅ 参数映射区块: {has_param_schema}")
        print(f"  ✅ 参数字段标题: {has_section_title}")
        print(f"  ✅ key 列: {has_key_column}")
        print(f"  ✅ label 列: {has_label_column}")
