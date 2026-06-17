"""
创意视频生成器执行器单元测试
"""
import base64
import os
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.executors.creative_video import CreativeVideoExecutor


@pytest.fixture
def mock_db():
    """模拟数据库会话"""
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def executor(mock_db):
    """创建执行器实例"""
    return CreativeVideoExecutor(
        task_id=uuid.uuid4(),
        db=mock_db,
        tool={"base_fee": 10}
    )


class TestCreativeVideoExecutor:
    """创意视频生成器执行器测试"""

    def test_estimate_cost_returns_base_fee(self, executor):
        """测试费用预估：固定基础费用，与参数无关"""
        cost = executor.estimate_cost({"prompt": "猫", "duration": 10})
        assert cost == 10

        cost_empty = executor.estimate_cost({})
        assert cost_empty == 10

    def test_estimate_cost_base_fee_none_returns_10(self, mock_db):
        """测试费用预估：base_fee 为 None 时默认返回 10"""
        executor = CreativeVideoExecutor(
            task_id=uuid.uuid4(),
            db=mock_db,
            tool={"base_fee": None}
        )
        cost = executor.estimate_cost({"prompt": "猫"})
        assert cost == 10

    @pytest.mark.parametrize("params,expected_message", [
        ({"prompt": "", "first_frame": None, "last_frame": None}, "文生视频模式下创意描述必填"),
        ({"prompt": None, "first_frame": None, "last_frame": None}, "文生视频模式下创意描述必填"),
        ({"prompt": "", "last_frame": "upload-last"}, "不能只上传尾帧"),
        ({"prompt": "猫", "quantity": 2}, "P0 仅支持生成 1 条视频"),
        ({"prompt": "猫", "duration_mode": "seconds", "duration": 3}, "视频时长必须在 4-12 秒之间"),
        ({"prompt": "猫", "resolution": "2k"}, "不支持的分辨率"),
        ({"prompt": "猫", "ratio": "2:1"}, "不支持的视频比例"),
    ])
    def test_validate_params_rejects_invalid_input(self, executor, params, expected_message):
        """测试参数校验拒绝无效输入"""
        with pytest.raises(ValueError, match=expected_message):
            executor._validate_params(params)

    @pytest.mark.parametrize("params,expected_mode", [
        ({"prompt": "猫"}, "text_to_video"),
        ({"prompt": "猫", "first_frame": "upload-first"}, "first_frame"),
        ({"prompt": "猫", "first_frame": "upload-first", "last_frame": "upload-last"}, "first_last_frame"),
    ])
    def test_validate_params_returns_generation_mode(self, executor, params, expected_mode):
        """测试参数校验返回正确的生成模式"""
        result = executor._validate_params(params)
        assert result["mode"] == expected_mode

    def test_duration_smart_maps_to_minus_one(self, executor):
        """测试 duration_mode smart 时 duration=-1"""
        result = executor._validate_params({
            "prompt": "猫",
            "duration_mode": "smart",
        })
        assert result["duration"] == -1

    def test_validate_params_generate_audio_false_string(self, executor):
        """测试 generate_audio='false' 字符串正确转换为 False"""
        result = executor._validate_params({
            "prompt": "猫",
            "generate_audio": "false",
        })
        assert result["generate_audio"] is False

    def test_validate_params_prompt_none_with_first_frame(self, executor):
        """测试 prompt=None 但有 first_frame 时应通过，标准化 prompt 为空字符串，mode 为 first_frame"""
        result = executor._validate_params({
            "prompt": None,
            "first_frame": "upload-first",
        })
        assert result["prompt"] == ""
        assert result["mode"] == "first_frame"

    @pytest.mark.parametrize("value,expected", [
        ("false", False),
        ("0", False),
        ("no", False),
        ("off", False),
        ("FALSE", False),
        ("False", False),
        ("true", True),
        ("1", True),
        ("yes", True),
        ("on", True),
        (True, True),
        (False, False),
    ])
    def test_validate_params_generate_audio_bool_conversion(self, executor, value, expected):
        """测试 generate_audio 各种输入值的布尔转换"""
        result = executor._validate_params({
            "prompt": "猫",
            "generate_audio": value,
        })
        assert result["generate_audio"] is expected

    @pytest.mark.parametrize("params,expected_message", [
        ({"prompt": "猫", "quantity": "abc"}, "quantity 必须是有效数字"),
        ({"prompt": "猫", "quantity": None}, "quantity 必须是有效数字"),
        ({"prompt": "猫", "duration": "abc"}, "duration 必须是有效数字"),
        ({"prompt": "猫", "duration": None}, "duration 必须是有效数字"),
    ])
    def test_validate_params_rejects_invalid_numbers(self, executor, params, expected_message):
        """测试参数校验拒绝无效数字输入"""
        with pytest.raises(ValueError, match=expected_message):
            executor._validate_params(params)

    def test_upload_to_data_url_reads_storage_file(self, executor, tmp_path):
        """测试上传文件转 data URL 正确读取存储文件"""
        # 创建模拟上传文件
        upload = MagicMock()
        upload.mime_type = "image/png"
        upload.file_path = "uploads/u/first.png"
        upload.file_name = "first.png"

        # 创建实际的目录和文件
        full_path = tmp_path / "uploads" / "u"
        full_path.mkdir(parents=True, exist_ok=True)
        png_file = full_path / "first.png"
        png_file.write_bytes(b"fake_png")

        # patch settings.STORAGE_DIR 到 tmp_path
        with patch("app.executors.creative_video.settings.STORAGE_DIR", str(tmp_path)):
            result = executor._upload_to_data_url(upload)

        # 验证结果是正确的 data URL
        assert result.startswith("data:image/png;base64,")
        encoded_part = result[len("data:image/png;base64,"):]
        decoded = base64.b64decode(encoded_part)
        assert decoded == b"fake_png"

    @pytest.mark.asyncio
    async def test_get_upload_task_not_found(self, executor):
        """测试 _get_upload：任务不存在时抛出 ValueError"""
        with patch("app.services.task_service.TaskService.get_by_id", return_value=None):
            with pytest.raises(ValueError, match="任务不存在"):
                await executor._get_upload(str(uuid.uuid4()), "first_frame")

    @pytest.mark.asyncio
    async def test_get_upload_upload_not_found(self, executor, mock_db):
        """测试 _get_upload：上传文件不存在时抛出 ValueError"""
        # 模拟任务存在
        mock_task = MagicMock()
        mock_task.user_id = uuid.uuid4()

        with patch("app.services.task_service.TaskService.get_by_id", return_value=mock_task):
            # 模拟数据库查询返回 None
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = None
            mock_db.execute.return_value = mock_result

            upload_id = str(uuid.uuid4())
            with pytest.raises(ValueError, match="上传文件不存在"):
                await executor._get_upload(upload_id, "first_frame")

    @pytest.mark.asyncio
    async def test_get_upload_field_key_mismatch(self, executor, mock_db):
        """测试 _get_upload：上传文件字段不匹配时抛出 ValueError"""
        # 模拟任务存在
        mock_task = MagicMock()
        mock_task.user_id = uuid.uuid4()

        # 模拟上传文件，但 field_key 不匹配
        mock_upload = MagicMock()
        mock_upload.field_key = "last_frame"  # 应为 first_frame

        with patch("app.services.task_service.TaskService.get_by_id", return_value=mock_task):
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_upload
            mock_db.execute.return_value = mock_result

            upload_id = str(uuid.uuid4())
            with pytest.raises(ValueError, match="上传文件字段不匹配"):
                await executor._get_upload(upload_id, "first_frame")

    @pytest.mark.asyncio
    async def test_get_upload_not_image_mime(self, executor, mock_db):
        """测试 _get_upload：非图片 MIME 类型时抛出 ValueError"""
        # 模拟任务存在
        mock_task = MagicMock()
        mock_task.user_id = uuid.uuid4()

        # 模拟上传文件，但类型不是图片
        mock_upload = MagicMock()
        mock_upload.field_key = "first_frame"
        mock_upload.mime_type = "video/mp4"

        with patch("app.services.task_service.TaskService.get_by_id", return_value=mock_task):
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_upload
            mock_db.execute.return_value = mock_result

            upload_id = str(uuid.uuid4())
            with pytest.raises(ValueError, match="必须是图片文件"):
                await executor._get_upload(upload_id, "first_frame")

    @pytest.mark.asyncio
    async def test_get_upload_success(self, executor, mock_db):
        """测试 _get_upload：正常返回 upload 对象"""
        # 模拟任务存在
        mock_task = MagicMock()
        mock_task.user_id = uuid.uuid4()

        # 模拟上传文件
        mock_upload = MagicMock()
        mock_upload.field_key = "first_frame"
        mock_upload.mime_type = "image/png"

        with patch("app.services.task_service.TaskService.get_by_id", return_value=mock_task):
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_upload
            mock_db.execute.return_value = mock_result

            upload_id = str(uuid.uuid4())
            result = await executor._get_upload(upload_id, "first_frame")

            assert result == mock_upload
