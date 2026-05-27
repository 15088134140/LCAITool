"""
param_schema 单元测试
覆盖：Tool 模型中 param_schema 字段的 CRUD 操作
"""
import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.tool import ToolCreate, ToolUpdate
from app.services.tool_service import ToolService
from app.core.exceptions import ToolNotFoundException

SAMPLE_SCHEMA = [
    {"key": "theme", "label": "故事主题", "type": "text", "order": 1},
    {"key": "style", "label": "绘画风格", "type": "text", "order": 2},
    {"key": "page_count", "label": "页数", "type": "number", "order": 3},
    {"key": "prompt", "label": "提示词", "type": "textarea", "order": 4},
]


@pytest.mark.asyncio
async def test_create_tool_with_param_schema(db_session: AsyncSession):
    """创建带有 param_schema 的工具"""
    tool_in = ToolCreate(
        slug="tool-with-schema",
        name="带参数映射的工具",
        base_fee=10,
        param_schema=SAMPLE_SCHEMA,
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    assert tool.id is not None
    assert tool.slug == "tool-with-schema"
    assert tool.param_schema == SAMPLE_SCHEMA
    assert len(tool.param_schema) == 4


@pytest.mark.asyncio
async def test_create_tool_with_default_param_schema(db_session: AsyncSession):
    """创建不带 param_schema 的工具，验证为 null"""
    tool_in = ToolCreate(
        slug="tool-default-schema",
        name="默认参数映射工具",
        base_fee=10,
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    assert tool.id is not None
    assert tool.param_schema is None


@pytest.mark.asyncio
async def test_create_tool_with_empty_param_schema(db_session: AsyncSession):
    """创建带有空数组 param_schema 的工具"""
    tool_in = ToolCreate(
        slug="tool-empty-schema",
        name="空参数映射工具",
        base_fee=10,
        param_schema=[],
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    assert tool.id is not None
    assert tool.param_schema == []


@pytest.mark.asyncio
async def test_update_tool_param_schema(db_session: AsyncSession):
    """更新工具的 param_schema"""
    tool_in = ToolCreate(
        slug="tool-update-schema",
        name="待更新参数映射工具",
        base_fee=10,
        param_schema=SAMPLE_SCHEMA,
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    # 更新 param_schema 为新的值
    new_schema = [
        {"key": "product_name", "label": "商品名称", "type": "text", "order": 1},
    ]
    update_in = ToolUpdate(slug="tool-update-schema", param_schema=new_schema)
    updated = await ToolService.update_tool(db_session, tool.id, update_in)

    assert updated.param_schema == new_schema
    assert len(updated.param_schema) == 1

    # 再次更新为不同的 schema
    another_schema = [
        {"key": "text", "label": "文本内容", "type": "textarea", "order": 1},
        {"key": "voice_type", "label": "音色", "type": "text", "order": 2},
    ]
    update_in2 = ToolUpdate(slug="tool-update-schema", param_schema=another_schema)
    updated2 = await ToolService.update_tool(db_session, tool.id, update_in2)

    assert updated2.param_schema == another_schema
    assert len(updated2.param_schema) == 2


@pytest.mark.asyncio
async def test_update_tool_clear_param_schema(db_session: AsyncSession):
    """清空工具的 param_schema 为 null"""
    tool_in = ToolCreate(
        slug="tool-clear-schema",
        name="清空参数映射工具",
        base_fee=10,
        param_schema=SAMPLE_SCHEMA,
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    # 更新 param_schema 为 None
    update_in = ToolUpdate(slug="tool-clear-schema", param_schema=None)
    updated = await ToolService.update_tool(db_session, tool.id, update_in)

    assert updated.param_schema is None


@pytest.mark.asyncio
async def test_get_tool_param_schema_not_found(db_session: AsyncSession):
    """获取不存在的工具，验证返回 None"""
    found = await ToolService.get_tool_by_id(db_session, uuid.uuid4())
    assert found is None


@pytest.mark.asyncio
async def test_update_tool_param_schema_not_found(db_session: AsyncSession):
    """更新不存在的工具，应抛出异常"""
    update_in = ToolUpdate(slug="non-existent", param_schema=SAMPLE_SCHEMA)
    with pytest.raises(ToolNotFoundException):
        await ToolService.update_tool(db_session, uuid.uuid4(), update_in)


@pytest.mark.asyncio
async def test_delete_tool_param_schema_not_found(db_session: AsyncSession):
    """删除不存在的工具，应抛出异常"""
    with pytest.raises(ToolNotFoundException):
        await ToolService.delete_tool(db_session, uuid.uuid4())
