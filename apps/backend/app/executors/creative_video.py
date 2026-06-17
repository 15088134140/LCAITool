"""
创意视频生成器执行器
P0 跑通 Seedance 1.5 Pro 单条视频生成流程。
"""
import base64
import os
import uuid
from typing import Dict, Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseToolExecutor
from app.core.config import settings
from app.models.user_upload import UserUpload


class CreativeVideoExecutor(BaseToolExecutor):
    """创意视频生成器执行器"""

    SUPPORTED_RATIOS = {"adaptive", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"}
    SUPPORTED_RESOLUTIONS = {"480p", "720p", "1080p"}

    def __init__(
        self,
        task_id: uuid.UUID,
        db: AsyncSession,
        tool: Optional[Dict[str, Any]] = None,
        progress_callback=None
    ):
        super().__init__(task_id, db, tool=tool, progress_callback=progress_callback)
        self.doubao_provider = None  # lazy init

    def estimate_cost(self, params: Dict[str, Any]) -> int:
        """
        预估费用（P0 固定基础费用）
        :param params: 工具参数
        :return: 预估费用
        """
        return int(self._tool_config.get("base_fee", 10) or 10)

    def _validate_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        校验并规范化参数
        :param params: 原始参数字典
        :return: 规范化后的参数字典
        :raises ValueError: 参数无效时抛出
        """
        def _safe_str_to_bool(value: Any) -> bool:
            """安全的字符串转布尔值逻辑"""
            if isinstance(value, str):
                lower_val = value.strip().lower()
                if lower_val in ("false", "0", "no", "off"):
                    return False
                if lower_val in ("true", "1", "yes", "on"):
                    return True
            return bool(value)

        prompt = (params.get("prompt") or "").strip()
        first_frame = params.get("first_frame")
        last_frame = params.get("last_frame")

        try:
            quantity = int(params.get("quantity", 1))
        except (ValueError, TypeError):
            raise ValueError("quantity 必须是有效数字")

        ratio = params.get("ratio", "adaptive")
        resolution = params.get("resolution", "480p")
        duration_mode = params.get("duration_mode", "seconds")
        generate_audio = _safe_str_to_bool(params.get("generate_audio", True))

        # P0 仅支持生成 1 条视频
        if quantity != 1:
            raise ValueError("P0 仅支持生成 1 条视频")

        # 不能只上传尾帧
        if last_frame and not first_frame:
            raise ValueError("不能只上传尾帧，请先上传首帧参考图")

        # 文生视频模式下创意描述必填
        if not first_frame and not last_frame and not prompt:
            raise ValueError("文生视频模式下创意描述必填")

        # 验证分辨率
        if resolution not in self.SUPPORTED_RESOLUTIONS:
            supported = ", ".join(sorted(self.SUPPORTED_RESOLUTIONS))
            raise ValueError(f"不支持的分辨率。支持的分辨率：{supported}")

        # 验证视频比例
        if ratio not in self.SUPPORTED_RATIOS:
            supported = ", ".join(sorted(self.SUPPORTED_RATIOS))
            raise ValueError(f"不支持的视频比例。支持的比例：{supported}")

        # 处理时长
        if duration_mode == "smart":
            duration = -1
        else:
            try:
                duration = int(params.get("duration", 6))
            except (ValueError, TypeError):
                raise ValueError("duration 必须是有效数字")
            if duration < 4 or duration > 12:
                raise ValueError("视频时长必须在 4-12 秒之间")

        # 确定生成模式
        if first_frame and last_frame:
            mode = "first_last_frame"
        elif first_frame:
            mode = "first_frame"
        else:
            mode = "text_to_video"

        return {
            "mode": mode,
            "prompt": prompt,
            "first_frame": first_frame,
            "last_frame": last_frame,
            "ratio": ratio,
            "resolution": resolution,
            "duration": duration,
            "generate_audio": generate_audio,
            "quantity": 1,
        }

    async def _get_upload(self, upload_id: str, field_key: str) -> UserUpload:
        """
        获取并验证上传文件
        :param upload_id: 上传记录ID
        :param field_key: 参数字段key（用于验证匹配）
        :return: UserUpload 对象
        :raises ValueError: 任务不存在、上传不存在、字段不匹配、类型错误时抛出
        """
        from app.services.task_service import TaskService

        task = await TaskService.get_by_id(self.db, self.task_id)
        if not task:
            raise ValueError("任务不存在")

        try:
            upload_uuid = uuid.UUID(str(upload_id))
        except (ValueError, AttributeError):
            raise ValueError(f"无效的上传文件ID: {field_key}")

        result = await self.db.execute(
            select(UserUpload).where(
                UserUpload.id == upload_uuid,
                UserUpload.user_id == task.user_id,
            )
        )
        upload = result.scalar_one_or_none()

        if not upload:
            raise ValueError(f"上传文件不存在: {field_key}")

        if upload.field_key and upload.field_key != field_key:
            raise ValueError(f"上传文件字段不匹配: {field_key}")

        if upload.mime_type and not upload.mime_type.startswith("image/"):
            raise ValueError(f"{field_key} 必须是图片文件")

        return upload

    def _upload_to_data_url(self, upload: UserUpload) -> str:
        """
        将上传文件转换为 data URL 格式
        :param upload: UserUpload 对象
        :return: data URL 字符串
        :raises ValueError: 文件不存在或类型不支持时抛出
        """
        full_path = os.path.join(settings.STORAGE_DIR, str(upload.file_path))

        if not os.path.exists(full_path):
            raise ValueError(f"上传文件不存在或已被清理: {upload.file_name}")

        mime_type = upload.mime_type or "image/png"
        mime_type = mime_type.lower()

        if not mime_type.startswith("image/"):
            raise ValueError(f"不支持的图片类型: {mime_type}")

        with open(full_path, "rb") as f:
            file_bytes = f.read()

        encoded = base64.b64encode(file_bytes).decode("utf-8")
        return f"data:{mime_type};base64,{encoded}"

    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行视频生成任务（P0 未实现）
        :param params: 工具参数
        :return: 执行结果
        """
        raise NotImplementedError("P0 阶段仅实现参数校验和上传辅助方法")
