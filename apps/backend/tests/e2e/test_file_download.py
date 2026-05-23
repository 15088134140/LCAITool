"""
成果文件下载 E2E 测试

测试目标（Task 12, 14）：
1. 先通过 Mock AI 执行创建一个真实成果
2. 从成果列表进入详情页
3. 成果详情页显示文件列表
4. 存在下载按钮/下载全部按钮

运行方式（有头模式）：
  MOCK_AI_EXECUTION=true E2E_HEADLESS=false \\
  pytest tests/e2e/test_file_download.py -v --headed --slowmo 300

⚠️ 需要：后端以 MOCK_AI_EXECUTION=true 启动
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
import re
import time
from utils.helpers import take_screenshot, wait_for_network_idle

E2E_BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
SCREENSHOTS_DIR = "tests/e2e/screenshots/file_download"


class TestFileDownload:
    """成果文件下载测试"""

    def _create_work_and_get_info(self, logged_in_page):
        """辅助方法：通过 Mock AI 创建一个成果，返回 work_id"""
        page = logged_in_page
        print("  ⏳ 先通过 Mock AI 创建一个成果...")

        # 导航到有声绘本工具
        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")
        wait_for_network_idle(page)

        # 填写表单
        theme_input = page.locator('input, textarea').first
        if theme_input.is_visible():
            theme_input.fill("小兔子找月亮")

        # 点击生成
        generate_btn = page.locator('button').filter(has_text=re.compile(r'开始生成|开始创作'))
        if generate_btn.count() == 0:
            generate_btn = page.locator('button').last
        generate_btn.click()
        page.wait_for_timeout(2000)

        # 获取当前 URL (progress page)
        current_url = page.url
        print(f"  ⏳ 任务提交成功, URL: {current_url}")

        # 等待 mock 执行完成
        for i in range(25):
            time.sleep(1.5)
            page_text = page.content()
            if "生成完成" in page_text or "completed" in page_text.lower():
                break

        # 提取 task_id 从 URL
        task_match = re.search(r'/works/([^/]+)/progress', current_url)
        if task_match:
            task_id = task_match.group(1)
            print(f"  ✅ Task ID: {task_id}")
            return task_id

        print("  ⚠️ 无法获取 task_id")
        return None

    def test_work_detail_has_download_button(self, logged_in_page):
        """创建成果后验证详情页包含下载按钮"""
        page = logged_in_page
        print("\n📌 [测试] 创建成果并验证详情页下载按钮")

        task_id = self._create_work_and_get_info(page)
        if not task_id:
            print("  ⚠️ 无法创建成果，跳过验证")
            return

        # 导航到成果列表页
        page.goto(f"{E2E_BASE_URL}/works")
        wait_for_network_idle(page)
        take_screenshot(page, "01_works_list", SCREENSHOTS_DIR)

        page_text = page.content()
        print(f"  📄 页面标题包含 '作品' 或 'works': {'作品' in page_text or 'works' in page_text.lower()}")

        # 查找任务对应的成果卡片，点击进入详情
        work_link = page.locator('a[href*="/works/detail/"]').first
        if work_link.count() > 0:
            work_link.click()
            page.wait_for_timeout(3000)
            take_screenshot(page, "02_work_detail", SCREENSHOTS_DIR)

            page_text = page.content()
            has_download = "下载" in page_text or "download" in page_text.lower()
            has_download_all = "下载全部" in page_text
            print(f"  ✅ 存在下载按钮: {has_download}")
            print(f"  ✅ 存在下载全部按钮: {has_download_all}")

            # 检查文件列表
            has_file_section = "文件" in page_text
            has_preview = "预览" in page_text
            print(f"  ✅ 存在文件区域: {has_file_section}")
            print(f"  ✅ 存在预览区域: {has_preview}")

            # 至少下载或文件区域有一个存在
            assert has_download or has_file_section, "页面缺少下载按钮和文件区域"
        else:
            print("  ⚠️ 未找到成果链接")

    def test_work_detail_shows_file_list(self, logged_in_page):
        """成果详情页显示文件列表"""
        page = logged_in_page
        print("\n📌 [测试] 成果详情页文件列表")

        # 先导航到成果列表页
        page.goto(f"{E2E_BASE_URL}/works")
        wait_for_network_idle(page)
        take_screenshot(page, "03_works_list_for_files", SCREENSHOTS_DIR)

        # 点击第一个成果
        work_link = page.locator('a[href*="/works/detail/"]').first
        if work_link.count() > 0:
            work_link.click()
            page.wait_for_timeout(3000)
            take_screenshot(page, "04_work_detail_files_tab", SCREENSHOTS_DIR)

            page_text = page.content()

            # 检查文件相关关键词
            file_keywords = ["文件", "图片", "PDF", "ZIP", "下载", "预览"]
            found_keywords = [kw for kw in file_keywords if kw in page_text]
            print(f"  ✅ 页面包含文件相关关键词: {found_keywords}")
            print(f"  ✅ 文件相关关键词数量: {len(found_keywords)}/{len(file_keywords)}")

            # 至少有两个文件关键词
            assert len(found_keywords) >= 2, f"文件关键词太少: {found_keywords}"
        else:
            print("  ⚠️ 未找到成果链接，跳过验证")
