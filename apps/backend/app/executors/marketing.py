"""
营销文案生成器 — HTTP 回调驱动模式

Celery Worker 接收到任务后，直接转交给外部平台（或模拟外部平台），
外部平台通过 POST /tasks/{id}/progress 驱动进度和完成。
"""
import uuid
import asyncio
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseToolExecutor


class MarketingExecutor(BaseToolExecutor):
    """营销文案执行器 — HTTP 回调驱动"""

    def __init__(
        self,
        task_id: uuid.UUID,
        db: AsyncSession,
        tool: Optional[Dict[str, Any]] = None,
        progress_callback=None
    ):
        super().__init__(task_id, db, progress_callback)
        self._tool_config = tool or {}

    def estimate_cost(self, params: Dict[str, Any]) -> int:
        base_fee = self._tool_config.get('base_fee', 8)
        return base_fee

    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行营销文案生成任务

        模拟外部平台处理流程：
        1. 阶段 0-30%: 需求分析
        2. 阶段 30-80%: 文案生成（多平台）
        3. 阶段 80-100%: 保存交付

        真实场景下，外部平台通过 POST /tasks/{id}/progress 驱动进度。
        """
        platform_count = params.get('platform_count', 3)
        total_steps = 3  # 需求分析 → 文案生成 → 保存

        # Step 1: 需求分析 (0-30%)
        await self.update_progress(
            percent=5, message="正在分析需求...",
            data={"step_index": 0, "total_steps": total_steps, "step_status": "running"}
        )
        await asyncio.sleep(1)
        await self.update_progress(
            percent=30, message="需求分析完成",
            data={"step_index": 0, "total_steps": total_steps, "step_status": "completed"}
        )

        # Step 2: 多平台文案生成 (30-80%)
        await self.update_progress(
            percent=35, message="正在生成文案...",
            data={"step_index": 1, "total_steps": total_steps, "step_status": "running"}
        )
        for i in range(platform_count):
            await asyncio.sleep(1)
            progress = 30 + int((i + 1) / platform_count * 50)
            await self.update_progress(
                percent=progress,
                message=f"正在生成第 {i+1}/{platform_count} 个平台文案...",
                data={"step_index": 1, "total_steps": total_steps, "step_status": "running",
                      "sub_progress": f"{i+1}/{platform_count}"}
            )
        await self.update_progress(
            percent=80, message="文案生成完成",
            data={"step_index": 1, "total_steps": total_steps, "step_status": "completed"}
        )

        # Step 3: 保存交付 (80-100%)
        await self.update_progress(
            percent=85, message="正在保存成果...",
            data={"step_index": 2, "total_steps": total_steps, "step_status": "running"}
        )
        await asyncio.sleep(1)
        await self.update_progress(
            percent=100, message="生成完成！",
            data={"step_index": 2, "total_steps": total_steps, "step_status": "completed"}
        )

        return {
            'success': True,
            'message': '营销文案生成完成',
            'platform_count': platform_count,
        }
