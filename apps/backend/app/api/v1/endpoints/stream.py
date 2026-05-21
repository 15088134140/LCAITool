"""
SSE 实时流端点

提供任务状态的实时推送功能，支持：
- 单个任务的 SSE 实时流
- 批量任务状态快照（用于断线重连）
- 心跳检测保活
- 断线重连消息补发
"""
import asyncio
import json
import uuid
import time
from typing import AsyncGenerator, Dict, List, Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status, Header
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.core.redis import get_redis_client
from app.models.task import Task
from app.models.user import User
from app.core.response import ok


router = APIRouter()

# 配置常量
HEARTBEAT_INTERVAL = 30  # 心跳间隔（秒）
MESSAGE_BUFFER_SIZE = 100  # 每个任务的消息缓冲区大小
CONNECTION_TIMEOUT = 300  # 连接超时时间（秒）

# 全局消息缓冲区：{task_id: [messages]}
_message_buffers: Dict[str, List[Dict[str, Any]]] = {}


def format_sse(event: str, data: Dict[str, Any], event_id: Optional[str] = None) -> str:
    """
    格式化 SSE 消息

    SSE 格式规范：
    - event: 事件类型
    - data: JSON 数据
    - id: 事件 ID（用于断线重连）
    """
    lines = []
    if event_id:
        lines.append(f"id: {event_id}")
    lines.append(f"event: {event}")
    lines.append(f"data: {json.dumps(data, ensure_ascii=False)}")
    lines.append("")  # 空行表示消息结束
    return "\n".join(lines) + "\n"


def add_to_message_buffer(task_id: str, message: Dict[str, Any]):
    """将消息添加到任务的消息缓冲区（用于断线重连）"""
    if task_id not in _message_buffers:
        _message_buffers[task_id] = []
    _message_buffers[task_id].append(message)
    # 限制缓冲区大小
    if len(_message_buffers[task_id]) > MESSAGE_BUFFER_SIZE:
        _message_buffers[task_id] = _message_buffers[task_id][-MESSAGE_BUFFER_SIZE:]


def get_buffered_messages(task_id: str, last_event_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """获取断线期间缓存的消息"""
    if task_id not in _message_buffers:
        return []

    messages = _message_buffers[task_id]
    if not last_event_id:
        return messages

    # 找到 last_event_id 之后的所有消息
    for i, msg in enumerate(messages):
        if msg.get("event_id") == last_event_id:
            return messages[i + 1:]
    return messages


async def sse_event_generator(
    task_id: uuid.UUID,
    user_id: uuid.UUID,
    last_event_id: Optional[str] = None
) -> AsyncGenerator[str, None]:
    """
    SSE 事件生成器

    流程：
    1. 发送 "connected" 事件
    2. 发送缓存的历史消息（如果有 last_event_id）
    3. 订阅 Redis 频道监听新消息
    4. 定期发送心跳保活
    5. 连接断开时清理资源
    """
    task_id_str = str(task_id)
    channel = f"task:{task_id_str}:status"
    redis = get_redis_client()
    pubsub = redis.pubsub()

    try:
        # 1. 发送连接成功事件
        connected_data = {
            "task_id": task_id_str,
            "user_id": str(user_id),
            "timestamp": int(time.time()),
            "message": "连接成功"
        }
        yield format_sse("connected", connected_data, event_id=f"conn-{int(time.time())}")

        # 2. 发送断线期间缓存的消息
        buffered_messages = get_buffered_messages(task_id_str, last_event_id)
        for msg in buffered_messages:
            event_type = msg.get("type", "message")
            event_id = msg.get("event_id")
            yield format_sse(event_type, msg, event_id=event_id)
            await asyncio.sleep(0.01)  # 避免发送过快

        # 3. 订阅 Redis 频道
        await pubsub.subscribe(channel)

        # 4. 监听消息并发送心跳
        last_heartbeat = time.time()
        while True:
            # 尝试获取消息（非阻塞）
            message = await pubsub.get_message(
                ignore_subscribe_messages=True,
                timeout=1.0
            )

            if message:
                try:
                    # 解析消息数据
                    message_data = json.loads(message["data"])
                    message_type = message_data.get("type", "message")

                    # 生成事件 ID
                    event_id = f"{message_type}-{int(time.time())}-{uuid.uuid4().hex[:8]}"
                    message_data["event_id"] = event_id

                    # 缓存消息
                    add_to_message_buffer(task_id_str, message_data)

                    # 发送 SSE 消息
                    yield format_sse(message_type, message_data, event_id=event_id)

                    # 如果是终止状态（completed/failed/cancelled/timeout），结束连接
                    if message_type in ["completed", "failed", "cancelled", "timeout"]:
                        yield format_sse("closed", {
                            "task_id": task_id_str,
                            "reason": f"任务已{message_type}",
                            "timestamp": int(time.time())
                        })
                        break

                except json.JSONDecodeError:
                    # 忽略格式错误的消息
                    pass

            # 发送心跳（SSE 注释，客户端会忽略）
            current_time = time.time()
            if current_time - last_heartbeat >= HEARTBEAT_INTERVAL:
                yield ": keepalive\n\n"
                last_heartbeat = current_time

            # 短暂休眠避免 CPU 占用过高
            await asyncio.sleep(0.1)

    except asyncio.CancelledError:
        # 客户端断开连接
        yield format_sse("disconnected", {
            "task_id": task_id_str,
            "reason": "客户端断开连接",
            "timestamp": int(time.time())
        })
    except Exception as e:
        # 发生错误
        yield format_sse("error", {
            "task_id": task_id_str,
            "error": str(e),
            "timestamp": int(time.time())
        })
    finally:
        # 清理资源
        try:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()
        except Exception:
            pass


@router.get("/tasks/{task_id}/stream", response_class=StreamingResponse, summary="任务状态 SSE 实时流")
async def stream_task_events(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    last_event_id: Optional[str] = Header(None, alias="Last-Event-ID"),
):
    """
    SSE 实时流端点，推送任务状态变化

    客户端使用方式：
    ```javascript
    const eventSource = new EventSource('/api/v1/stream/tasks/{task_id}/stream', {
        withCredentials: true
    });

    eventSource.addEventListener('progress', (event) => {
        const data = JSON.parse(event.data);
        console.log('进度更新:', data.progress, data.message);
    });

    eventSource.addEventListener('completed', (event) => {
        const data = JSON.parse(event.data);
        console.log('任务完成:', data);
        eventSource.close();
    });
    ```

    事件类型：
    - `connected`: 连接成功
    - `status`: 状态变更
    - `progress`: 进度更新
    - `completed`: 任务完成
    - `failed`: 任务失败
    - `retry`: 重试通知
    - `closed`: 连接关闭
    - `error`: 发生错误
    """
    # 验证任务存在且属于当前用户
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )

    if task.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问此任务"
        )

    # 创建 SSE 流
    generator = sse_event_generator(task_id, current_user.id, last_event_id)

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用 Nginx 缓冲
        }
    )


@router.get("/tasks/snapshot", summary="批量任务状态快照")
async def get_tasks_snapshot(
    task_ids: str = Query(..., description="逗号分隔的 task_id 列表，最多50个"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    获取批量任务状态快照 - 用于断线重连后快速恢复状态

    返回每个任务的当前状态、进度等信息
    """
    # 解析任务 ID 列表
    try:
        task_id_list = [uuid.UUID(tid.strip()) for tid in task_ids.split(",") if tid.strip()]
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="任务 ID 格式错误"
        )

    # 限制查询数量
    if len(task_id_list) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="最多只能查询 50 个任务"
        )

    if not task_id_list:
        return ok(data={"tasks": []}, message="查询成功")

    # 查询任务
    result = await db.execute(
        select(Task).where(
            Task.id.in_(task_id_list),
            Task.user_id == current_user.id
        )
    )
    tasks = result.scalars().all()

    # 构建快照数据
    snapshot_data = []
    for task in tasks:
        snapshot_data.append({
            "task_id": str(task.id),
            "status": task.status,
            "progress": task.progress,
            "progress_message": task.progress_message,
            "task_type": task.task_type,
            "estimated_cost": task.estimated_cost,
            "actual_cost": task.actual_cost,
            "started_at": task.started_at,
            "completed_at": task.completed_at,
            "result_preview": task.result_preview,
            "error_message": task.error_message,
            "created_at": int(task.created_at.timestamp()) if hasattr(task, 'created_at') and task.created_at else None
        })

    return ok(
        data={"tasks": snapshot_data},
        message="查询成功"
    )


@router.post("/tasks/{task_id}/connect", summary="注册客户端连接")
async def connect_to_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    客户端连接时注册（可选）

    用于统计在线连接数，实现连接管理功能
    """
    # 验证任务存在且属于当前用户
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )

    if task.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问此任务"
        )

    # 这里可以添加连接统计逻辑
    # 例如：Redis 中记录当前连接数

    return ok(
        data={"task_id": str(task_id), "connected": True},
        message="连接注册成功"
    )


@router.post("/tasks/{task_id}/disconnect", summary="注销客户端连接")
async def disconnect_from_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    客户端断开时注销（可选）

    用于清理连接统计
    """
    # 验证任务存在且属于当前用户
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )

    if task.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问此任务"
        )

    # 这里可以添加注销逻辑
    # 例如：Redis 中减少连接计数

    return ok(
        data={"task_id": str(task_id), "disconnected": True},
        message="连接注销成功"
    )


@router.get("/health", summary="SSE 服务健康检查")
async def stream_health_check():
    """
    检查 SSE 服务是否正常运行
    """
    return ok(
        data={
            "service": "sse-stream",
            "status": "healthy",
            "heartbeat_interval": HEARTBEAT_INTERVAL,
            "buffer_size": MESSAGE_BUFFER_SIZE
        },
        message="SSE 服务运行正常"
    )
