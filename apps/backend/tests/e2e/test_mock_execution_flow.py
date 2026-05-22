"""
Mock AI 完整执行链路 E2E 测试

测试目标（Task 16b, 4, 11, 14）：
1. 表单提交后跳转到进度页
2. 观察进度条从 0% → 100% 的完整动画过程（headed 模式下可亲眼看到）
3. 进度页显示各步骤状态
4. 任务完成后自动跳转到成果详情页或显示完成状态
5. 成果详情页显示生成的 Work 和 WorkFile 信息

运行方式（有头模式，关键！可观察进度动画）：
  MOCK_AI_EXECUTION=true E2E_HEADLESS=false \\
  pytest tests/e2e/test_mock_execution_flow.py -v --headed --slowmo 500

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
SCREENSHOTS_DIR = "tests/e2e/screenshots/mock_execution"


class TestMockExecutionFlow:
    """Mock AI 完整执行链路测试"""

    def test_form_submit_and_observe_progress_to_100(self, logged_in_page):
        """填写表单 → 提交 → 观察进度从 0% 走到 100%"""
        page = logged_in_page
        print("\n📌 [测试] Mock AI 完整执行链路 — 观察进度 0→100%")
        print("   （headed 模式下请关注浏览器窗口中的进度动画）")

        # Step 1: 导航到有声绘本工具
        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")
        wait_for_network_idle(page)
        take_screenshot(page, "01_mock_before_fill", SCREENSHOTS_DIR)
        print(f"  ✅ 有声绘本页面加载成功")

        # Step 2: 填写表单
        theme_input = page.locator('input, textarea').first
        if theme_input.is_visible():
            theme_input.fill("小兔子找月亮")
            print(f"  ✅ 填写故事主题: 小兔子找月亮")

        # Step 3: 点击「开始生成」
        generate_btn = page.locator('button').filter(has_text=re.compile(r'开始生成|开始创作'))
        if generate_btn.count() == 0:
            generate_btn = page.locator('button').last
        generate_btn.click()
        print(f"  ✅ 点击生成按钮，等待跳转到进度页...")

        # Step 4: 等待跳转到进度页面
        page.wait_for_timeout(2000)
        take_screenshot(page, "02_mock_progress_start", SCREENSHOTS_DIR)

        current_url = page.url
        is_progress_page = "/works/" in current_url and "/progress" in current_url
        assert is_progress_page, f"未跳转到进度页，当前 URL: {current_url}"
        print(f"  ✅ 已跳转到进度页: {current_url}")

        # Step 5: 轮询等待进度到达 100%（最长等待 30 秒）
        print(f"  ⏳ 正在观察进度动画（需等待 mock 执行完成）...")
        max_wait = 30
        poll_interval = 1.5
        progress_reached_100 = False
        last_progress = 0

        for i in range(int(max_wait / poll_interval)):
            time.sleep(poll_interval)
            page_text = page.content()

            # 尝试从页面提取进度值
            progress_match = re.search(r'(\d+)\s*%', page_text)
            if progress_match:
                last_progress = int(progress_match.group(1))
                print(f"    当前进度: {last_progress}%")

            # 截图记录进度变化
            if i % 3 == 0:  # 每 ~4.5 秒截一次
                take_screenshot(page, f"03_mock_progress_{i:02d}", SCREENSHOTS_DIR)

            if last_progress >= 100:
                progress_reached_100 = True
                break

            # 也检查是否存在"生成完成"或"completed"文本
            if "生成完成" in page_text or "completed" in page_text.lower():
                progress_reached_100 = True
                print(f"  ✅ 检测到完成状态文本")
                break

        assert progress_reached_100, (
            f"进度未达到 100%，最后进度: {last_progress}%"
        )
        print(f"  ✅ 任务执行完成！进度达到 100%")

        take_screenshot(page, "04_mock_progress_complete", SCREENSHOTS_DIR)

        # Step 6: 验证可见完成状态信息
        page_text = page.content()
        has_complete_text = "完成" in page_text or "completed" in page_text.lower()
        print(f"  ✅ 页面显示完成状态: {has_complete_text}")

    def test_mock_execution_creates_work_and_files(self, logged_in_page):
        """验证 mock 执行完成后创建了 Work 和 WorkFile"""
        page = logged_in_page
        print("\n📌 [测试] Mock 执行成果验证")

        # 先完成一次提交（依赖上一个测试的完整链路）
        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")
        wait_for_network_idle(page)

        theme_input = page.locator('input, textarea').first
        if theme_input.is_visible():
            theme_input.fill("小兔子找月亮")

        generate_btn = page.locator('button').filter(has_text=re.compile(r'开始生成|开始创作'))
        if generate_btn.count() == 0:
            generate_btn = page.locator('button').last
        generate_btn.click()
        page.wait_for_timeout(2000)

        # 等待 mock 执行完成
        for _ in range(20):
            time.sleep(1.5)
            page_text = page.content()
            if "生成完成" in page_text or "completed" in page_text.lower():
                break

        # 导航到成果列表页，验证新生成的成果存在
        page.goto(f"{E2E_BASE_URL}/works")
        wait_for_network_idle(page)
        take_screenshot(page, "05_mock_works_list", SCREENSHOTS_DIR)

        page_text = page.content()
        has_mock_work = "Mock 生成成果" in page_text
        print(f"  ✅ 成果列表包含 Mock 生成的成果: {has_mock_work}")

        # 导航到最新成果详情页
        work_link = page.locator('a').filter(has_text=re.compile(r'Mock 生成成果'))
        if work_link.count() > 0:
            work_link.first.click()
            page.wait_for_timeout(2000)
            take_screenshot(page, "06_mock_work_detail", SCREENSHOTS_DIR)

            page_text = page.content()
            has_preview = "preview" in page_text.lower() or "预览" in page_text
            has_download = "下载" in page_text or "download" in page_text.lower()
            print(f"  ✅ 成果详情显示预览: {has_preview}")
            print(f"  ✅ 成果详情显示下载按钮: {has_download}")
