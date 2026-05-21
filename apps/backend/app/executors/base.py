"""
工具执行器抽象基类
定义所有工具执行器需要实现的接口
"""
import uuid
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.task_service import TaskService


class BaseToolExecutor(ABC):
    """工具执行器抽象基类"""

    def __init__(self, task_id: uuid.UUID, db: AsyncSession):
        """
        初始化执行器
        :param task_id: 任务ID
        :param db: 数据库会话
        """
        self.task_id = task_id
        self.db = db
        self._snapshot: Optional[Dict[str, Any]] = None

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

    async def update_progress(self, percent: int, message: str) -> None:
        """
        更新任务进度
        :param percent: 进度百分比 0-100
        :param message: 进度消息
        """
        await TaskService.update_task_status(
            db=self.db,
            task_id=self.task_id,
            progress=percent,
            message=message
        )

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
