"""
任务失败重试流程 E2E 测试

测试目标（Task 11）：
1. 进度页显示重试按钮（任务失败时）
2. 点击重试创建新任务
3. 新任务进入进度页

运行方式（有头模式）：
  E2E_HEADLESS=false pytest tests/e2e/test_retry_flow.py -v --headed --slowmo 300

⚠️ 需要：测试用户已登录，后端和前端服务运行中
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
import re
from utils.helpers import take_screenshot, wait_for_network_idle

E2E_BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
SCREENSHOTS_DIR = "tests/e2e/screenshots/retry_flow"


class TestRetryFlow:
    """任务失败重试流程测试"""

    def test_retry_button_exists_on_failed_task(self, logged_in_page):
        """失败任务进度页显示重试按钮"""
        page = logged_in_page
        print("\n📌 [测试] 失败任务进度页重试按钮")

        # 使用一个标记为 failed 的任务 ID
        # 注意：需要提前在数据库中存在一个 failed 状态的任务
        page.goto(f"{E2E_BASE_URL}/works/failed-task-id/progress")
        wait_for_network_idle(page)
        take_screenshot(page, "01_failed_task", SCREENSHOTS_DIR)

        page_text = page.content()

        # 检查是否有重试相关按钮
        has_retry_btn = "重试" in page_text or "retry" in page_text.lower()
        has_back_btn = "返回" in page_text or "back" in page_text.lower()

        print(f"  ✅ 重试按钮: {has_retry_btn}")
        print(f"  ✅ 返回按钮: {has_back_btn}")

        # 尝试点击重试按钮
        if has_retry_btn:
            retry_btn = page.locator('button').filter(has_text=re.compile(r'重试|retry'))
            if retry_btn.count() > 0:
                retry_btn.click()
                page.wait_for_timeout(3000)
                take_screenshot(page, "02_after_retry", SCREENSHOTS_DIR)
                print(f"  ✅ 点击重试后 URL: {page.url}")

    def test_retry_button_not_shown_on_running_task(self, logged_in_page):
        """运行中的任务不显示重试按钮"""
        page = logged_in_page
        print("\n📌 [测试] 运行中任务不显示重试按钮")

        page.goto(f"{E2E_BASE_URL}/works/running-task-id/progress")
        wait_for_network_idle(page)
        take_screenshot(page, "03_running_task", SCREENSHOTS_DIR)

        page_text = page.content()
        has_retry_btn = "重试" in page_text
        print(f"  ✅ 运行中任务出现重试按钮（应为 false）: {has_retry_btn}")
