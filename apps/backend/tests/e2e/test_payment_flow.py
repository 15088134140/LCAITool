# apps/backend/tests/e2e/test_payment_flow.py
"""
支付充值完整流程E2E测试

覆盖 spec 测试要点：
- 4个档位正确显示
- 选择档位 → 支付成功 → 积分到账
- 自定义金额 → 支付成功 → 积分到账
- 余额刷新正确
- 所有 /payment 入口正确指向 /pricing
"""
import sys
import os
import re

sys.path.insert(0, os.path.dirname(__file__))

import pytest
from utils.helpers import take_screenshot, wait_for_network_idle

E2E_BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
SCREENSHOTS_DIR = "tests/e2e/screenshots/payment_flow"

# PRD 4个档位的预期数据
EXPECTED_PACKAGES = [
    {"name": "入门档", "price": 30, "base_points": 300, "bonus_points": 20, "total_points": 320},
    {"name": "进阶档", "price": 100, "base_points": 1000, "bonus_points": 100, "total_points": 1100},
    {"name": "专业档", "price": 300, "base_points": 3000, "bonus_points": 400, "total_points": 3400},
    {"name": "企业档", "price": 1000, "base_points": 10000, "bonus_points": 2000, "total_points": 12000},
]


@pytest.mark.payment_flow
@pytest.mark.e2e
class TestPackageDisplay:
    """充值档位显示测试"""

    def test_four_packages_displayed(self, logged_in_page):
        """验证4个档位正确显示"""
        page = logged_in_page
        print("\n📦 验证充值档位显示...")

        page.goto(f"{E2E_BASE_URL}/pricing")
        wait_for_network_idle(page)
        take_screenshot(page, "display_packages", SCREENSHOTS_DIR)

        # 检查每个档位的名称和价格在页面上可见
        for pkg in EXPECTED_PACKAGES:
            name_visible = page.get_by_text(pkg["name"], exact=True).count() > 0
            price_text = f"¥{pkg['price']}"
            price_visible = page.get_by_text(price_text, exact=False).count() > 0
            points_text = f"{pkg['total_points']} 积分"
            points_visible = page.get_by_text(points_text, exact=False).count() > 0

            assert name_visible, f"档位名称 '{pkg['name']}' 未显示"
            assert price_visible, f"价格 '{price_text}' 未显示"
            assert points_visible, f"积分信息 '{points_text}' 未显示"
            print(f"   ✅ 档位 '{pkg['name']}' — ¥{pkg['price']} → {pkg['total_points']}积分")

        # 验证热门档位有推荐标签
        hot_badges = page.locator('text=推荐').count() + page.locator('text=最划算').count()
        assert hot_badges >= 2, f"热门档位标签不足，找到 {hot_badges} 个"
        print(f"   ✅ 热门档位标签: {hot_badges} 个 (推荐/最划算)")

    def test_packages_loaded_from_api(self, logged_in_page):
        """验证档位数据来自API而非硬编码"""
        page = logged_in_page

        # 监听 API 请求
        with page.expect_response(lambda response: "/payment/packages" in response.url and response.ok) as response_info:
            page.goto(f"{E2E_BASE_URL}/pricing")
            wait_for_network_idle(page)

        response = response_info.value
        body = response.json()
        items = body.get("items", body.get("packages", []))
        assert len(items) == 4, f"API 返回 {len(items)} 个档位，期望 4 个"
        print(f"   ✅ API GET /payment/packages 返回 {len(items)} 个档位")

        # 验证 API 返回的数据与 PRD 一致
        api_names = {p["name"] for p in items}
        expected_names = {p["name"] for p in EXPECTED_PACKAGES}
        assert api_names == expected_names, f"API 档位名称不匹配: {api_names} vs {expected_names}"
        print(f"   ✅ API 档位名称匹配 PRD: {api_names}")


@pytest.mark.payment_flow
@pytest.mark.e2e
class TestPackageRecharge:
    """选择档位充值流程测试"""

    def test_select_package_and_pay(self, logged_in_page):
        """选择档位 → 支付成功 → 积分到账"""
        page = logged_in_page
        print("\n💳 测试选择档位充值...")

        # Step 1: 进入充值页
        page.goto(f"{E2E_BASE_URL}/pricing")
        wait_for_network_idle(page)

        # 记下充值前余额
        balance_text_before = page.locator("text=当前积分余额").locator("..").locator("div").nth(1).text_content()
        balance_before = int(balance_text_before.strip())
        print(f"   💰 充值前余额: {balance_before}")

        take_screenshot(page, "pay01_before", SCREENSHOTS_DIR)

        # Step 2: 点击"入门档"卡片选中
        page.get_by_text("入门档", exact=True).first.click()
        wait_for_network_idle(page)
        print("   ✅ 已选中入门档")

        take_screenshot(page, "pay02_selected", SCREENSHOTS_DIR)

        # Step 3: 点击支付按钮
        pay_button = page.get_by_role("button", name=re.compile(r"立即支付"))
        assert pay_button.count() > 0, "支付按钮未找到"
        pay_button.click()

        # Step 4: 等待支付成功结果展示
        page.wait_for_selector("text=充值成功", timeout=15000)
        take_screenshot(page, "pay03_success", SCREENSHOTS_DIR)
        print("   ✅ 支付成功结果已显示")

        # Step 5: 验证成功页面内容
        page_content = page.content()
        assert "订单号" in page_content, "成功页面缺少订单号"
        print("   ✅ 成功页面包含订单号")

        # Step 6: 验证余额已增加
        page.goto(f"{E2E_BASE_URL}/pricing")
        wait_for_network_idle(page)
        balance_text_after = page.locator("text=当前积分余额").locator("..").locator("div").nth(1).text_content()
        balance_after = int(balance_text_after.strip())
        expected_increase = 320  # 入门档: 300基础 + 20赠送
        assert balance_after == balance_before + expected_increase, \
            f"余额未正确增加: 之前 {balance_before}, 之后 {balance_after}, 期望增加 {expected_increase}"
        print(f"   ✅ 余额正确增加: {balance_before} → {balance_after} (+{expected_increase})")

    def test_different_package_selection(self, logged_in_page):
        """测试选择不同档位，验证金额和积分显示变化"""
        page = logged_in_page
        print("\n🔄 测试不同档位选择...")

        page.goto(f"{E2E_BASE_URL}/pricing")
        wait_for_network_idle(page)

        # 选择"专业档"（¥300）
        page.get_by_text("专业档", exact=True).first.click()
        wait_for_network_idle(page)

        # 验证支付按钮显示正确的金额
        pay_button = page.get_by_role("button", name=re.compile(r"立即支付 ¥?300"))
        assert pay_button.count() > 0, f"专业档支付按钮金额不正确"
        print("   ✅ 选择专业档后支付按钮显示 ¥300")

        take_screenshot(page, "pay04_package_switch", SCREENSHOTS_DIR)

        # 继续充值按钮测试（如果存在成功状态，先重置）
        # 支付成功
        pay_button.click()
        page.wait_for_selector("text=充值成功", timeout=15000)

        # 点击"继续充值"回到选档位状态
        continue_btn = page.get_by_role("button", name="继续充值")
        assert continue_btn.count() > 0, "继续充值按钮未出现"
        continue_btn.click()
        wait_for_network_idle(page)
        print("   ✅ '继续充值'按钮可回到选档位状态")

        take_screenshot(page, "pay05_reset", SCREENSHOTS_DIR)


@pytest.mark.payment_flow
@pytest.mark.e2e
class TestCustomRecharge:
    """自定义金额充值流程测试"""

    def test_custom_amount_recharge(self, logged_in_page):
        """自定义金额 → 支付成功 → 积分到账"""
        page = logged_in_page
        print("\n✏️  测试自定义金额充值...")

        # Step 1: 进入充值页
        page.goto(f"{E2E_BASE_URL}/pricing")
        wait_for_network_idle(page)

        # 记下充值前余额
        balance_text_before = page.locator("text=当前积分余额").locator("..").locator("div").nth(1).text_content()
        balance_before = int(balance_text_before.strip())
        print(f"   💰 充值前余额: {balance_before}")

        take_screenshot(page, "custom01_before", SCREENSHOTS_DIR)

        # Step 2: 在自定义金额输入框中输入50
        amount_input = page.locator('input[type="number"]')
        assert amount_input.count() > 0, "自定义金额输入框未找到"
        amount_input.fill("50")
        wait_for_network_idle(page)
        print("   ✅ 已输入自定义金额: ¥50")

        # Step 3: 验证到账积分提示显示
        points_hint = page.get_by_text("到账积分：500", exact=False)
        assert points_hint.count() > 0, "到账积分提示未显示"
        print("   ✅ 到账积分提示正确: 50元 → 500积分")

        take_screenshot(page, "custom02_amount", SCREENSHOTS_DIR)

        # Step 4: 点击支付按钮
        pay_button = page.get_by_role("button", name=re.compile(r"立即支付 ¥?50"))
        assert pay_button.count() > 0, "自定义金额支付按钮未找到"
        pay_button.click()

        # Step 5: 等待支付成功
        page.wait_for_selector("text=充值成功", timeout=15000)
        take_screenshot(page, "custom03_success", SCREENSHOTS_DIR)
        print("   ✅ 自定义充值成功")

        # Step 6: 验证余额
        # 先导航到 pricing 刷新余额
        page.goto(f"{E2E_BASE_URL}/pricing")
        wait_for_network_idle(page)
        balance_text_after = page.locator("text=当前积分余额").locator("..").locator("div").nth(1).text_content()
        balance_after = int(balance_text_after.strip())
        expected_increase = 500  # 50元 × 10积分/元
        assert balance_after == balance_before + expected_increase, \
            f"自定义充值余额未正确增加: 之前 {balance_before}, 之后 {balance_after}, 期望增加 {expected_increase}"
        print(f"   ✅ 余额正确增加: {balance_before} → {balance_after} (+{expected_increase})")


@pytest.mark.payment_flow
@pytest.mark.e2e
class TestPricingLinks:
    """支付入口链接测试"""

    def test_payment_links_point_to_pricing(self, logged_in_page):
        """验证所有入口正确指向 /pricing"""
        page = logged_in_page
        print("\n🔗 验证支付入口链接...")

        # 检查 user-center 页面中的充值按钮
        page.goto(f"{E2E_BASE_URL}/user-center")
        wait_for_network_idle(page)
        take_screenshot(page, "link01_user_center", SCREENSHOTS_DIR)

        # 查找充值相关的链接
        recharge_links = page.locator('a[href="/pricing"]')
        assert recharge_links.count() >= 1, "user-center 页面缺少到 /pricing 的链接"
        print(f"   ✅ user-center 页面发现 {recharge_links.count()} 个 /pricing 链接")

        # 检查导航栏是否有到 /pricing 的链接
        page.goto(f"{E2E_BASE_URL}/")
        wait_for_network_idle(page)
        nav_pricing = page.locator('a[href="/pricing"]')
        assert nav_pricing.count() > 0, "导航栏缺少到 /pricing 的链接"
        print(f"   ✅ 导航栏有到 /pricing 的链接")

        # 验证没有遗留的 /payment 页面链接（排除 API 路径）
        page.goto(f"{E2E_BASE_URL}/pricing")
        wait_for_network_idle(page)
        all_links = page.locator('a').all()
        for link in all_links:
            href = link.get_attribute("href") or ""
            # 只检查前端路由链接，不检查 API 调用
            if href.startswith("/payment"):
                pytest.fail(f"发现遗留的 /payment 链接: {href}")
        print("   ✅ 未发现遗留的 /payment 链接")


@pytest.mark.payment_flow
@pytest.mark.e2e
class TestPointHistoryFlow:
    """积分流水记录流程测试"""

    def test_point_history_page(self, logged_in_page):
        """测试积分历史记录页面"""
        page = logged_in_page
        print("\n📋 测试积分历史记录页面...")

        page.goto(f"{E2E_BASE_URL}/user-center/points")
        wait_for_network_idle(page)
        take_screenshot(page, "point_01_history", SCREENSHOTS_DIR)

        # 检查页面内容
        page_content = page.content()
        assert "积分" in page_content and ("明细" in page_content or "记录" in page_content or "历史" in page_content), \
            "积分历史页面内容缺失"
        print("   ✅ 积分历史页面加载成功")

        list_items = page.locator('li').count() + page.locator('[role="listitem"]').count()
        print(f"   ✅ 发现 {list_items} 个列表项元素")

    def test_point_filter_function(self, logged_in_page):
        """测试积分筛选功能"""
        page = logged_in_page
        print("\n🔍 测试积分筛选功能...")

        page.goto(f"{E2E_BASE_URL}/user-center/points")
        wait_for_network_idle(page)

        try:
            filters = page.locator('select').count() + page.locator('[role="select"]').count()
            print(f"   ✅ 发现 {filters} 个筛选器元素")
        except:
            print("   ℹ️  未发现筛选元素")

        take_screenshot(page, "point_02_filter", SCREENSHOTS_DIR)
        print("   ✅ 积分筛选功能测试完成")


@pytest.mark.payment_flow
@pytest.mark.e2e
class TestPaymentEntryPoints:
    """充值入口点测试"""

    def test_user_center_recharge_button(self, logged_in_page):
        """验证个人中心的充值按钮可正常跳转到 /pricing"""
        page = logged_in_page
        print("\n🚪 测试个人中心充值按钮...")

        page.goto(f"{E2E_BASE_URL}/user-center")
        wait_for_network_idle(page)

        # 查找充值按钮并点击
        recharge_btn = page.locator('a[href="/pricing"]').first
        assert recharge_btn.count() > 0, "未找到充值按钮"
        recharge_btn.click()
        wait_for_network_idle(page)

        # 验证已跳转到 /pricing
        assert "/pricing" in page.url, f"未跳转到 /pricing，当前 URL: {page.url}"
        print(f"   ✅ 充值按钮跳转到 /pricing")
        take_screenshot(page, "entry_recharge_btn", SCREENSHOTS_DIR)
