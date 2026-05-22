"""
工具执行器抽象基类
定义所有工具执行器需要实现的接口
"""
import asyncio
import os
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Any, Optional, Callable, Awaitable
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
        progress_callback: Optional[Callable[[int, str, Optional[Dict[str, Any]]], Awaitable[None]]] = None
    ):
        """
        初始化执行器
        :param task_id: 任务ID
        :param db: 数据库会话
        :param progress_callback: 进度回调函数 (percent, message, data) -> None
        """
        self.task_id = task_id
        self.db = db
        self._snapshot: Optional[Dict[str, Any]] = None
        self._progress_callback = progress_callback

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

    async def _mock_execute(self) -> Dict[str, Any]:
        """Mock 执行模式：模拟完整的多步执行流程，不调用外部 AI API"""
        from app.services.task_service import TaskService
        from app.services.work_service import WorkService
        from app.schemas.task import WorkCreate, WorkFileCreate
        from app.models.task import WorkFile

        task = await TaskService.get_by_id(db=self.db, task_id=self.task_id)
        user_id = task.user_id if task else self.task_id
        tool_id = task.tool_id if task else None
        task_type = task.task_type if task else 'storybook'

        mock_steps = [
            (10, "正在准备素材..."),
            (25, "正在生成内容..."),
            (45, "正在处理图片..."),
            (65, "正在合成..."),
            (85, "正在生成最终文件..."),
            (95, "正在打包..."),
            (100, "生成完成！"),
        ]
        for percent, msg in mock_steps:
            await self.update_progress(percent=percent, message=msg)
            await asyncio.sleep(0.5)

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

        file_in = WorkFileCreate(
            work_id=work.id,
            file_name="preview.png",
            file_url="/mock/output/preview.png",
            file_type="image",
        )
        self.db.add(WorkFile(**file_in.model_dump()))
        await self.db.commit()

        await TaskService.complete_task(
            db=self.db,
            task_id=self.task_id,
            actual_cost=self._tool_config.get('base_fee', 10) if hasattr(self, '_tool_config') else 10,
        )

        return {"success": True, "work_id": str(work.id)}
