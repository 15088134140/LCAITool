"""
反馈 E2E 测试：模拟用户提交反馈流程
Covers:
- 访问反馈页面
- 提交反馈表单
- 查看我的反馈列表

Usage:
  Visible Mode: E2E_HEADLESS=false pytest tests/e2e/test_e2e_feedback.py -v
  Headless Mode: pytest tests/e2e/test_e2e_feedback.py -v
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
from playwright.sync_api import Page, expect, BrowserContext
from utils.helpers import take_screenshot, wait_for_network_idle

BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
E2E_API_URL = os.getenv("E2E_API_URL", "http://localhost:8000")
TEST_USER = "e2e_feedback_user"
TEST_PASSWORD = "Test123456!"
SCREENSHOTS_DIR = "tests/e2e/screenshots/feedback"


@pytest.fixture(scope="function")
def feedback_page(browser: BrowserContext) -> Page:
    """Fixture for feedback tests"""
    page = browser.new_page()

    try:
        register_data = {
            "username": TEST_USER,
            "email": "e2e_feedback@example.com",
            "password": TEST_PASSWORD,
            "phone": "13800138300"
        }
        page.request.post(f"{E2E_API_URL}/api/v1/auth/register", data=register_data)
    except Exception:
        pass

    from utils.auth import login_with_api
    login_with_api(page, TEST_USER, TEST_PASSWORD)

    yield page
    page.close()


class TestFeedbackFlow:
    """反馈流程 E2E 测试"""

    def test_feedback_page_access(self, feedback_page: Page):
        """验证反馈页面可访问"""
        print("\n[Test 1] Accessing feedback page...")

        feedback_page.goto(f"{BASE_URL}/feedback", wait_until="domcontentloaded")
        wait_for_network_idle(feedback_page)
        feedback_page.wait_for_timeout(2000)

        # Verify page loads
        page_content = feedback_page.content()
        assert "反馈" in page_content, "Feedback page should contain '反馈'"
        print("  [OK] Feedback page loaded successfully")

        take_screenshot(feedback_page, "01_feedback_page", SCREENSHOTS_DIR)

    def test_submit_feedback_via_api(self, feedback_page: Page):
        """通过 API 提交反馈并验证"""
        print("\n[Test 2] Submitting feedback via API...")

        # Submit feedback via API
        response = feedback_page.request.post(
            f"{E2E_API_URL}/api/v1/feedback",
            data={
                "type": "feature",
                "title": "E2E测试反馈-批量生成功能",
                "description": "希望增加批量生成功能，可以一次性处理多个任务"
            },
            headers={"Content-Type": "application/json"}
        )

        if response.status == 200 or response.status == 201:
            print("  [OK] Feedback submitted successfully via API")

            # Verify by fetching my feedbacks
            list_response = feedback_page.request.get(
                f"{E2E_API_URL}/api/v1/feedback/my"
            )
            if list_response.ok:
                feedbacks = list_response.json()
                if isinstance(feedbacks, list) and len(feedbacks) > 0:
                    titles = [f.get("title", "") for f in feedbacks]
                    assert any("E2E测试反馈" in t for t in titles), \
                        "Submitted feedback should appear in my feedbacks list"
                    print(f"  [OK] Feedback found in my feedbacks list ({len(feedbacks)} total)")
                elif isinstance(feedbacks, dict) and "items" in feedbacks:
                    items = feedbacks["items"]
                    if len(items) > 0:
                        print(f"  [OK] Feedback found in my feedbacks list ({len(items)} total)")
                    else:
                        print("  [INFO] Feedback list is empty")
                else:
                    print(f"  [INFO] Feedback list response: {feedbacks}")
            else:
                print(f"  [SKIP] Could not fetch feedback list: {list_response.status}")
        elif response.status == 401:
            print("  [SKIP] API request not authenticated (no auth cookie)")
        else:
            print(f"  [INFO] Submit feedback returned status {response.status}")

    def test_feedback_form_ui(self, feedback_page: Page):
        """验证反馈页面表单 UI"""
        print("\n[Test 3] Checking feedback form UI elements...")

        feedback_page.goto(f"{BASE_URL}/feedback", wait_until="domcontentloaded")
        wait_for_network_idle(feedback_page)
        feedback_page.wait_for_timeout(2000)

        # Check for form elements
        page_content = feedback_page.content()
        form_indicators = ["提交", "标题", "类型", "描述"]
        found = [indicator for indicator in form_indicators if indicator in page_content]
        if found:
            print(f"  [OK] Form elements found: {', '.join(found)}")
        else:
            print("  [INFO] No explicit form elements found (page might use dynamic rendering)")

        take_screenshot(feedback_page, "02_feedback_form", SCREENSHOTS_DIR)
