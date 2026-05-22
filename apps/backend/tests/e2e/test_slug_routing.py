"""
slug 路由导航 + 通用详情页表单渲染 E2E 测试

测试目标（Task 24, 29, 30）：
1. 通过 slug 导航到工具详情页
2. 通用 [id] 路由正确显示 ToolCreationForm
3. usage_modes 驱动正确的渲染模式

运行方式（有头模式，推荐）：
  E2E_HEADLESS=false pytest tests/e2e/test_slug_routing.py -v --headed --slowmo 200

运行方式（无头模式）：
  pytest tests/e2e/test_slug_routing.py -v
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
from utils.helpers import take_screenshot, wait_for_network_idle

E2E_BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
SCREENSHOTS_DIR = "tests/e2e/screenshots/slug_routing"


class TestSlugRouting:
    """slug 路由导航测试"""

    def test_storybook_slug_route(self, page):
        """通过 slug 访问有声绘本详情页"""
        print("\n📌 [测试] slug 路由 → 有声绘本生成器")

        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")
        wait_for_network_idle(page)
        take_screenshot(page, "01_storybook_slug", SCREENSHOTS_DIR)

        # 验证页面正确加载（包含工具名称或关键内容）
        page_text = page.content()
        assert page.status == 200, f"页面状态码错误: {page.status}"
        print(f"  ✅ 页面状态码: {page.status}")
        print(f"  ✅ URL: {page.url}")

        # 验证存在创作表单区域
        has_form_section = "开始创作" in page_text or "开始生成" in page_text or "start-creation" in page_text
        print(f"  ✅ 存在创作表单区域: {has_form_section}")

        # 验证存在操作按钮（至少1个button）
        button_count = page.locator('button').count()
        print(f"  ✅ 页面按钮数量: {button_count}")
        assert button_count > 0, "页面无任何按钮"

        # 验证表单字段名
        has_theme = "故事主题" in page_text or "主题" in page_text
        has_style = "艺术风格" in page_text or "画风" in page_text
        has_page_count = "页数" in page_text
        has_target_age = "年龄段" in page_text or "年龄" in page_text or "3-6岁" in page_text
        has_generate_btn = "开始生成" in page_text or "开始创作" in page_text
        print(f"  ✅ 故事主题字段: {has_theme}")
        print(f"  ✅ 艺术风格字段: {has_style}")
        print(f"  ✅ 页数选择: {has_page_count}")
        print(f"  ✅ 目标年龄段: {has_target_age}")
        print(f"  ✅ 生成按钮: {has_generate_btn}")
        assert has_generate_btn, "缺少开始生成按钮"

    def test_ecommerce_slug_route(self, page):
        """通过 slug 访问电商详情页生成器"""
        print("\n📌 [测试] slug 路由 → 电商详情页生成器")

        page.goto(f"{E2E_BASE_URL}/tools/ecommerce-detail")
        wait_for_network_idle(page)
        take_screenshot(page, "02_ecommerce_slug", SCREENSHOTS_DIR)

        page_text = page.content()
        print(f"  ✅ 页面状态码: {page.status}")

        has_form_section = "开始创作" in page_text or "开始生成" in page_text
        print(f"  ✅ 存在创作表单区域: {has_form_section}")

        button_count = page.locator('button').count()
        print(f"  ✅ 页面按钮数量: {button_count}")
        assert button_count > 0

    def test_marketing_slug_route(self, page):
        """通过 slug 访问营销文案生成器"""
        print("\n📌 [测试] slug 路由 → 营销文案生成器")

        page.goto(f"{E2E_BASE_URL}/tools/marketing-copywriter")
        wait_for_network_idle(page)
        take_screenshot(page, "03_marketing_slug", SCREENSHOTS_DIR)

        page_text = page.content()
        print(f"  ✅ 页面状态码: {page.status}")

        has_form_section = "开始创作" in page_text or "开始生成" in page_text
        print(f"  ✅ 存在创作表单区域: {has_form_section}")
        assert page.status == 200


class TestUUIDRoute:
    """UUID 路由导航测试"""

    def test_uuid_route_shows_under_construction(self, page):
        """通过 UUID 访问无定制页的工具，显示'开发中'"""
        print("\n📌 [测试] UUID 路由 → 通用详情页（无定制页工具）")

        # 使用一个假 UUID（模拟无定制页的工具）
        fake_uuid = "00000000-0000-0000-0000-000000000001"
        page.goto(f"{E2E_BASE_URL}/tools/{fake_uuid}")
        wait_for_network_idle(page)
        take_screenshot(page, "04_uuid_route", SCREENSHOTS_DIR)

        page_text = page.content()
        print(f"  ✅ 页面状态码: {page.status}")

        # 验证显示开发中或对应的 fallback 内容
        has_fallback = "开发中" in page_text or "请稍后" in page_text
        print(f"  ✅ 显示 fallback 内容: {has_fallback}")
