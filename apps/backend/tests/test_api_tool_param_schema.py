"""
工具详情 API 集成测试 — param_schema 字段
覆盖：通过 slug / UUID 获取工具详情，验证 param_schema 字段
"""
import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.tool import ToolCreate
from app.services.tool_service import ToolService

SAMPLE_SCHEMA = [
    {"key": "theme", "label": "故事主题", "type": "text", "order": 1},
    {"key": "style", "label": "绘画风格", "type": "text", "order": 2},
    {"key": "page_count", "label": "页数", "type": "number", "order": 3},
    {"key": "prompt", "label": "提示词", "type": "textarea", "order": 4},
]

SINGLE_SCHEMA = [
    {"key": "product_name", "label": "商品名称", "type": "text", "order": 1},
]


@pytest.mark.asyncio
async def test_get_tool_by_slug_with_param_schema(client: AsyncClient, db_session: AsyncSession):
    """通过 slug 获取带 param_schema 的工具详情"""
    tool_in = ToolCreate(
        slug="slug-tool-schema",
        name="Slug参数映射工具",
        base_fee=10,
        param_schema=SAMPLE_SCHEMA,
    )
    await ToolService.create_tool(db_session, tool_in)

    response = await client.get("/api/v1/tools/slug-tool-schema")
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == "slug-tool-schema"
    assert data["param_schema"] == SAMPLE_SCHEMA
    assert len(data["param_schema"]) == 4


@pytest.mark.asyncio
async def test_get_tool_by_id_with_param_schema(client: AsyncClient, db_session: AsyncSession):
    """通过 UUID 获取带 param_schema 的工具详情"""
    tool_in = ToolCreate(
        slug="uuid-tool-schema",
        name="UUID参数映射工具",
        base_fee=10,
        param_schema=SINGLE_SCHEMA,
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    response = await client.get(f"/api/v1/tools/{tool.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(tool.id)
    assert data["param_schema"] == SINGLE_SCHEMA
    assert len(data["param_schema"]) == 1


@pytest.mark.asyncio
async def test_get_tool_default_param_schema(client: AsyncClient, db_session: AsyncSession):
    """获取不包含 param_schema 的工具，验证字段为 null"""
    tool_in = ToolCreate(
        slug="default-schema-tool",
        name="默认工具",
        base_fee=10,
    )
    await ToolService.create_tool(db_session, tool_in)

    response = await client.get("/api/v1/tools/default-schema-tool")
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == "default-schema-tool"
    assert data["param_schema"] is None


@pytest.mark.asyncio
async def test_get_tool_param_schema_not_found(client: AsyncClient):
    """获取不存在的工具"""
    response = await client.get("/api/v1/tools/non-existent-tool-slug")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_tool_detail_includes_param_schema(client: AsyncClient, db_session: AsyncSession):
    """获取工具详情包含 param_schema 字段"""
    tool_in = ToolCreate(
        slug="full-detail-schema",
        name="完整信息工具带参数映射",
        description="这是一个完整的工具描述",
        short_desc="简短描述",
        base_fee=50,
        image_fee=10,
        audio_fee=5,
        token_fee=1,
        status=1,
        is_featured=True,
        param_schema=SAMPLE_SCHEMA,
    )
    await ToolService.create_tool(db_session, tool_in)

    response = await client.get("/api/v1/tools/full-detail-schema")
    assert response.status_code == 200
    data = response.json()

    # 验证所有核心字段
    assert data["name"] == "完整信息工具带参数映射"
    assert data["description"] == "这是一个完整的工具描述"
    assert data["short_desc"] == "简短描述"
    assert data["base_fee"] == 50
    assert data["image_fee"] == 10
    assert data["audio_fee"] == 5
    assert data["token_fee"] == 1
    assert data["status"] == 1
    assert data["is_featured"] is True
    assert data["param_schema"] == SAMPLE_SCHEMA
    assert len(data["param_schema"]) == 4
    assert data["use_count"] == 0
    assert data["favorite_count"] == 0
    assert data["rating_count"] == 0
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data
