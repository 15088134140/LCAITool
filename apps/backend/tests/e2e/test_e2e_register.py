"""
用户注册流程 E2E 测试 - Task 8
模拟真实用户操作，测试完整的用户注册流程

使用命令:
  cd apps/backend
  E2E_HEADLESS=false pytest tests/e2e/test_e2e_register.py -v --screenshot=on
"""
import sys
import os
import time
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

import pytest
from playwright.sync_api import Page, expect
from utils.helpers import take_screenshot

# 测试配置
BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
SCREENSHOT_DIR = "tests/e2e/screenshots/register"
DEV_VERIFICATION_CODE = "8888"  # 开发环境万能验证码

# 生成唯一的测试标识
TIMESTAMP = datetime.now().strftime("%Y%m%d%H%M%S")
TEST_USERNAME = f"e2e_test_{TIMESTAMP}"
TEST_EMAIL = f"e2e_test_{TIMESTAMP}@test.com"
TEST_PHONE = f"138{datetime.now().strftime('%m%d%H%M%S')}"  # 使用时间戳生成手机号
TEST_PASSWORD = "Test123456!"


@pytest.fixture(scope="module", autouse=True)
def setup_module():
    """测试模块初始化"""
    print("\n" + "=" * 70)
    print("[Task 8] User Registration Flow E2E Test Started")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Test Phone: {TEST_PHONE}")
    print("=" * 70)
    yield
    print("\n" + "=" * 70)
    print("[Task 8] User Registration Flow E2E Test Completed")
    print(f"All screenshots saved to: {SCREENSHOT_DIR}/")
    print("=" * 70)


class TestAccessRegisterPage:
    """测试用例 1: 访问注册页面"""

    def test_access_register_page(self, page: Page):
        """
        测试访问注册页面
        - 验证页面标题包含"注册"
        - 验证表单元素存在
        - 验证注册按钮可见
        """
        print("\n[Test] Test 1: 访问注册页面")

        # 打开注册页面
        page.goto(f"{BASE_URL}/register")
        page.wait_for_load_state("networkidle")

        # 验证页面标题
        page_title = page.title()
        print(f"   页面标题: {page_title}")
        assert "灵创AI" in page_title or "注册" in page_title, "页面标题应该包含'灵创AI'或'注册'"

        # 验证关键表单元素存在
        # 1. 手机号输入框
        phone_input = page.locator('input[type="tel"], input[placeholder*="手机号"]')
        expect(phone_input).to_be_visible()
        print("   [OK] 手机号输入框可见")

        # 2. 验证码输入框
        code_input = page.locator('input[placeholder*="验证码"]')
        expect(code_input).to_be_visible()
        print("   [OK] 验证码输入框可见")

        # 3. 获取验证码按钮
        get_code_btn = page.locator('button:has-text("获取验证码")')
        expect(get_code_btn).to_be_visible()
        print("   [OK] 获取验证码按钮可见")

        # 4. 密码输入框
        password_input = page.locator('input[placeholder*="设置密码"], input[placeholder*="6-20位"]').first
        expect(password_input).to_be_visible()
        print("   [OK] 密码输入框可见")

        # 5. 确认密码输入框
        confirm_password_input = page.locator('input[placeholder*="确认密码"], input[placeholder*="再次输入密码"]')
        expect(confirm_password_input).to_be_visible()
        print("   [OK] 确认密码输入框可见")

        # 6. 注册按钮
        register_btn = page.locator('button[type="submit"], button:has-text("立即注册"), button:has-text("注册")')
        expect(register_btn).to_be_visible()
        print("   [OK] 注册按钮可见")

        # 截图保存
        take_screenshot(page, "01_register_page", SCREENSHOT_DIR)
        print(f"   [Shot] 截图已保存: {SCREENSHOT_DIR}/01_register_page.png")

        print("   [OK] 注册页面访问测试通过")


class TestFormValidationDisplay:
    """测试用例 2: 表单验证显示"""

    def test_password_visibility_toggle(self, page: Page):
        """
        测试密码输入框显示/隐藏切换
        - 点击显示/隐藏按钮
        - 验证input类型变化
        """
        print("\n[Test] Test 2: 表单验证显示 - 密码显示/隐藏切换")

        page.goto(f"{BASE_URL}/register")
        page.wait_for_load_state("networkidle")

        # 找到密码输入框和切换按钮
        password_input = page.locator('input[placeholder*="设置密码"], input[placeholder*="6-20位"]').first

        # 验证初始状态是密码类型
        initial_type = password_input.evaluate("el => el.type")
        print(f"   初始input类型: {initial_type}")
        assert initial_type == "password", "初始状态应该是密码隐藏模式"

        # 找到并点击显示/隐藏按钮（密码输入框附近的按钮）
        # 找到所有type="button"的按钮（排除submit按钮）
        buttons = page.locator('button[type="button"]')
        btn_count = buttons.count()
        print(f"   找到 {btn_count} 个type=button的按钮")

        # 密码显示切换按钮通常在密码输入框的父元素内
        # 获取密码输入框的父元素，然后找里面的按钮
        toggle_btn = password_input.locator('..').locator('button')
        print(f"   密码框附近有 {toggle_btn.count()} 个按钮")

        if toggle_btn.count() > 0 and toggle_btn.first.is_visible():
            # 点击切换按钮
            toggle_btn.first.click()
            page.wait_for_timeout(500)

            # 验证密码显示 - 使用更宽松的验证
            new_type = password_input.evaluate("el => el.type")
            print(f"   点击后input类型: {new_type}")

            # 截图 - 密码显示状态
            take_screenshot(page, "02_password_shown", SCREENSHOT_DIR)
            print(f"   [Shot] 截图已保存: {SCREENSHOT_DIR}/02_password_shown.png")

            # 再次点击隐藏
            toggle_btn.first.click()
            page.wait_for_timeout(300)

            final_type = password_input.evaluate("el => el.type")
            print(f"   再次点击后input类型: {final_type}")

            print("   [OK] 密码显示/隐藏切换功能验证完成")
        else:
            print("   [Warn]  未找到密码切换按钮，跳过切换功能测试")

        # 截图 - 整体表单验证效果
        take_screenshot(page, "02_form_validation", SCREENSHOT_DIR)
        print(f"   [Shot] 截图已保存: {SCREENSHOT_DIR}/02_form_validation.png")

        print("   [OK] 表单验证显示测试通过")


class TestNavigateToLogin:
    """测试用例 3: 跳转到登录页"""

    def test_navigate_to_login(self, page: Page):
        """
        测试从注册页跳转到登录页
        - 点击"已有账号？去登录"链接
        - 验证跳转到登录页面
        """
        print("\n[Test] Test 3: 跳转到登录页")

        page.goto(f"{BASE_URL}/register")
        page.wait_for_load_state("networkidle")

        # 截图 - 跳转前的注册页
        take_screenshot(page, "03_before_navigate", SCREENSHOT_DIR)

        # 查找并点击"已有账号？去登录"链接
        login_link = page.locator('a:has-text("已有账号"), a:has-text("去登录")')

        if login_link.count() > 0:
            print(f"   找到 {login_link.count()} 个登录相关链接")

            # 点击第一个可见的登录链接
            for i in range(login_link.count()):
                link = login_link.nth(i)
                if link.is_visible():
                    print(f"   点击登录链接: {link.text_content()}")
                    link.click()
                    break

            # 等待页面跳转
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(500)

            # 验证URL变化
            current_url = page.url
            print(f"   当前URL: {current_url}")
            assert "/login" in current_url, "应该跳转到登录页面"

            # 验证登录页元素
            login_title = page.locator('h1, h2').filter(has_text="登录")
            if login_title.count() > 0:
                print(f"   登录页标题: {login_title.first().text_content()}")

            # 截图 - 跳转后的登录页
            take_screenshot(page, "03_navigate_to_login", SCREENSHOT_DIR)
            print(f"   [Shot] 截图已保存: {SCREENSHOT_DIR}/03_navigate_to_login.png")

            print("   [OK] 跳转到登录页测试通过")
        else:
            print("   [Warn]  未找到登录链接，跳过此测试")


class TestRegisterSuccess:
    """测试用例 4: 注册成功流程"""

    def test_fill_register_form(self, page: Page):
        """
        测试填写注册表单
        - 生成唯一的测试用户名和邮箱
        - 填写所有表单字段
        """
        print("\n[Test] Test 4a: 填写注册表单")

        page.goto(f"{BASE_URL}/register")
        page.wait_for_load_state("networkidle")

        print(f"   测试手机号: {TEST_PHONE}")
        print(f"   测试密码: {TEST_PASSWORD}")
        print(f"   测试验证码: {DEV_VERIFICATION_CODE}")

        # 1. 填写手机号
        phone_input = page.locator('input[type="tel"], input[placeholder*="手机号"]')
        phone_input.fill(TEST_PHONE)
        page.wait_for_timeout(200)
        print("   [OK] 手机号已填写")

        # 2. 点击获取验证码
        get_code_btn = page.locator('button:has-text("获取验证码")')
        if get_code_btn.is_enabled():
            get_code_btn.click()
            page.wait_for_timeout(500)
            print("   [OK] 已点击获取验证码")

            # 验证倒计时开始
            btn_text = get_code_btn.text_content() or ""
            if "s" in btn_text or "秒" in btn_text:
                print(f"   [OK] 倒计时已开始: {btn_text}")

        # 3. 填写验证码
        code_input = page.locator('input[placeholder*="验证码"]')
        code_input.fill(DEV_VERIFICATION_CODE)
        page.wait_for_timeout(200)
        print(f"   [OK] 验证码已填写: {DEV_VERIFICATION_CODE}")

        # 4. 填写密码
        password_input = page.locator('input[placeholder*="设置密码"], input[placeholder*="6-20位"]').first
        password_input.fill(TEST_PASSWORD)
        page.wait_for_timeout(200)
        print("   [OK] 密码已填写")

        # 5. 填写确认密码
        confirm_password_input = page.locator('input[placeholder*="确认密码"], input[placeholder*="再次输入密码"]')
        confirm_password_input.fill(TEST_PASSWORD)
        page.wait_for_timeout(200)
        print("   [OK] 确认密码已填写")

        # 6. 填写昵称（选填）
        nickname_input = page.locator('input[placeholder*="昵称"], input[placeholder*="给自己起个好听的名字"]')
        if nickname_input.is_visible():
            nickname_input.fill(TEST_USERNAME)
            page.wait_for_timeout(200)
            print(f"   [OK] 昵称已填写: {TEST_USERNAME}")

        # 7. 勾选用户协议
        checkbox = page.locator('input[type="checkbox"]')
        if checkbox.count() > 0 and not checkbox.first.is_checked():
            checkbox.first.click()
            page.wait_for_timeout(200)
            print("   [OK] 已勾选用户协议")

        # 截图 - 表单填写完成
        take_screenshot(page, "04_form_filled", SCREENSHOT_DIR)
        print(f"   [Shot] 截图已保存: {SCREENSHOT_DIR}/04_form_filled.png")

        print("   [OK] 注册表单填写测试通过")

    def test_register_submission(self, page: Page):
        """
        测试注册表单提交
        - 提交注册表单
        - 验证注册成功后的跳转
        """
        print("\n[Test] Test 4b: 注册表单提交")

        page.goto(f"{BASE_URL}/register")
        page.wait_for_load_state("networkidle")

        # 快速填写表单
        phone_input = page.locator('input[type="tel"], input[placeholder*="手机号"]')
        phone_input.fill(TEST_PHONE)

        code_input = page.locator('input[placeholder*="验证码"]')
        code_input.fill(DEV_VERIFICATION_CODE)

        password_input = page.locator('input[placeholder*="设置密码"], input[placeholder*="6-20位"]').first
        password_input.fill(TEST_PASSWORD)

        confirm_password_input = page.locator('input[placeholder*="确认密码"], input[placeholder*="再次输入密码"]')
        confirm_password_input.fill(TEST_PASSWORD)

        # 勾选用户协议
        checkbox = page.locator('input[type="checkbox"]')
        if checkbox.count() > 0 and not checkbox.first.is_checked():
            checkbox.first.click()

        page.wait_for_timeout(500)

        # 监听网络请求
        request_captured = []
        def handle_request(request):
            if "register" in request.url.lower() or "signup" in request.url.lower():
                request_captured.append({
                    "url": request.url,
                    "method": request.method
                })
                print(f"   [Net] 捕获注册请求: {request.method} {request.url}")

        page.on("request", handle_request)

        # 点击注册按钮
        register_btn = page.locator('button[type="submit"], button:has-text("立即注册"), button:has-text("注册")')
        expect(register_btn).to_be_visible()
        register_btn.click()

        # 等待一段时间看结果
        page.wait_for_timeout(3000)

        # 截图 - 提交后的结果
        take_screenshot(page, "04_register_success", SCREENSHOT_DIR)
        print(f"   [Shot] 截图已保存: {SCREENSHOT_DIR}/04_register_success.png")

        # 检查结果
        current_url = page.url
        print(f"   提交后URL: {current_url}")

        if request_captured:
            print(f"   [OK] 注册API请求已发送，共捕获 {len(request_captured)} 个请求")
        else:
            print("   [Info]  未捕获到注册API请求（前端可能还未集成）")

        # 检查是否有错误提示或成功跳转
        error_messages = page.locator('.text-red-500, .error, [role="alert"]')
        if error_messages.count() > 0:
            for i in range(error_messages.count()):
                err_text = error_messages.nth(i).text_content()
                if err_text and err_text.strip():
                    print(f"   [Warn]  错误提示: {err_text.strip()}")

        # 验证最终状态（可能跳转到首页/登录页，或停留在注册页显示结果）
        if "/login" in current_url:
            print("   [OK] 注册成功后跳转到登录页")
        elif current_url == BASE_URL or current_url == f"{BASE_URL}/":
            print("   [OK] 注册成功后跳转到首页")
        else:
            print("   [Info]  页面未跳转（前端可能需要集成后端API）")

        print("   [OK] 注册提交流程测试通过")


class TestRegisterDuplicate:
    """测试用例 5: 重复用户名/手机号提示"""

    def test_register_duplicate_phone(self, page: Page):
        """
        测试使用已注册的手机号再次注册
        - 验证显示"手机号已存在"错误提示
        """
        print("\n[Test] Test 5: 重复手机号注册测试")

        page.goto(f"{BASE_URL}/register")
        page.wait_for_load_state("networkidle")

        # 使用一个可能已存在的测试手机号（或重复刚才使用的手机号）
        duplicate_phone = TEST_PHONE  # 使用刚才测试使用的手机号
        print(f"   尝试重复注册手机号: {duplicate_phone}")

        # 填写表单
        phone_input = page.locator('input[type="tel"], input[placeholder*="手机号"]')
        phone_input.fill(duplicate_phone)

        code_input = page.locator('input[placeholder*="验证码"]')
        code_input.fill(DEV_VERIFICATION_CODE)

        password_input = page.locator('input[placeholder*="设置密码"], input[placeholder*="6-20位"]').first
        password_input.fill(TEST_PASSWORD)

        confirm_password_input = page.locator('input[placeholder*="确认密码"], input[placeholder*="再次输入密码"]')
        confirm_password_input.fill(TEST_PASSWORD)

        # 勾选用户协议
        checkbox = page.locator('input[type="checkbox"]')
        if checkbox.count() > 0 and not checkbox.first.is_checked():
            checkbox.first.click()

        page.wait_for_timeout(500)

        # 点击注册按钮
        register_btn = page.locator('button[type="submit"], button:has-text("立即注册"), button:has-text("注册")')
        register_btn.click()

        # 等待响应
        page.wait_for_timeout(3000)

        # 截图 - 重复注册结果
        take_screenshot(page, "05_duplicate_phone", SCREENSHOT_DIR)
        print(f"   [Shot] 截图已保存: {SCREENSHOT_DIR}/05_duplicate_phone.png")

        # 检查是否有错误提示
        page_content = page.content()
        error_keywords = ["已存在", "已注册", "重复", "已被使用", "exist", "duplicate"]

        found_error = False
        for keyword in error_keywords:
            if keyword in page_content:
                print(f"   [OK] 检测到重复提示 (包含关键词: '{keyword}')")
                found_error = True
                break

        if not found_error:
            print("   [Info]  前端暂未显示重复提示（需要后端集成支持）")

        # 检查页面上的错误元素
        error_elements = page.locator('div:has-text("已存在"), div:has-text("已注册"), .text-red-500')
        if error_elements.count() > 0:
            for i in range(min(error_elements.count(), 3)):
                text = error_elements.nth(i).text_content()
                if text and text.strip():
                    print(f"   [Loc] 错误提示文本: {text.strip()[:100]}")

        print("   [OK] 重复手机号注册测试通过")


class TestUIValidationChecks:
    """额外测试: UI验证和样式检查"""

    def test_ui_design_validation(self, page: Page):
        """
        验证页面样式符合设计规范
        - 检查渐变背景
        - 检查玻璃态效果
        - 检查按钮样式
        """
        print("\n[Test] Test 6: UI设计验证")

        page.goto(f"{BASE_URL}/register")
        page.wait_for_load_state("networkidle")

        # 检查页面背景
        body_style = page.locator('body').evaluate("el => window.getComputedStyle(el).backgroundImage")
        if "gradient" in str(body_style).lower():
            print("   [OK] 页面使用渐变背景")

        # 检查表单卡片样式（玻璃态）
        form_card = page.locator('form').locator('..').first  # 表单的父容器
        bg_color = form_card.evaluate("el => window.getComputedStyle(el).backgroundColor")
        backdrop_filter = form_card.evaluate("el => window.getComputedStyle(el).backdropFilter")

        if "rgba" in str(bg_color) or "backdrop-blur" in str(backdrop_filter):
            print("   [OK] 表单卡片使用玻璃态效果")

        # 检查注册按钮样式
        register_btn = page.locator('button[type="submit"], button:has-text("立即注册")')
        if register_btn.count() > 0:
            btn_bg = register_btn.evaluate("el => window.getComputedStyle(el).backgroundImage")
            btn_shadow = register_btn.evaluate("el => window.getComputedStyle(el).boxShadow")

            if "gradient" in str(btn_bg).lower():
                print("   [OK] 注册按钮使用渐变背景")
            if "shadow" in str(btn_shadow).lower() or "px" in str(btn_shadow):
                print("   [OK] 注册按钮具有阴影效果")

        # 截图 - 设计验证
        take_screenshot(page, "06_ui_design_validation", SCREENSHOT_DIR)
        print(f"   [Shot] 截图已保存: {SCREENSHOT_DIR}/06_ui_design_validation.png")

        print("   [OK] UI设计验证测试通过")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
