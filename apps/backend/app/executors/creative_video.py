"""
创意视频生成器执行器
P0 跑通 Seedance 1.5 Pro 单条视频生成流程。
"""
import base64
import binascii
import os
import uuid
from typing import Dict, Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseToolExecutor
from app.core.config import settings
from app.models.task import WorkFile
from app.models.user_upload import UserUpload
from app.providers.ai import AIProviderFactory
from app.schemas.task import WorkCreate, WorkFileCreate
from app.services.task_service import TaskService
from app.services.work_service import WorkService


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

    async def _init_providers(self) -> None:
        """
        初始化 AI Provider（懒加载）
        """
        if self.doubao_provider is None:
            self.doubao_provider = await AIProviderFactory.get_provider_from_db(self.db, "volcano")

    async def _build_video_images(self, normalized: Dict[str, Any]) -> list:
        """
        构建视频生成的参考图片列表
        :param normalized: 规范化后的参数
        :return: 图片列表，每项包含 role 和 url
        """
        images = []
        if normalized.get("first_frame"):
            first_upload = await self._get_upload(normalized["first_frame"], "first_frame")
            first_data_url = self._upload_to_data_url(first_upload)
            images.append({"role": "first_frame", "url": first_data_url})

        if normalized.get("last_frame"):
            last_upload = await self._get_upload(normalized["last_frame"], "last_frame")
            last_data_url = self._upload_to_data_url(last_upload)
            images.append({"role": "last_frame", "url": last_data_url})

        return images

    async def _create_work_record(self, params: Dict[str, Any], result_data: Dict[str, Any]):
        """
        创建成果记录和关联的视频文件
        :param params: 原始参数
        :param result_data: 执行结果数据
        :return: 创建的 Work 实例
        """
        task = await TaskService.get_by_id(self.db, self.task_id)
        if not task:
            raise RuntimeError("任务不存在")

        normalized = result_data["normalized"]

        # 构建标题：取 prompt 前20个字符，或默认值
        prompt_text = normalized.get("prompt") or ""
        if prompt_text:
            title = prompt_text[:20]
            if len(prompt_text) > 20:
                title += "..."
        else:
            title = "创意视频生成"

        # 构建描述
        mode_desc = {
            "text_to_video": "文生视频",
            "first_frame": "首帧参考",
            "first_last_frame": "首尾帧参考"
        }.get(normalized["mode"], normalized["mode"])

        duration_text = "智能" if normalized["duration"] == -1 else f"{normalized['duration']}秒"
        description_parts = [
            f"模式: {mode_desc}",
            f"比例: {normalized['ratio']}",
            f"分辨率: {normalized['resolution']}",
            f"时长: {duration_text}",
            f"音频: {'是' if normalized['generate_audio'] else '否'}"
        ]
        description = " | ".join(description_parts)

        # 创建成果
        work = await WorkService.create_work(
            self.db,
            WorkCreate(
                user_id=task.user_id,
                task_id=self.task_id,
                tool_id=task.tool_id,
                title=title,
                description=description,
                status="published",
                is_public=False,
                version=1
            )
        )

        # 添加成果文件
        self.db.add(WorkFile(
            **WorkFileCreate(
                work_id=work.id,
                file_type="video",
                file_name="creative_video.mp4",
                file_url="videos/creative_video.mp4",
                file_size=result_data.get("video_size", 0),
                mime_type="video/mp4",
                is_preview=True
            ).model_dump()
        ))

        # 更新任务预览
        task.result_preview = str(work.id)

        # 一次 flush/commit 确保事务一致性
        await self.db.flush()
        await self.db.commit()
        await self.db.refresh(work)
        return work

    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行视频生成任务
        :param params: 工具参数
        :return: 执行结果，包含 work_id 和文件信息
        """
        await self._init_providers()

        # 参数校验
        normalized = self._validate_params(params)

        # 准备工作目录
        works_dir = self.get_works_dir()
        videos_dir = os.path.join(works_dir, "videos")
        os.makedirs(videos_dir, exist_ok=True)

        # 进度更新：校验素材
        await self.update_progress(5, "校验素材")

        # 构建参考图片
        images = await self._build_video_images(normalized)

        # 进度更新：提交 Seedance
        await self.update_progress(15, "提交 Seedance 视频生成")

        # 调用 Provider 生成视频
        response = await self.doubao_provider.generate_video(
            prompt=normalized["prompt"],
            duration=normalized["duration"],
            model="doubao-seedance-1-5-pro-251215",
            images=images,
            resolution=normalized["resolution"],
            ratio=normalized["ratio"],
            generate_audio=normalized["generate_audio"],
            return_last_frame=True,
            watermark=False,
            max_polls=120,
            poll_interval=5
        )

        if not response.success:
            raise RuntimeError(response.error or "Seedance 视频生成失败")

        # 进度更新：保存视频
        await self.update_progress(90, "保存视频")

        # 解码并保存视频
        try:
            video_bytes = base64.b64decode(response.content)
        except (binascii.Error, ValueError) as e:
            raise RuntimeError(f"视频数据解码失败: {str(e)}")

        video_path = os.path.join(videos_dir, "creative_video.mp4")
        with open(video_path, "wb") as f:
            f.write(video_bytes)

        video_size = len(video_bytes)

        result_data = {
            "normalized": normalized,
            "video_path": video_path,
            "video_size": video_size,
            "provider_raw_response": response.raw_response,
            "usage": response.usage
        }

        # 创建成果记录
        work = await self._create_work_record(params, result_data)

        # 进度更新：完成
        await self.update_progress(100, "完成")
        await self.add_log("info", f"创意视频生成完成，成果 ID: {work.id}")

        return {
            "success": True,
            "work_id": str(work.id),
            "files": {
                "video": "videos/creative_video.mp4"
            }
        }
