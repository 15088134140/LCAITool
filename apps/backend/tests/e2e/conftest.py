# apps/backend/tests/e2e/conftest.py
"""
E2E测试配置文件
⚠️ 重要：本E2E测试使用阿里云PostgreSQL数据库进行测试
运行前请确保：
1. 已执行 alembic upgrade head 初始化数据库表结构
2. 已运行 python scripts/init_e2e_users.py 初始化测试用户
"""
import os
import sys
import pytest
from typing import Generator, Any
from playwright.sync_api import BrowserContext

# 导入本地测试用户数据
sys.path.insert(0, os.path.dirname(__file__))
from data.users import DEFAULT_TEST_USER

# 基础配置
E2E_BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
E2E_HEADLESS = os.getenv("E2E_HEADLESS", "true").lower() == "true"
VIEWPORT = {"width": 1920, "height": 1080}
SCREENSHOTS_DIR = "tests/e2e/screenshots"
TRACES_DIR = "tests/e2e/traces"
VIDEOS_DIR = "tests/e2e/videos"


@pytest.fixture(scope="session")
def playwright() -> Generator[Any, None, None]:
    """Playwright 实例，会话级别"""
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        yield p


@pytest.fixture(scope="session")
def browser(playwright) -> Generator[Any, None, None]:
    """浏览器实例，会话级别，所有测试复用"""
    browser = playwright.chromium.launch(
        headless=E2E_HEADLESS,
        slow_mo=100 if not E2E_HEADLESS else 0,
        args=["--no-sandbox", "--disable-setuid-sandbox"]
    )
    yield browser
    browser.close()


@pytest.fixture(scope="session")
def browser_context(browser) -> Generator[BrowserContext, None, None]:
    """浏览器上下文，会话级别，共享登录状态"""
    context = browser.new_context(
        viewport=VIEWPORT,
        locale="zh-CN",
        timezone_id="Asia/Shanghai",
        record_video_dir=VIDEOS_DIR if not E2E_HEADLESS else None,
        record_video_size=VIEWPORT,
    )

    # 启用 Trace 收集
    context.tracing.start(
        screenshots=True,
        snapshots=True,
        sources=True
    )

    yield context

    # 停止 Trace
    os.makedirs(TRACES_DIR, exist_ok=True)
    context.tracing.stop(path=f"{TRACES_DIR}/session.zip")
    context.close()


@pytest.fixture
def page(browser_context: BrowserContext, request) -> Generator[Any, None, None]:
    """页面对象，每个测试新建一个页面"""
    page = browser_context.new_page()

    # 捕获浏览器控制台日志
    page.on("console", lambda msg: print(f"[Browser {msg.type}] {msg.text}"))

    # 捕获页面错误
    page.on("pageerror", lambda err: print(f"[Page Error] {err}"))

    # 捕获请求失败
    def handle_request_failed(req):
        try:
            failure = req.failure
            if failure:
                if hasattr(failure, 'error_text'):
                    error_text = failure.error_text
                else:
                    error_text = str(failure)
            else:
                error_text = "Unknown error"
            print(f"[Request Failed] {req.url}: {error_text}")
        except:
            print(f"[Request Failed] {req.url}")
    page.on("requestfailed", handle_request_failed)

    yield page

    # 失败时自动截图
    if hasattr(request.node, "rep_call") and request.node.rep_call.failed:
        test_name = request.node.name
        os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

        screenshot_path = f"{SCREENSHOTS_DIR}/{test_name}.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"\n[Screenshot] 失败截图已保存: {screenshot_path}")

    page.close()


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """捕获测试结果，用于失败时截图"""
    outcome = yield
    rep = outcome.get_result()
    setattr(item, f"rep_{rep.when}", rep)


@pytest.fixture(scope="session")
def test_user():
    """
    测试用户 fixture，返回模拟用户数据
    注意：实际数据库集成测试需要单独配置
    """
    class MockUser:
        username = DEFAULT_TEST_USER["username"]
        email = DEFAULT_TEST_USER["email"]
    return MockUser()


@pytest.fixture
def logged_in_page(page, test_user) -> Generator[Any, None, None]:
    """已登录的页面对象"""
    # 尝试通过 API 登录
    try:
        from utils.auth import login_with_api
        success = login_with_api(page, DEFAULT_TEST_USER["username"], DEFAULT_TEST_USER["password"])
        if success:
            # 刷新页面让localStorage生效
            page.reload()
            print(f"[Info] 用户 {DEFAULT_TEST_USER['username']} 登录成功")
        else:
            print(f"[Warning] 自动登录失败，测试将以未登录状态继续")
    except Exception as e:
        print(f"[Warning] 自动登录异常: {e}，测试将以未登录状态继续")

    yield page
