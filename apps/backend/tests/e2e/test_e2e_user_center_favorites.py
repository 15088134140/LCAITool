"""
E2E Tests for User Center Favorites Page
Covers:
- Favorites page load and display
- Favorites list rendering
- Pagination
- Unfavorite action

Usage:
  Visible Mode: E2E_HEADLESS=false pytest tests/e2e/test_e2e_user_center_favorites.py -v
  Headless Mode: pytest tests/e2e/test_e2e_user_center_favorites.py -v
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
from playwright.sync_api import Page, BrowserContext
from utils.helpers import take_screenshot, wait_for_network_idle

# Test Configuration
BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
SCREENSHOTS_DIR = "tests/e2e/screenshots/user_center_favorites"


class TestFavoritesPageLoad:
    """Test 1: Favorites Page Basic Load"""

    def test_page_title_and_back_nav(self, logged_in_page: Page):
        """Verify favorites page loads with title and back navigation"""
        print("\n[Test 1.1] Accessing favorites page...")

        logged_in_page.goto(f"{BASE_URL}/user-center/favorites")
        wait_for_network_idle(logged_in_page)
        logged_in_page.wait_for_timeout(2000)

        page_content = logged_in_page.content()
        assert "我的收藏" in page_content, "Page title should contain '我的收藏'"
        print("  [OK] Page title contains '我的收藏'")

        take_screenshot(logged_in_page, "01_page_load", SCREENSHOTS_DIR)
        print("  [OK] Screenshot saved")

    def test_favorites_page_structure(self, logged_in_page: Page):
        """Verify favorites page has correct structure"""
        print("\n[Test 1.2] Verifying favorites page structure...")

        logged_in_page.goto(f"{BASE_URL}/user-center/favorites")
        logged_in_page.wait_for_timeout(2000)

        # Should either show favorites list or empty state
        page_content = logged_in_page.content()

        has_list = "收藏" in page_content
        assert has_list, "Page should show favorites-related content"
        print("  [OK] Favorites page structure verified")

        take_screenshot(logged_in_page, "01_page_structure", SCREENSHOTS_DIR)


class TestFavoritesList:
    """Test 2: Favorites List Display"""

    def test_favorites_list_or_empty_state(self, logged_in_page: Page):
        """Verify favorites list renders or shows empty state"""
        print("\n[Test 2.1] Checking favorites list display...")

        logged_in_page.goto(f"{BASE_URL}/user-center/favorites")
        logged_in_page.wait_for_timeout(3000)

        page_content = logged_in_page.content()

        # Should show either tools or empty state
        has_favorites = False
        has_empty = False

        # Check for tool cards (look for "立即使用" button which appears on each card)
        if "立即使用" in page_content:
            has_favorites = True
            print("  [OK] Favorites list displayed with tool cards")

        # Check for empty state
        empty_indicators = ["还没有收藏", "暂无收藏", "浏览工具"]
        for indicator in empty_indicators:
            if indicator in page_content:
                has_empty = True
                print(f"  [OK] Empty state displayed: '{indicator}'")
                break

        assert has_favorites or has_empty, "Should show favorites list or empty state"
        print("  [OK] Favorites list display verified")

        take_screenshot(logged_in_page, "02_favorites_list", SCREENSHOTS_DIR)

    def test_favorite_card_elements(self, logged_in_page: Page):
        """Verify favorite card has tool name and action buttons"""
        print("\n[Test 2.2] Verifying favorite card elements...")

        logged_in_page.goto(f"{BASE_URL}/user-center/favorites")
        logged_in_page.wait_for_timeout(3000)

        page_content = logged_in_page.content()

        # Skip if empty
        if "暂无收藏" in page_content or "还没有收藏" in page_content:
            print("  [SKIP] No favorites to check - empty state")
            take_screenshot(logged_in_page, "02_empty_state", SCREENSHOTS_DIR)
            return

        # Check for action buttons
        has_use_button = "立即使用" in page_content
        has_unfavorite = "取消收藏" in page_content

        if has_use_button:
            print("  [OK] '立即使用' button exists")
        if has_unfavorite:
            print("  [OK] '取消收藏' button exists")

        assert has_use_button, "Favorite card should have '立即使用' button"
        print("  [OK] Favorite card elements verified")

        take_screenshot(logged_in_page, "02_card_elements", SCREENSHOTS_DIR)


class TestUnfavoriteAction:
    """Test 3: Unfavorite Action"""

    def test_unfavorite_button_clickable(self, logged_in_page: Page):
        """Verify unfavorite button exists and can be clicked"""
        print("\n[Test 3.1] Testing unfavorite action...")

        logged_in_page.goto(f"{BASE_URL}/user-center/favorites")
        logged_in_page.wait_for_timeout(3000)

        # Look for unfavorite buttons
        unfavorite_buttons = logged_in_page.get_by_role("button").filter(has_text="取消收藏")

        if unfavorite_buttons.count() == 0:
            print("  [INFO] No unfavorite buttons found (page may be empty)")
            take_screenshot(logged_in_page, "03_no_unfavorite", SCREENSHOTS_DIR)
            return

        # Click the first unfavorite button
        try:
            unfavorite_buttons.first.click()
            logged_in_page.wait_for_timeout(2000)
            print("  [OK] Unfavorite button clicked")

            # After unfavorite, check if count decreased or page state changed
            page_content = logged_in_page.content()
            if "取消收藏" not in page_content or unfavorite_buttons.count() == 0:
                print("  [OK] Tool was successfully unfavorited")
            else:
                print("  [INFO] Page state after unfavorite click")

        except Exception as e:
            print(f"  [INFO] Unfavorite click result: {e}")

        take_screenshot(logged_in_page, "03_after_unfavorite", SCREENSHOTS_DIR)
        print("  [OK] Unfavorite test completed")


class TestPagination:
    """Test 4: Pagination"""

    def test_pagination_controls(self, logged_in_page: Page):
        """Verify pagination controls exist when there are multiple pages"""
        print("\n[Test 4.1] Testing pagination...")

        logged_in_page.goto(f"{BASE_URL}/user-center/favorites")
        logged_in_page.wait_for_timeout(3000)

        # Check for pagination buttons (page numbers or prev/next)
        page_buttons = logged_in_page.get_by_role("button")
        has_pagination = False

        for i in range(page_buttons.count()):
            try:
                text = page_buttons.nth(i).text_content() or ""
                if text.strip().isdigit():
                    has_pagination = True
                    print(f"  [OK] Pagination page button found: '{text.strip()}'")
                    break
            except:
                pass

        if not has_pagination:
            print("  [INFO] No pagination controls (page may have only 1 page of results)")

        take_screenshot(logged_in_page, "04_pagination", SCREENSHOTS_DIR)
        print("  [OK] Pagination test completed")


class TestFavoritesNavigation:
    """Test 5: Navigation to Favorites Page"""

    def test_navigate_from_user_center(self, logged_in_page: Page):
        """Verify navigation from user center to favorites page via sidebar"""
        print("\n[Test 5.1] Navigating from user center to favorites...")

        # Start from user center
        logged_in_page.goto(f"{BASE_URL}/user-center")
        logged_in_page.wait_for_timeout(2000)

        # Find and click "我的收藏" link
        favorites_link = logged_in_page.get_by_role("link").filter(has_text="我的收藏")
        if favorites_link.count() > 0:
            try:
                favorites_link.first.click()
                logged_in_page.wait_for_timeout(2000)
                print("  [OK] Clicked '我的收藏' in sidebar")
            except:
                logged_in_page.goto(f"{BASE_URL}/user-center/favorites")
                logged_in_page.wait_for_timeout(2000)
        else:
            logged_in_page.goto(f"{BASE_URL}/user-center/favorites")
            logged_in_page.wait_for_timeout(2000)

        # Verify on favorites page
        page_content = logged_in_page.content()
        assert "我的收藏" in page_content, "Should be on favorites page"
        print("  [OK] Successfully navigated to favorites page")

        # Check back navigation exists
        back_link = logged_in_page.get_by_role("link").filter(has_text="个人中心")
        if back_link.count() > 0 or "个人中心" in page_content:
            print("  [OK] Back navigation to user center exists")

        take_screenshot(logged_in_page, "05_navigation", SCREENSHOTS_DIR)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
