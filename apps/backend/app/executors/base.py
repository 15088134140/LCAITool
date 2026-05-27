"""
工具执行器抽象基类
定义所有工具执行器需要实现的接口
"""
import asyncio
import os
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Callable, Awaitable

import aiofiles
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.services.task_service import TaskService


@dataclass
class ProgressEvent:
    """进度事件数据结构"""
    percent: int = 0
    message: str = ""
    step_index: int = 0
    total_steps: int = 1
    step_status: str = "running"  # running | completed | pending
    sub_progress: Optional[str] = None  # 如 "3/10"


class BaseToolExecutor(ABC):
    """工具执行器抽象基类"""

    def __init__(
        self,
        task_id: uuid.UUID,
        db: AsyncSession,
        tool: Optional[Dict[str, Any]] = None,
        progress_callback: Optional[Callable[[int, str, Optional[Dict[str, Any]]], Awaitable[None]]] = None
    ):
        """
        初始化执行器
        :param task_id: 任务ID
        :param db: 数据库会话
        :param tool: 工具配置字典
        :param progress_callback: 进度回调函数 (percent, message, data) -> None
        """
        self.task_id = task_id
        self.db = db
        self._snapshot: Optional[Dict[str, Any]] = None
        self._progress_callback = progress_callback
        self._tool_config = tool or {}
        self._prompts_lock = asyncio.Lock()

    @abstractmethod
    def estimate_cost(self, params: Dict[str, Any]) -> int:
        """
        预估费用（积分）
        :param params: 工具参数
        :return: 预估费用
        """
        pass

    @abstractmethod
    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行任务，返回成果数据
        :param params: 工具参数
        :return: 执行结果数据
        """
        pass

    async def update_progress(
        self,
        percent: int,
        message: str,
        data: Optional[Dict[str, Any]] = None,
        step_index: Optional[int] = None,
        total_steps: Optional[int] = None,
        step_status: Optional[str] = None,
        sub_progress: Optional[str] = None,
    ) -> None:
        """更新任务进度（结构化版本）"""
        # 构建结构化数据
        progress_data = data or {}
        if step_index is not None:
            progress_data['step_index'] = step_index
        if total_steps is not None:
            progress_data['total_steps'] = total_steps
        if step_status is not None:
            progress_data['step_status'] = step_status
        if sub_progress is not None:
            progress_data['sub_progress'] = sub_progress

        await TaskService.update_task_status(
            db=self.db,
            task_id=self.task_id,
            progress=percent,
            message=message
        )

        # 自动写 TaskLog
        await TaskService.add_task_log(
            db=self.db,
            task_id=self.task_id,
            level="info",
            message=message,
            details=progress_data
        )

        if self._progress_callback:
            await self._progress_callback(percent, message, progress_data)

    async def add_log(self, level: str, message: str, details: Optional[Dict[str, Any]] = None) -> None:
        """
        添加任务日志
        :param level: 日志级别 (debug, info, warn, error)
        :param message: 日志消息
        :param details: 详细信息
        """
        await TaskService.add_task_log(
            db=self.db,
            task_id=self.task_id,
            level=level,
            message=message,
            details=details
        )

    async def save_snapshot(self, snapshot_data: Dict[str, Any]) -> None:
        """
        保存执行快照（用于断点续跑）
        :param snapshot_data: 快照数据
        """
        self._snapshot = snapshot_data
        await TaskService.save_snapshot(
            db=self.db,
            task_id=self.task_id,
            snapshot_data=snapshot_data
        )

    async def get_snapshot(self) -> Optional[Dict[str, Any]]:
        """
        获取执行快照
        :return: 快照数据
        """
        if self._snapshot is None:
            self._snapshot = await TaskService.get_snapshot(
                db=self.db,
                task_id=self.task_id
            )
        return self._snapshot

    def get_works_dir(self) -> str:
        """获取任务持久化工作目录"""
        works_dir = os.path.join(settings.WORKS_DIR, str(self.task_id))
        os.makedirs(os.path.join(works_dir, 'images'), exist_ok=True)
        os.makedirs(os.path.join(works_dir, 'audio'), exist_ok=True)
        return works_dir

    def _build_prompts_header(self) -> str:
        """构建 prompts.md 文件头"""
        now = datetime.now(timezone.utc).astimezone().strftime('%Y-%m-%d %H:%M:%S')
        return (
            "# 提示词记录\n\n"
            f"任务：{str(self.task_id)}\n"
            f"执行时间：{now}\n\n"
            "---\n"
        )

    def _build_llm_section(
        self,
        step_name: str,
        model: str,
        prompt: str,
        response: Any,
        response_type: str = "text",
        system_prompt: Optional[str] = None,
        duration: Optional[float] = None,
        usage: Optional[Dict[str, Any]] = None,
        extra_info: Optional[str] = None,
    ) -> str:
        """构建单次 LLM 交互的 Markdown section"""
        lines = [f"\n## {step_name}\n"]
        lines.append(f"- **模型**: {model}")
        if duration is not None:
            lines.append(f"- **耗时**: {duration:.1f}s")
        if usage and 'input' in usage:
            input_tokens = usage.get('input', '?')
            output_tokens = usage.get('output', '?')
            lines.append(f"- **Token数**: 输入 {input_tokens} / 输出 {output_tokens}")
        if response_type != "text":
            lines.append(f"- **类型**: {'图片' if response_type == 'image' else '音频'}")
        if extra_info:
            lines.append(f"- **{extra_info}**")
        lines.append("")

        if system_prompt:
            lines.append("### System Prompt\n")
            lines.append(system_prompt)
            lines.append("")

        if response_type == "text":
            if system_prompt:
                lines.append("### User Prompt\n")
            else:
                lines.append("### Prompt\n")
            lines.append(prompt)
            lines.append("")
            lines.append("### Response\n")
            response_text = response.content if hasattr(response, 'content') else str(response)
            lines.append(response_text)
        elif response_type == "image":
            lines.append("### Prompt\n")
            lines.append(prompt)
            lines.append("")
            lines.append("### Response\n")
            lines.append("（响应内容为图片数据，不记录）")
        elif response_type == "audio":
            lines.append("### Text\n")
            lines.append(prompt)
            lines.append("")
            lines.append("### Response\n")
            lines.append("（响应内容为音频数据，不记录）")

        lines.append("\n---")
        return "\n".join(lines)

    async def _record_llm_interaction(
        self,
        step_name: str,
        model: str,
        prompt: str,
        response: Any,
        response_type: str = "text",
        system_prompt: Optional[str] = None,
        duration: Optional[float] = None,
        usage: Optional[Dict[str, Any]] = None,
        extra_info: Optional[str] = None,
    ) -> None:
        """
        记录一次 LLM 交互到 prompts.md（协程安全，使用 asyncio.Lock）

        :param step_name: 步骤名称，如 "故事大纲生成"
        :param model: 模型名称，如 "deepseek-v4-pro"
        :param prompt: 发送给模型的提示词文本
        :param response: 模型响应
        :param response_type: "text" | "image" | "audio"
        :param system_prompt: 可选的 system prompt
        :param duration: 调用耗时（秒）
        :param usage: Token 用量 {"input": N, "output": N}
        :param extra_info: 额外信息字符串，如 "第 3/5 张图片"
        """
        if not self._tool_config.get('is_prompt_logging_enabled', False):
            return

        try:
            async with self._prompts_lock:
                works_dir = self.get_works_dir()
                filepath = os.path.join(works_dir, 'prompts.md')

                if not os.path.exists(filepath):
                    header = self._build_prompts_header()
                    async with aiofiles.open(filepath, 'w', encoding='utf-8') as f:
                        await f.write(header)

                section = self._build_llm_section(
                    step_name=step_name,
                    model=model,
                    prompt=prompt,
                    response=response,
                    response_type=response_type,
                    system_prompt=system_prompt,
                    duration=duration,
                    usage=usage,
                    extra_info=extra_info,
                )
                async with aiofiles.open(filepath, 'a', encoding='utf-8') as f:
                    await f.write(section)
        except Exception:
            import logging
            logging.getLogger(__name__).exception("记录 LLM 交互到 prompts.md 失败")

    async def _mock_execute(self) -> Dict[str, Any]:
        """Mock 执行模式：模拟完整的多步执行流程，不调用外部 AI API"""
        import base64
        import struct
        import zlib
        import math
        import wave
        from app.services.task_service import TaskService
        from app.services.work_service import WorkService
        from app.schemas.task import WorkCreate, WorkFileCreate
        from app.models.task import WorkFile

        task = await TaskService.get_by_id(db=self.db, task_id=self.task_id)
        user_id = task.user_id if task else self.task_id
        tool_id = task.tool_id if task else None

        IMAGE_COUNT = 10  # 生成 10 张图片
        TOTAL_STEPS = 7

        # ── Step 0: 生成故事大纲 ──
        await self.update_progress(
            percent=5, message="正在生成故事大纲...",
            step_index=0, total_steps=TOTAL_STEPS, step_status='running',
        )
        await asyncio.sleep(0.5)

        # ── Step 1: 生成分页故事 ──
        await self.update_progress(
            percent=15, message="正在生成分页故事...",
            step_index=1, total_steps=TOTAL_STEPS, step_status='running',
        )
        await asyncio.sleep(0.5)

        # ── Step 2: 生成插画提示词 ──
        await self.update_progress(
            percent=25, message="正在生成插画提示词...",
            step_index=2, total_steps=TOTAL_STEPS, step_status='running',
        )
        await asyncio.sleep(0.5)

        # ── Step 3: 批量生成插画（逐张推进，子进度 1/10 → 10/10） ──
        for i in range(1, IMAGE_COUNT + 1):
            pct = 35 + int(i / IMAGE_COUNT * 25)  # 35% → 60%
            await self.update_progress(
                percent=pct,
                message="正在生成插画...",
                step_index=3, total_steps=TOTAL_STEPS, step_status='running',
                sub_progress=f"{i}/{IMAGE_COUNT}"
            )
            await asyncio.sleep(0.3)

        # ── Step 4: 语音合成（逐段推进） ──
        for i in range(1, IMAGE_COUNT + 1):
            pct = 60 + int(i / IMAGE_COUNT * 20)  # 60% → 80%
            await self.update_progress(
                percent=pct,
                message="正在生成语音...",
                step_index=4, total_steps=TOTAL_STEPS, step_status='running',
                sub_progress=f"{i}/{IMAGE_COUNT}"
            )
            await asyncio.sleep(0.2)

        # ── Step 5: PDF排版 ──
        await self.update_progress(
            percent=85, message="正在生成PDF...",
            step_index=5, total_steps=TOTAL_STEPS, step_status='running',
        )
        await asyncio.sleep(0.5)

        # ── Step 6: 保存成果 ──
        await self.update_progress(
            percent=95, message="正在保存成果...",
            step_index=6, total_steps=TOTAL_STEPS, step_status='running',
        )
        await asyncio.sleep(0.3)

        await self.update_progress(
            percent=100, message="生成完成！",
            step_index=6, total_steps=TOTAL_STEPS, step_status='completed',
        )

        # ── 创建成果记录和文件 ──
        works_dir = settings.WORKS_DIR
        task_dir = os.path.join(works_dir, str(self.task_id))

        # 生成占位 PNG
        def _make_png(r, g, b):
            def _chunk(ctype, data):
                c = ctype + data
                crc = struct.pack('>I', 0xffffffff & (
                    lambda x: x if x <= 0x7fffffff else x - 0x100000000)(
                    zlib.crc32(c) & 0xffffffff))
                return struct.pack('>I', len(data)) + c + crc
            ihdr = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
            raw = b'\x00' + bytes([r, g, b])
            return (b'\x89PNG\r\n\x1a\n'
                    + _chunk(b'IHDR', ihdr)
                    + _chunk(b'IDAT', zlib.compress(raw))
                    + _chunk(b'IEND', b''))

        minimal_png = _make_png(240, 248, 255)

        work_in = WorkCreate(
            user_id=user_id,
            task_id=self.task_id,
            tool_id=tool_id,
            title="Mock 生成成果",
            description="AI Mock 模式生成的测试成果",
            status="published",
            is_public=False,
            version=1,
        )
        work = await WorkService.create_work(self.db, work_in)

        # 生成 10 张图片和 10 段音频文件
        for page in range(1, IMAGE_COUNT + 1):
            # 图片
            img_rel = f"images/page_{page}.png"
            img_abs = os.path.join(task_dir, img_rel)
            os.makedirs(os.path.dirname(img_abs), exist_ok=True)
            with open(img_abs, "wb") as f:
                f.write(minimal_png)

            self.db.add(WorkFile(**WorkFileCreate(
                work_id=work.id,
                file_name=f"page_{page}.png",
                file_url=img_rel,
                file_type="image",
                page_number=page,
                mime_type="image/png",
            ).model_dump()))

            # 音频
            audio_rel = f"audio/page_{page}.wav"
            audio_abs = os.path.join(task_dir, audio_rel)
            os.makedirs(os.path.dirname(audio_abs), exist_ok=True)
            with wave.open(audio_abs, 'w') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(8000)
                for s in range(8000):
                    val = int(32767 * 0.3 * math.sin(2 * math.pi * 440 * s / 8000))
                    wf.writeframes(struct.pack('<h', val))

            self.db.add(WorkFile(**WorkFileCreate(
                work_id=work.id,
                file_name=f"page_{page}.wav",
                file_url=audio_rel,
                file_type="audio",
                page_number=page,
                mime_type="audio/wav",
            ).model_dump()))

        # PDF 文件
        pdf_rel = "storybook.pdf"
        pdf_abs = os.path.join(task_dir, pdf_rel)
        os.makedirs(os.path.dirname(pdf_abs), exist_ok=True)
        with open(pdf_abs, "wb") as f:
            f.write(b"%PDF-1.4 mock placeholder\n")

        self.db.add(WorkFile(**WorkFileCreate(
            work_id=work.id,
            file_name="storybook.pdf",
            file_url=pdf_rel,
            file_type="pdf",
            mime_type="application/pdf",
        ).model_dump()))

        await self.db.commit()

        # 先设置 result_preview，再 complete_task
        task_before = await TaskService.get_by_id(db=self.db, task_id=self.task_id)
        if task_before:
            task_before.result_preview = str(work.id)
            await self.db.commit()
            await self.db.refresh(task_before)

        # 使用 estimate_cost() 计算实际费用，而不是仅用 base_fee
        task = await TaskService.get_by_id(db=self.db, task_id=self.task_id)
        input_params = task.input_params if task else {}
        actual_cost = self.estimate_cost(input_params)

        await TaskService.complete_task(
            db=self.db,
            task_id=self.task_id,
            actual_cost=actual_cost,
        )

        return {"success": True, "work_id": str(work.id)}
