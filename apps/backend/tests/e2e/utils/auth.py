# apps/backend/tests/e2e/utils/auth.py
"""
认证相关辅助函数
"""
import os
import json
import logging
from playwright.sync_api import Page, TimeoutError

E2E_BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
E2E_API_URL = os.getenv("E2E_API_URL", "http://localhost:8000")

# 导出常量
__all__ = ["login_with_api", "get_login_state", "E2E_BASE_URL", "E2E_API_URL"]

logger = logging.getLogger(__name__)


def login_with_api(page: Page, username: str, password: str) -> bool:
    """
    通过 API 登录并注入 token 到 localStorage（Zustand store格式）

    Args:
        page: Playwright Page 对象
        username: 用户名
        password: 密码

    Returns:
        bool: 登录是否成功
    """
    try:
        # 先导航到首页确保页面上下文存在
        page.goto(f"{E2E_BASE_URL}/", wait_until="domcontentloaded", timeout=10000)

        # 调用后端API登录（FastAPI在8000端口，OAuth2 form格式）
        response = page.request.post(
            f"{E2E_API_URL}/api/v1/auth/login",
            form={"username": username, "password": password}
        )

        if response.ok:
            auth_data = response.json()
            tokens = {
                "access_token": auth_data.get("access_token"),
                "refresh_token": auth_data.get("refresh_token"),
                "token_type": auth_data.get("token_type", "bearer")
            }

            # 获取用户信息
            user_response = page.request.get(
                f"{E2E_API_URL}/api/v1/users/me",
                headers={"Authorization": f"Bearer {tokens['access_token']}"}
            )

            if user_response.ok:
                user_data = user_response.json()
                # 转换为store期望的User格式
                user = {
                    "id": str(user_data.get("id")),
                    "phone": user_data.get("phone"),
                    "email": user_data.get("email"),
                    "nickname": user_data.get("nickname"),
                    "avatar": user_data.get("avatar"),
                    "id_card_verified": user_data.get("is_verified", False),
                    "balance": user_data.get("points", 0),
                    "status": user_data.get("status", 1),
                    "created_at": user_data.get("created_at", 0),
                    "updated_at": user_data.get("updated_at", 0)
                }

                # 设置Zustand store的localStorage状态
                auth_storage = json.dumps({
                    "state": {
                        "tokens": tokens,
                        "user": user,
                        "isAuthenticated": True,
                        "isLoading": False,
                        "error": None
                    },
                    "version": 0
                })

                # 在页面上下文中注入localStorage数据
                page.evaluate(f"""localStorage.setItem('lcaitool-auth-storage', '{auth_storage}')""")

                # 同时设置独立 token 键（axios/tokenStorage 使用）
                # escape single quotes in token values for JS string literal
                access_token_safe = tokens['access_token'].replace("'", "\\'")
                refresh_token_safe = tokens['refresh_token'].replace("'", "\\'")
                page.evaluate(f"localStorage.setItem('lcaitool_access_token', '{access_token_safe}')")
                page.evaluate(f"localStorage.setItem('lcaitool_refresh_token', '{refresh_token_safe}')")
                return True
        else:
            logger.warning(
                "Login failed for user %s: status=%s, body=%s",
                username, response.status, response.text()
            )
    except Exception as e:
        logger.error("Login error: %s", str(e))

    return False


def get_login_state(page: Page) -> bool:
    """
    检查当前页面是否已登录

    Args:
        page: Playwright Page 对象

    Returns:
        bool: 是否已登录
    """
    try:
        page.wait_for_selector("[data-testid='user-avatar']", timeout=3000)
        return True
    except TimeoutError:
        return False
