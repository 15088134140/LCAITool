"""
管理端工具 executor_key 集成测试
覆盖创建、更新、详情返回与执行器列表接口。
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.tool import ToolCreate, ToolUpdate
from app.services.tool_service import ToolService
from tests.test_api_admin import create_test_admin_user, get_user_token


@pytest.mark.asyncio
async def test_admin_create_tool_saves_executor_key(client: AsyncClient, db_session: AsyncSession):
    """创建工具时保存 executor_key"""
    await create_test_admin_user(db_session)
    admin_token = await get_user_token(client, "admin", "admin123")

    response = await client.post(
        "/api/v1/admin/tools",
        json={
            "slug": "executor-create-tool",
            "name": "执行器创建工具",
            "base_fee": 10,
            "executor_key": "storybook-generator",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == "executor-create-tool"
    assert data["executor_key"] == "storybook-generator"


@pytest.mark.asyncio
async def test_admin_update_tool_changes_executor_key(client: AsyncClient, db_session: AsyncSession):
    """更新工具时修改 executor_key"""
    await create_test_admin_user(db_session)
    admin_token = await get_user_token(client, "admin", "admin123")
    tool = await ToolService.create_tool(
        db_session,
        ToolCreate(
            slug="executor-update-tool",
            name="执行器更新工具",
            base_fee=10,
            executor_key="storybook-generator",
        ),
    )

    response = await client.put(
        f"/api/v1/admin/tools/{tool.id}",
        json={
            "slug": "executor-update-tool",
            "name": "执行器更新工具",
            "executor_key": "ecommerce-detail",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["executor_key"] == "ecommerce-detail"


@pytest.mark.asyncio
async def test_get_tool_detail_returns_executor_key(client: AsyncClient, db_session: AsyncSession):
    """获取工具详情时返回 executor_key"""
    await ToolService.create_tool(
        db_session,
        ToolCreate(
            slug="executor-detail-tool",
            name="执行器详情工具",
            base_fee=10,
            executor_key="product-description",
        ),
    )

    response = await client.get("/api/v1/tools/executor-detail-tool")

    assert response.status_code == 200
    data = response.json()
    assert data["executor_key"] == "product-description"


@pytest.mark.asyncio
async def test_admin_list_executors_requires_admin(client: AsyncClient, db_session: AsyncSession):
    """管理员可获取执行器列表"""
    await create_test_admin_user(db_session)
    admin_token = await get_user_token(client, "admin", "admin123")

    response = await client.get(
        "/api/v1/admin/executors",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert {item["key"] for item in data} == {
        "storybook-generator",
        "ecommerce-detail",
        "product-description",
    }
