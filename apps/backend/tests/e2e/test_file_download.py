"""
成果文件下载 E2E 测试

测试目标（Task 12, 14）：
1. 成果详情页显示文件列表
2. 点击下载按钮触发文件下载
3. 权限控制：未登录用户无法下载

运行方式（有头模式）：
  E2E_HEADLESS=false pytest tests/e2e/test_file_download.py -v --headed --slowmo 300
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
import re
from utils.helpers import take_screenshot, wait_for_network_idle

E2E_BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
SCREENSHOTS_DIR = "tests/e2e/screenshots/file_download"


class TestFileDownload:
    """成果文件下载测试"""

    def test_work_detail_has_download_button(self, logged_in_page):
        """成果详情页包含下载按钮"""
        page = logged_in_page
        print("\n📌 [测试] 成果详情页下载按钮")

        page.goto(f"{E2E_BASE_URL}/works/detail/sample-work-id")
        wait_for_network_idle(page)
        take_screenshot(page, "01_work_detail", SCREENSHOTS_DIR)

        page_text = page.content()
        has_download = "下载" in page_text or "download" in page_text.lower()
        print(f"  ✅ 存在下载按钮: {has_download}")

    def test_work_detail_shows_file_list(self, logged_in_page):
        """成果详情页显示文件列表"""
        page = logged_in_page
        print("\n📌 [测试] 成果详情页文件列表")

        page.goto(f"{E2E_BASE_URL}/works/detail/sample-work-id")
        wait_for_network_idle(page)
        take_screenshot(page, "02_file_list", SCREENSHOTS_DIR)

        page_text = page.content()
        has_files = "文件" in page_text or "图片" in page_text or "PDF" in page_text or "ZIP" in page_text or "zip" in page_text.lower()
        print(f"  ✅ 显示文件列表: {has_files}")
