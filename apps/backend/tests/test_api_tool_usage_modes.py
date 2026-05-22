"""
工具详情 API 集成测试 — usage_modes 字段
覆盖：通过 slug / UUID 获取工具详情，验证 usage_modes 字段
"""
import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.tool import ToolCreate
from app.services.tool_service import ToolService


@pytest.mark.asyncio
async def test_get_tool_by_slug(client: AsyncClient, db_session: AsyncSession):
    """通过 slug 获取工具详情"""
    # 创建工具
    tool_in = ToolCreate(
        slug="slug-tool-usage",
        name="Slug工具",
        base_fee=10,
        usage_modes=["form", "dialog"],
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    # 通过 slug 获取
    response = await client.get(f"/api/v1/tools/slug-tool-usage")
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == "slug-tool-usage"
    assert data["usage_modes"] == ["form", "dialog"]


@pytest.mark.asyncio
async def test_get_tool_by_id(client: AsyncClient, db_session: AsyncSession):
    """通过 UUID 获取工具详情"""
    tool_in = ToolCreate(
        slug="uuid-tool-usage",
        name="UUID工具",
        base_fee=10,
        usage_modes=["form"],
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    # 通过 UUID 获取
    response = await client.get(f"/api/v1/tools/{tool.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(tool.id)
    assert data["usage_modes"] == ["form"]


@pytest.mark.asyncio
async def test_get_tool_default_usage_modes(client: AsyncClient, db_session: AsyncSession):
    """获取不包含 usage_modes 的工具，验证字段为 null"""
    tool_in = ToolCreate(
        slug="default-usage-tool",
        name="默认工具",
        base_fee=10,
        # usage_modes 不设置
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    response = await client.get(f"/api/v1/tools/default-usage-tool")
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == "default-usage-tool"
    assert data["usage_modes"] is None


@pytest.mark.asyncio
async def test_get_tool_not_found(client: AsyncClient):
    """获取不存在的工具"""
    response = await client.get("/api/v1/tools/non-existent-tool-slug")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_tool_usage_modes_single_mode(client: AsyncClient, db_session: AsyncSession):
    """获取单模式工具"""
    tool_in = ToolCreate(
        slug="single-mode-tool",
        name="单模式",
        base_fee=10,
        usage_modes=["dialog"],
    )
    await ToolService.create_tool(db_session, tool_in)

    response = await client.get("/api/v1/tools/single-mode-tool")
    assert response.status_code == 200
    data = response.json()
    assert data["usage_modes"] == ["dialog"]
    assert len(data["usage_modes"]) == 1


@pytest.mark.asyncio
async def test_get_tool_detail_includes_all_fields(client: AsyncClient, db_session: AsyncSession):
    """获取工具详情包含所有核心字段"""
    tool_in = ToolCreate(
        slug="full-detail-tool",
        name="完整信息工具",
        description="这是一个完整的工具描述",
        short_desc="简短描述",
        base_fee=50,
        image_fee=10,
        audio_fee=5,
        token_fee=1,
        status=1,
        is_featured=True,
        usage_modes=["form", "dialog"],
    )
    await ToolService.create_tool(db_session, tool_in)

    response = await client.get("/api/v1/tools/full-detail-tool")
    assert response.status_code == 200
    data = response.json()

    # 验证所有核心字段
    assert data["name"] == "完整信息工具"
    assert data["description"] == "这是一个完整的工具描述"
    assert data["short_desc"] == "简短描述"
    assert data["base_fee"] == 50
    assert data["image_fee"] == 10
    assert data["audio_fee"] == 5
    assert data["token_fee"] == 1
    assert data["status"] == 1
    assert data["is_featured"] is True
    assert data["usage_modes"] == ["form", "dialog"]
    assert data["use_count"] == 0
    assert data["favorite_count"] == 0
    assert data["rating_count"] == 0
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data
