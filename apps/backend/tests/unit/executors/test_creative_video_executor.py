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
from app.providers.ai.base import AIResponse


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

    @pytest.mark.asyncio
    async def test_build_video_images_resolves_first_and_last_uploads(self, executor):
        """测试 _build_video_images：解析首帧和尾帧并转换为 data URL"""
        first_upload = MagicMock()
        last_upload = MagicMock()

        async def mock_get_upload(upload_id, field_key):
            if upload_id == "first-id":
                return first_upload
            elif upload_id == "last-id":
                return last_upload
            raise ValueError(f"Unknown upload: {upload_id}")

        def mock_upload_to_data_url(upload):
            if upload == first_upload:
                return "data:image/png;base64,first"
            elif upload == last_upload:
                return "data:image/png;base64,last"
            return ""

        with patch.object(executor, "_get_upload", side_effect=mock_get_upload):
            with patch.object(executor, "_upload_to_data_url", side_effect=mock_upload_to_data_url):
                result = await executor._build_video_images({
                    "first_frame": "first-id",
                    "last_frame": "last-id"
                })

        assert len(result) == 2
        assert result[0]["role"] == "first_frame"
        assert result[0]["url"] == "data:image/png;base64,first"
        assert result[1]["role"] == "last_frame"
        assert result[1]["url"] == "data:image/png;base64,last"

    @pytest.mark.asyncio
    async def test_execute_calls_provider_with_seedance_p0_arguments(self, executor, tmp_path):
        """测试 execute 调用 provider 时传递正确的 Seedance P0 参数"""
        # Setup mock provider
        mock_provider = AsyncMock()
        mock_provider.generate_video.return_value = AIResponse(
            success=True,
            content=base64.b64encode(b"fake_video").decode("utf-8"),
            raw_response={"content": {"video_url": "https://example.com/video.mp4"}},
            usage={"total_tokens": 10}
        )
        executor.doubao_provider = mock_provider

        first_image = {"role": "first_frame", "url": "data:image/png;base64,abc"}

        with patch.object(executor, "get_works_dir", return_value=str(tmp_path)):
            with patch.object(executor, "_init_providers", new_callable=AsyncMock):
                with patch.object(executor, "_build_video_images", return_value=[first_image], new_callable=AsyncMock):
                    with patch.object(executor, "_create_work_record", return_value=MagicMock(id=uuid.uuid4()), new_callable=AsyncMock):
                        with patch.object(executor, "update_progress", new_callable=AsyncMock):
                            with patch.object(executor, "add_log", new_callable=AsyncMock):
                                result = await executor.execute({
                                    "prompt": "猫打哈欠",
                                    "first_frame": "first-id",
                                    "ratio": "adaptive",
                                    "resolution": "1080p",
                                    "duration_mode": "smart",
                                    "quantity": 1,
                                    "generate_audio": False
                                })

        # 验证返回结果
        assert result["success"] is True

        # 验证视频文件已写入
        video_file = tmp_path / "videos" / "creative_video.mp4"
        assert video_file.exists()
        assert video_file.read_bytes() == b"fake_video"

        # 验证 provider 调用参数
        mock_provider.generate_video.assert_awaited_once_with(
            prompt="猫打哈欠",
            duration=-1,
            model="doubao-seedance-1-5-pro-251215",
            images=[first_image],
            resolution="1080p",
            ratio="adaptive",
            generate_audio=False,
            return_last_frame=True,
            watermark=False,
            max_polls=120,
            poll_interval=5
        )

    @pytest.mark.asyncio
    async def test_execute_result_data_contains_normalized_nested(self, executor, tmp_path):
        """测试 execute 传递给 _create_work_record 的 result_data 包含嵌套的 normalized 字段"""
        # Setup mock provider
        mock_provider = AsyncMock()
        mock_provider.generate_video.return_value = AIResponse(
            success=True,
            content=base64.b64encode(b"fake_video").decode("utf-8"),
            raw_response={"content": {"video_url": "https://example.com/video.mp4"}},
            usage={"total_tokens": 10}
        )
        executor.doubao_provider = mock_provider

        first_image = {"role": "first_frame", "url": "data:image/png;base64,abc"}
        mock_work = MagicMock(id=uuid.uuid4())

        with patch.object(executor, "get_works_dir", return_value=str(tmp_path)):
            with patch.object(executor, "_init_providers", new_callable=AsyncMock):
                with patch.object(executor, "_build_video_images", return_value=[first_image], new_callable=AsyncMock):
                    with patch.object(executor, "_create_work_record", return_value=mock_work, new_callable=AsyncMock) as mock_create_work:
                        with patch.object(executor, "update_progress", new_callable=AsyncMock):
                            with patch.object(executor, "add_log", new_callable=AsyncMock):
                                await executor.execute({
                                    "prompt": "猫打哈欠",
                                    "first_frame": "first-id",
                                    "ratio": "adaptive",
                                    "resolution": "1080p",
                                    "duration_mode": "smart",
                                    "quantity": 1,
                                    "generate_audio": False
                                })

        # 验证 _create_work_record 被调用时第二个参数包含 normalized 嵌套结构
        call_args = mock_create_work.await_args
        assert call_args is not None
        result_data = call_args[0][1]  # 第二个参数是 result_data

        # 验证 nested structure - 这是本次修复的核心验证点
        assert "normalized" in result_data
        assert result_data["normalized"]["duration"] == -1
        assert result_data["normalized"]["prompt"] == "猫打哈欠"

        # 验证其他顶级字段保留
        assert "video_path" in result_data
        assert "video_size" in result_data
        assert "provider_raw_response" in result_data
        assert "usage" in result_data

    @pytest.mark.asyncio
    async def test_execute_raises_when_provider_fails(self, executor):
        """测试 execute：provider 返回失败时抛出 RuntimeError"""
        mock_provider = AsyncMock()
        mock_provider.generate_video.return_value = AIResponse(
            success=False,
            content="",
            raw_response={},
            error="Ark error"
        )
        executor.doubao_provider = mock_provider

        with patch.object(executor, "_init_providers", new_callable=AsyncMock):
            with patch.object(executor, "_build_video_images", return_value=[], new_callable=AsyncMock):
                with patch.object(executor, "update_progress", new_callable=AsyncMock):
                    with pytest.raises(RuntimeError, match="Ark error"):
                        await executor.execute({"prompt": "猫", "quantity": 1})

    @pytest.mark.asyncio
    async def test_execute_raises_when_base64_decode_fails(self, executor, tmp_path):
        """测试 execute：provider 返回无效 base64 时抛出 RuntimeError 包含中文错误"""
        # Setup mock provider 返回无效 base64 内容
        mock_provider = AsyncMock()
        mock_provider.generate_video.return_value = AIResponse(
            success=True,
            content="invalid-base64!!!",  # 无效的 base64
            raw_response={},
            usage={}
        )
        executor.doubao_provider = mock_provider

        with patch.object(executor, "get_works_dir", return_value=str(tmp_path)):
            with patch.object(executor, "_init_providers", new_callable=AsyncMock):
                with patch.object(executor, "_build_video_images", return_value=[], new_callable=AsyncMock):
                    with patch.object(executor, "update_progress", new_callable=AsyncMock):
                        with pytest.raises(RuntimeError, match="视频数据解码失败"):
                            await executor.execute({"prompt": "猫", "quantity": 1})

    @pytest.mark.asyncio
    async def test_create_work_record_creates_work_and_file_correctly(self, executor, mock_db):
        """测试 _create_work_record：验证 Work 创建参数、WorkFile 添加、task 预览更新和事务操作"""
        user_id = uuid.uuid4()
        tool_id = uuid.uuid4()
        work_id = uuid.uuid4()

        # 模拟 task
        mock_task = MagicMock()
        mock_task.user_id = user_id
        mock_task.tool_id = tool_id
        mock_task.result_preview = None

        # 模拟 TaskService.get_by_id 返回 task
        with patch("app.services.task_service.TaskService.get_by_id", return_value=mock_task, new_callable=AsyncMock):
            # 模拟 WorkService.create_work 返回带 id 的 work
            mock_work = MagicMock()
            mock_work.id = work_id
            with patch("app.services.work_service.WorkService.create_work", return_value=mock_work, new_callable=AsyncMock) as mock_create_work:
                params = {}
                result_data = {
                    "normalized": {
                        "prompt": "一只可爱的猫咪在阳光下打哈欠",
                        "mode": "text_to_video",
                        "ratio": "16:9",
                        "resolution": "1080p",
                        "duration": 6,
                        "generate_audio": True
                    },
                    "video_size": 123456
                }

                result = await executor._create_work_record(params, result_data)

        # 验证 WorkService.create_work 被调用且参数正确
        mock_create_work.assert_awaited_once()
        work_create_call = mock_create_work.await_args[0][1]  # WorkCreate 参数
        assert work_create_call.user_id == user_id
        assert work_create_call.task_id == executor.task_id
        assert work_create_call.tool_id == tool_id
        assert work_create_call.status == "published"
        assert work_create_call.is_public is False
        assert work_create_call.title == "一只可爱的猫咪在阳光下打哈欠"
        assert work_create_call.version == 1

        # 验证 db.add 被调用添加 WorkFile 且字段正确
        mock_db.add.assert_called_once()
        added_work_file = mock_db.add.call_args[0][0]
        assert added_work_file.file_type == "video"
        assert added_work_file.file_name == "creative_video.mp4"
        assert added_work_file.file_url == "videos/creative_video.mp4"
        assert added_work_file.file_size == 123456
        assert added_work_file.mime_type == "video/mp4"
        assert added_work_file.is_preview is True

        # 验证 task.result_preview 被设置为 work.id
        assert mock_task.result_preview == str(work_id)

        # 验证 flush/commit/refresh 被调用
        mock_db.flush.assert_awaited_once()
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once_with(mock_work)

        assert result == mock_work

    @pytest.mark.asyncio
    async def test_create_work_record_default_title_when_prompt_empty(self, executor, mock_db):
        """测试 _create_work_record：prompt 为空时 title 为"创意视频生成" """
        user_id = uuid.uuid4()
        tool_id = uuid.uuid4()
        work_id = uuid.uuid4()

        mock_task = MagicMock()
        mock_task.user_id = user_id
        mock_task.tool_id = tool_id
        mock_task.result_preview = None

        with patch("app.services.task_service.TaskService.get_by_id", return_value=mock_task, new_callable=AsyncMock):
            mock_work = MagicMock()
            mock_work.id = work_id
            with patch("app.services.work_service.WorkService.create_work", return_value=mock_work, new_callable=AsyncMock) as mock_create_work:
                result_data = {
                    "normalized": {
                        "prompt": "",  # prompt 为空
                        "mode": "text_to_video",
                        "ratio": "16:9",
                        "resolution": "1080p",
                        "duration": 6,
                        "generate_audio": True
                    },
                    "video_size": 123456
                }

                await executor._create_work_record({}, result_data)

        # 验证 title 为默认值
        work_create_call = mock_create_work.await_args[0][1]
        assert work_create_call.title == "创意视频生成"
