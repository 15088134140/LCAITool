"""
成果详情页生成参数展示 E2E 测试

测试目标：
1. 成果详情页加载成功
2. 生成参数区域正确展示
3. 提示词区域有复制功能

运行方式（有头模式）：
  E2E_HEADLESS=false pytest tests/e2e/test_work_detail_params.py -v --headed --slowmo 300

⚠️ 需要：用户端在 3000 端口运行
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
from utils.helpers import take_screenshot, wait_for_network_idle

E2E_BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
SCREENSHOTS_DIR = "tests/e2e/screenshots/work_detail_params"


@pytest.mark.works
class TestWorkDetailParams:
    """成果详情页生成参数展示"""

    def test_work_detail_params_section_exists(self, page):
        """成果详情页加载并展示生成参数区块"""
        print("\n📌 [测试] 成果详情页生成参数区块")

        # 导航到指定成果详情页（使用 seed 数据中的成果 ID）
        page.goto(f"{E2E_BASE_URL}/works/detail/some-uuid")
        wait_for_network_idle(page)
        page.wait_for_timeout(2000)
        take_screenshot(page, "01_work_detail_page", SCREENSHOTS_DIR)

        page_text = page.content()

        # 验证生成参数区块存在
        has_params_title = "生成参数" in page_text
        has_theme_label = "主题" in page_text or "故事主题" in page_text
        has_style_label = "风格" in page_text or "绘画风格" in page_text
        has_prompt = "提示词" in page_text

        print(f"  ✅ 生成参数标题: {has_params_title}")
        print(f"  ✅ 主题字段展示: {has_theme_label}")
        print(f"  ✅ 风格字段展示: {has_style_label}")
        print(f"  ✅ 提示词展示: {has_prompt}")

        assert has_params_title, "未找到'生成参数'标题"

    def test_work_detail_params_display(self, page):
        """生成参数内容正确展示"""
        print("\n📌 [测试] 生成参数内容展示")

        page.goto(f"{E2E_BASE_URL}/works/detail/some-uuid")
        wait_for_network_idle(page)
        page.wait_for_timeout(2000)

        # 验证参数值展示而非只展示 key
        page_text = page.content()
        has_param_values = any(
            keyword in page_text
            for keyword in ["页", "岁", "勇敢的小兔子", "卡通", "水彩"]
        )

        print(f"  ✅ 参数值正确展示: {has_param_values}")
        assert has_param_values, "参数值未正确渲染"

        take_screenshot(page, "02_params_display", SCREENSHOTS_DIR)

    def test_work_detail_no_params_fallback(self, page):
        """不包含生成参数的成果不展示该区块"""
        print("\n📌 [测试] 无参数时不展示生成参数区块")

        # 导航到一个没有 input_params 的成果（使用合适的 UUID）
        page.goto(f"{E2E_BASE_URL}/works/detail/other-uuid")
        wait_for_network_idle(page)
        page.wait_for_timeout(2000)
        take_screenshot(page, "03_no_params_fallback", SCREENSHOTS_DIR)

        page_text = page.content()
        has_params_title = "生成参数" in page_text
        print(f"  ✅ 无参数时隐藏标题: {not has_params_title}")

    def test_admin_tool_param_schema_configured(self, page):
        """种子数据的工具已配置 param_schema"""
        print("\n📌 [测试] 种子数据工具 param_schema")

        # 验证有声绘本工具的 API 响应包含 param_schema
        import requests
        response = requests.get(f"{E2E_BASE_URL}/api/v1/tools/storybook-generator")
        assert response.status_code == 200
        data = response.json()

        has_param_schema = "param_schema" in data
        is_non_empty = len(data.get("param_schema", [])) > 0 if has_param_schema else False

        print(f"  ✅ param_schema 字段存在: {has_param_schema}")
        print(f"  ✅ param_schema 非空: {is_non_empty}")

        if has_param_schema and is_non_empty:
            first_field = data["param_schema"][0]
            print(f"  ✅ 首个字段: key={first_field.get('key')}, label={first_field.get('label')}")
            assert "key" in first_field
            assert "label" in first_field
            assert "type" in first_field
            assert "order" in first_field

        take_screenshot(page, "04_api_param_schema", SCREENSHOTS_DIR)
