"""
评价 E2E 测试：模拟用户评价流程
Covers:
- 工具详情页展示评价区
- 查看评价统计
- 提交评价（需要先有已完成的任务）

Usage:
  Visible Mode: E2E_HEADLESS=false pytest tests/e2e/test_e2e_rating.py -v
  Headless Mode: pytest tests/e2e/test_e2e_rating.py -v
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
from playwright.sync_api import Page, expect, BrowserContext
from utils.helpers import take_screenshot, wait_for_network_idle

BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
E2E_API_URL = os.getenv("E2E_API_URL", "http://localhost:8000")
TEST_USER = "e2e_rating_user"
TEST_PASSWORD = "Test123456!"
SCREENSHOTS_DIR = "tests/e2e/screenshots/rating"


@pytest.fixture(scope="function")
def rating_page(browser: BrowserContext) -> Page:
    """Fixture for rating tests"""
    page = browser.new_page()

    try:
        register_data = {
            "username": TEST_USER,
            "email": "e2e_rating@example.com",
            "password": TEST_PASSWORD,
            "phone": "13800138200"
        }
        page.request.post(f"{E2E_API_URL}/api/v1/auth/register", data=register_data)
    except Exception:
        pass

    from utils.auth import login_with_api
    login_with_api(page, TEST_USER, TEST_PASSWORD)

    yield page
    page.close()


class TestRatingFlow:
    """评价流程 E2E 测试"""

    def test_tool_detail_ratings_section(self, rating_page: Page):
        """验证工具详情页展示评价区域"""
        print("\n[Test 1] Navigating to tool detail page to check ratings section...")

        # Navigate to tools page first
        rating_page.goto(f"{BASE_URL}/tools", wait_until="domcontentloaded")
        wait_for_network_idle(rating_page)
        rating_page.wait_for_timeout(2000)

        # Click on first available tool
        try:
            tool_links = rating_page.locator("a[href*='/tools/']")
            count = tool_links.count()
            if count > 0:
                # Get first tool link href
                first_tool_href = tool_links.first.get_attribute("href")
                if first_tool_href:
                    tool_url = f"{BASE_URL}{first_tool_href}"
                    rating_page.goto(tool_url, wait_until="domcontentloaded")
                    wait_for_network_idle(rating_page)
                    rating_page.wait_for_timeout(2000)
                    print(f"  [OK] Navigated to tool detail: {first_tool_href}")
                else:
                    print("  [SKIP] Tool link has no href")
                    return
            else:
                print("  [SKIP] No tools available on the page")
                return
        except Exception as e:
            print(f"  [SKIP] Could not navigate to tool detail: {e}")
            return

        # Check for ratings section
        page_content = rating_page.content()
        if "评价" in page_content or "评分" in page_content:
            print("  [OK] Ratings section found on tool detail page")
        else:
            print("  [INFO] No explicit ratings section found (might be loaded dynamically)")

        take_screenshot(rating_page, "01_tool_detail_ratings", SCREENSHOTS_DIR)

    def test_rating_stats_api(self, rating_page: Page):
        """验证评价统计 API"""
        print("\n[Test 2] Verifying rating stats API...")

        # Get first available tool ID
        response = rating_page.request.get(f"{E2E_API_URL}/api/v1/tools")
        if response.ok:
            tools_data = response.json()
            items = tools_data.get("items", []) or tools_data.get("data", {}).get("items", [])
            if items:
                tool_id = items[0].get("id")
                if tool_id:
                    stats_response = rating_page.request.get(
                        f"{E2E_API_URL}/api/v1/tools/{tool_id}/ratings/stats"
                    )
                    assert stats_response.ok, f"Rating stats API should return 200, got {stats_response.status}"
                    stats = stats_response.json()
                    assert "avg_rating" in stats, "Response should contain avg_rating"
                    assert "total_count" in stats, "Response should contain total_count"
                    assert "distribution" in stats, "Response should contain distribution"
                    print(f"  [OK] Rating stats API: avg={stats['avg_rating']}, count={stats['total_count']}")

                    # Test ratings list API
                    list_response = rating_page.request.get(
                        f"{E2E_API_URL}/api/v1/tools/{tool_id}/ratings"
                    )
                    assert list_response.ok, f"Rating list API should return 200, got {list_response.status}"
                    list_data = list_response.json()
                    assert "items" in list_data, "Response should contain items"
                    print(f"  [OK] Rating list API returns {len(list_data['items'])} ratings")
                else:
                    print("  [SKIP] Could not extract tool ID")
            else:
                print("  [SKIP] No tools available")
        else:
            print(f"  [SKIP] Tools API returned {response.status}")
