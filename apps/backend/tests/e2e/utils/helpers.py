# apps/backend/tests/e2e/utils/helpers.py
"""
通用测试辅助函数
"""
import os
from playwright.sync_api import Page


def take_screenshot(page: Page, name: str, output_dir: str = "tests/e2e/screenshots") -> str:
    """
    截图辅助函数

    Args:
        page: Playwright Page 对象
        name: 截图名称（不含 .png 后缀）
        output_dir: 输出目录

    Returns:
        str: 保存的截图文件路径
    """
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, f"{name}.png")
    page.screenshot(path=path, full_page=True)
    return path


def wait_for_network_idle(page: Page, timeout: int = 5000) -> None:
    """
    等待网络请求空闲

    Args:
        page: Playwright Page 对象
        timeout: 超时时间（毫秒）
    """
    page.wait_for_load_state("networkidle", timeout=timeout)


def scroll_to_bottom(page: Page) -> None:
    """滚动到页面底部

    Args:
        page: Playwright Page 对象
    """
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")


def slow_mode(page: Page, delay: int = 500) -> None:
    """
    启用慢速模式，便于观察测试过程

    Args:
        page: Playwright Page 对象
        delay: 延迟毫秒数
    """
    page.wait_for_timeout(delay)
