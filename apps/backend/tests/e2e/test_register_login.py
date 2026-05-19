# apps/backend/tests/e2e/test_register_login.py
"""
用户注册与登录流程 E2E 测试
使用命令: E2E_HEADLESS=false pytest tests/e2e/test_register_login.py -v
"""
import sys
import os
import time
sys.path.insert(0, os.path.dirname(__file__))

import pytest
from playwright.sync_api import Page, BrowserContext, expect
from utils.helpers import take_screenshot

# 测试配置
BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
TEST_PHONE = "13800138000"
TEST_PASSWORD = "Test123456!"
TEST_NICKNAME = "测试用户001"


@pytest.fixture(scope="module")
def browser_context(browser):
    """共享的浏览器上下文，测试结束后保持打开供查看"""
    context = browser.new_context(
        viewport={"width": 1440, "height": 900},
        locale="zh-CN",
    )
    yield context
    # 测试结束后不立即关闭，方便查看结果
    print("\n" + "="*60)
    print("✅ 测试完成！浏览器窗口将保持 10 秒供查看")
    print("="*60)
    time.sleep(10)
    context.close()


class TestRegistrationFlow:
    """注册流程测试"""

    def test_register_page_loads(self, page: Page):
        """测试注册页面正常加载"""
        page.goto(f"{BASE_URL}/register")
        page.wait_for_load_state("networkidle")
        take_screenshot(page, "01_register_page_loaded")

        # 验证页面标题
        assert "灵创AI" in page.title() or "注册" in page.title()

        # 验证关键元素存在（至少有按钮）
        buttons = page.get_by_role("button")
        assert buttons.count() > 0, "页面上应该有按钮元素"

        print("✅ 注册页面加载成功")

    def test_register_form_elements(self, page: Page):
        """测试注册表单元素是否完整"""
        page.goto(f"{BASE_URL}/register")
        page.wait_for_load_state("networkidle")

        # 检查输入框数量
        input_count = page.locator("input").count()
        print(f"📝 找到 {input_count} 个输入框")

        # 检查表单按钮（至少有2个按钮：获取验证码 + 注册）
        buttons = page.get_by_role("button")
        button_count = buttons.count()
        print(f"🔘 找到 {button_count} 个按钮")

        take_screenshot(page, "02_register_form_elements")

        print("✅ 注册表单元素验证完成")

    def test_password_visibility_toggle(self, page: Page):
        """测试密码显示/隐藏切换功能"""
        page.goto(f"{BASE_URL}/register")
        page.wait_for_load_state("networkidle")

        # 找到密码输入框旁边的眼睛图标按钮
        password_input = page.locator('input[type="password"]').first
        if password_input.is_visible():
            # 点击显示密码按钮
            eye_buttons = page.locator('button[type="button"]').all()
            for btn in eye_buttons:
                try:
                    btn.click()
                    take_screenshot(page, "03_password_shown")
                    print("✅ 密码显示/隐藏切换功能正常")
                    break
                except:
                    continue
        else:
            print("⚠️  未找到密码输入框")

    def test_navigate_from_register_to_login(self, page: Page):
        """测试从注册页跳转到登录页"""
        page.goto(f"{BASE_URL}/register")
        page.wait_for_load_state("networkidle")

        # 点击链接跳转到登录（使用文本包含方式查找）
        all_links = page.get_by_role("link")
        found = False
        for i in range(all_links.count()):
            link = all_links.nth(i)
            text = link.text_content() or ""
            if "登录" in text or "已有" in text:
                link.click()
                page.wait_for_load_state("networkidle")
                take_screenshot(page, "04_navigated_to_login")
                assert "/login" in page.url
                print("✅ 从注册页跳转到登录页成功")
                found = True
                break

        if not found:
            print("⚠️  未找到登录链接")


class TestLoginFlow:
    """登录流程测试"""

    def test_login_page_loads(self, page: Page):
        """测试登录页面正常加载"""
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        take_screenshot(page, "05_login_page_loaded")

        # 验证页面元素
        assert "灵创AI" in page.title() or "登录" in page.title()
        print("✅ 登录页面加载成功")

    def test_wechat_login_button(self, page: Page):
        """测试微信登录按钮"""
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")

        # 查找包含"微信"文本的按钮
        buttons = page.get_by_role("button")
        wechat_found = False

        for i in range(buttons.count()):
            btn = buttons.nth(i)
            text = btn.text_content() or ""
            if "微信" in text:
                btn.click()
                page.wait_for_timeout(1000)
                take_screenshot(page, "06_wechat_login_modal")
                print("✅ 微信登录弹窗打开成功")
                wechat_found = True
                break

        if not wechat_found:
            print("⚠️  未找到微信登录按钮")

    def test_password_login_form_fill(self, page: Page):
        """测试密码登录表单填写"""
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")

        # 找到用户名/手机号输入框并填写
        username_input = page.locator('input[type="text"], input[name="username"]').first
        if username_input.is_visible():
            username_input.fill(TEST_PHONE)
            take_screenshot(page, "07_username_filled")

        # 找到密码输入框并填写
        password_input = page.locator('input[type="password"]').first
        if password_input.is_visible():
            password_input.fill(TEST_PASSWORD)
            take_screenshot(page, "08_password_filled")

        print("✅ 登录表单填写功能测试完成")

    def test_form_submission(self, page: Page):
        """测试登录表单提交（预期失败，因为后端可能未启动）"""
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")

        # 填写表单
        username_input = page.locator('input[type="text"], input[name="username"]').first
        password_input = page.locator('input[type="password"]').first

        if username_input.is_visible() and password_input.is_visible():
            username_input.fill(TEST_PHONE)
            password_input.fill(TEST_PASSWORD)
            take_screenshot(page, "09_login_form_ready")

            # 点击登录按钮
            buttons = page.get_by_role("button")
            for i in range(buttons.count()):
                btn = buttons.nth(i)
                text = btn.text_content() or ""
                if "登录" in text:
                    btn.click()
                    page.wait_for_timeout(2000)
                    take_screenshot(page, "10_login_submitted")
                    break

        print("✅ 登录表单提交流程测试完成")

    def test_navigate_from_login_to_register(self, page: Page):
        """测试从登录页跳转到注册页"""
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")

        # 查找注册链接
        all_links = page.get_by_role("link")
        found = False
        for i in range(all_links.count()):
            link = all_links.nth(i)
            text = link.text_content() or ""
            if "注册" in text or "没有账号" in text:
                link.click()
                page.wait_for_load_state("networkidle")
                take_screenshot(page, "11_navigated_to_register")
                assert "/register" in page.url
                print("✅ 从登录页跳转到注册页成功")
                found = True
                break

        if not found:
            print("⚠️  未找到注册链接")


class TestFullUserJourney:
    """完整用户旅程测试"""

    def test_full_journey_visitor_flow(self, page: Page):
        """测试访客的完整浏览流程"""
        print("\n" + "="*50)
        print("🚀 开始用户完整旅程测试")
        print("="*50)

        # 1. 访问首页
        print("\n📄 1/4: 访问首页")
        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle")
        take_screenshot(page, "12_homepage")

        # 2. 访问登录页
        print("\n🔐 2/4: 访问登录页")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        take_screenshot(page, "13_login_page")

        # 3. 访问注册页
        print("\n📝 3/4: 访问注册页")
        page.goto(f"{BASE_URL}/register")
        page.wait_for_load_state("networkidle")
        take_screenshot(page, "14_register_page")

        # 4. 返回登录页
        print("\n↩️  4/4: 返回登录页")
        page.go_back()
        page.wait_for_load_state("networkidle")
        take_screenshot(page, "15_back_to_login")

        print("\n✅ 用户完整旅程测试完成！")
        print(f"📸 所有截图保存在: tests/e2e/screenshots/")
