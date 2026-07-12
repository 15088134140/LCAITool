"""
create_task 参数提前校验单元测试

验证 _validate_task_params 在创建任务前复用执行器 _validate_params，
校验失败抛出 HTTPException(400)，由前端 toast 提示。
"""
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.tasks import _validate_task_params
from app.schemas.task import TaskCreate


def _make_tool(tool_id, executor_key="creative-video-generator"):
    """构造模拟 Tool 对象"""
    tool = MagicMock()
    tool.id = tool_id
    tool.executor_key = executor_key
    return tool


def _make_db(tool):
    """构造 mock db，execute 返回包含 tool 的结果"""
    mock_db = AsyncMock(spec=AsyncSession)
    result = MagicMock()
    result.scalar_one_or_none.return_value = tool
    mock_db.execute.return_value = result
    return mock_db


class TestValidateTaskParams:
    """create_task 提前校验测试"""

    @pytest.mark.asyncio
    async def test_rejects_text_to_video_without_prompt(self):
        """文生视频模式（无首帧/尾帧）+ 空 prompt -> 抛 400"""
        tool_id = uuid.uuid4()
        mock_db = _make_db(_make_tool(tool_id))

        task_in = TaskCreate(
            task_type="creative-video-generator",
            tool_id=tool_id,
            input_params={"prompt": "", "first_frame": None, "last_frame": None},
        )

        with pytest.raises(HTTPException) as exc_info:
            await _validate_task_params(mock_db, task_in)
        assert exc_info.value.status_code == 400
        assert "创意描述必填" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_rejects_text_to_video_with_none_prompt(self):
        """文生视频模式 + prompt=None -> 抛 400"""
        tool_id = uuid.uuid4()
        mock_db = _make_db(_make_tool(tool_id))

        task_in = TaskCreate(
            task_type="creative-video-generator",
            tool_id=tool_id,
            input_params={"prompt": None, "first_frame": None, "last_frame": None},
        )

        with pytest.raises(HTTPException) as exc_info:
            await _validate_task_params(mock_db, task_in)
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_passes_with_first_frame(self):
        """有首帧 + 空 prompt -> 通过（图生视频模式 prompt 可选）"""
        tool_id = uuid.uuid4()
        mock_db = _make_db(_make_tool(tool_id))

        task_in = TaskCreate(
            task_type="creative-video-generator",
            tool_id=tool_id,
            input_params={"prompt": "", "first_frame": "upload-first"},
        )

        await _validate_task_params(mock_db, task_in)  # 不应抛出异常

    @pytest.mark.asyncio
    async def test_passes_with_first_and_last_frame(self):
        """有首尾帧 + 空 prompt -> 通过"""
        tool_id = uuid.uuid4()
        mock_db = _make_db(_make_tool(tool_id))

        task_in = TaskCreate(
            task_type="creative-video-generator",
            tool_id=tool_id,
            input_params={
                "prompt": "",
                "first_frame": "upload-first",
                "last_frame": "upload-last",
            },
        )

        await _validate_task_params(mock_db, task_in)

    @pytest.mark.asyncio
    async def test_passes_with_prompt(self):
        """文生视频模式 + 有 prompt -> 通过"""
        tool_id = uuid.uuid4()
        mock_db = _make_db(_make_tool(tool_id))

        task_in = TaskCreate(
            task_type="creative-video-generator",
            tool_id=tool_id,
            input_params={"prompt": "猫打哈欠"},
        )

        await _validate_task_params(mock_db, task_in)

    @pytest.mark.asyncio
    async def test_skips_when_tool_not_found(self):
        """tool 不存在 -> 跳过（不抛异常）"""
        mock_db = AsyncMock(spec=AsyncSession)
        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = result

        task_in = TaskCreate(
            task_type="creative-video-generator",
            tool_id=uuid.uuid4(),
            input_params={"prompt": ""},
        )

        await _validate_task_params(mock_db, task_in)

    @pytest.mark.asyncio
    async def test_skips_when_no_tool_id(self):
        """tool_id 为 None -> 跳过且不查库"""
        mock_db = AsyncMock(spec=AsyncSession)
        task_in = TaskCreate(
            task_type="creative-video-generator",
            tool_id=None,
            input_params={"prompt": ""},
        )

        await _validate_task_params(mock_db, task_in)
        mock_db.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_skips_when_executor_has_no_validate_params(self):
        """执行器无 _validate_params（如 storybook）-> 跳过"""
        tool_id = uuid.uuid4()
        mock_db = _make_db(_make_tool(tool_id, executor_key="storybook-generator"))

        task_in = TaskCreate(
            task_type="storybook-generator",
            tool_id=tool_id,
            input_params={"theme": ""},  # 即使空也不应校验
        )

        await _validate_task_params(mock_db, task_in)

    @pytest.mark.asyncio
    async def test_rejects_last_frame_without_first_frame(self):
        """只上传尾帧 -> 抛 400（_validate_params 的"不能只上传尾帧"规则）"""
        tool_id = uuid.uuid4()
        mock_db = _make_db(_make_tool(tool_id))

        task_in = TaskCreate(
            task_type="creative-video-generator",
            tool_id=tool_id,
            input_params={"prompt": "", "last_frame": "upload-last"},
        )

        with pytest.raises(HTTPException) as exc_info:
            await _validate_task_params(mock_db, task_in)
        assert exc_info.value.status_code == 400
        assert "尾帧" in exc_info.value.detail
