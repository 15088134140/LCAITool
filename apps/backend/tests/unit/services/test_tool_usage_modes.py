"""
Usage modes 单元测试
覆盖：Tool 模型中 usage_modes 字段的 CRUD 操作
"""
import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.tool import ToolCreate, ToolUpdate
from app.services.tool_service import ToolService
from app.core.exceptions import ToolNotFoundException


@pytest.mark.asyncio
async def test_create_tool_with_usage_modes(db_session: AsyncSession):
    """创建带有 usage_modes 的工具"""
    tool_in = ToolCreate(
        slug="tool-with-modes",
        name="多模式工具",
        base_fee=10,
        usage_modes=["form", "dialog"]
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    assert tool.id is not None
    assert tool.slug == "tool-with-modes"
    assert tool.usage_modes == ["form", "dialog"]


@pytest.mark.asyncio
async def test_create_tool_with_default_usage_modes(db_session: AsyncSession):
    """创建不带 usage_modes 的工具，验证为 null"""
    tool_in = ToolCreate(
        slug="tool-default-modes",
        name="默认模式工具",
        base_fee=10
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    assert tool.id is not None
    assert tool.usage_modes is None


@pytest.mark.asyncio
async def test_create_tool_with_single_mode(db_session: AsyncSession):
    """创建带有单个 usage_modes 的工具"""
    tool_in = ToolCreate(
        slug="tool-single-mode",
        name="单模式工具",
        base_fee=10,
        usage_modes=["dialog"]
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    assert tool.id is not None
    assert tool.usage_modes == ["dialog"]
    assert len(tool.usage_modes) == 1


@pytest.mark.asyncio
async def test_update_tool_usage_modes(db_session: AsyncSession):
    """更新工具的 usage_modes"""
    tool_in = ToolCreate(
        slug="tool-update-modes",
        name="待更新模式工具",
        base_fee=10,
        usage_modes=["form"]
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    # 更新 usage_modes
    update_in = ToolUpdate(usage_modes=["form", "dialog"])
    updated = await ToolService.update_tool(db_session, tool.id, update_in)

    assert updated.usage_modes == ["form", "dialog"]

    # 再次更新
    update_in2 = ToolUpdate(usage_modes=["dialog"])
    updated2 = await ToolService.update_tool(db_session, tool.id, update_in2)

    assert updated2.usage_modes == ["dialog"]


@pytest.mark.asyncio
async def test_update_tool_clear_usage_modes(db_session: AsyncSession):
    """清空工具的 usage_modes 为 null"""
    tool_in = ToolCreate(
        slug="tool-clear-modes",
        name="清空模式工具",
        base_fee=10,
        usage_modes=["form", "dialog"]
    )
    tool = await ToolService.create_tool(db_session, tool_in)

    # 更新 usage_modes 为 None
    update_in = ToolUpdate(usage_modes=None)
    updated = await ToolService.update_tool(db_session, tool.id, update_in)

    assert updated.usage_modes is None


@pytest.mark.asyncio
async def test_get_tool_usage_modes_not_found(db_session: AsyncSession):
    """获取不存在的工具，验证返回 None"""
    found = await ToolService.get_tool_by_id(db_session, uuid.uuid4())
    assert found is None


@pytest.mark.asyncio
async def test_update_tool_usage_modes_not_found(db_session: AsyncSession):
    """更新不存在的工具，应抛出异常"""
    update_in = ToolUpdate(usage_modes=["form"])
    with pytest.raises(ToolNotFoundException):
        await ToolService.update_tool(db_session, uuid.uuid4(), update_in)


@pytest.mark.asyncio
async def test_delete_tool_usage_modes_not_found(db_session: AsyncSession):
    """删除不存在的工具，应抛出异常"""
    with pytest.raises(ToolNotFoundException):
        await ToolService.delete_tool(db_session, uuid.uuid4())
