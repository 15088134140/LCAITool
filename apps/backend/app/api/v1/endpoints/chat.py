"""
Chat API endpoints for DialogMode
In-memory session storage (MVP), upgrade to DB later
"""
import uuid
import time
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.models.user import User

router = APIRouter()

# In-memory chat session storage
# Structure: { session_id: { "tool_id": str, "user_id": str, "messages": [...], "created_at": int } }
_chat_sessions: Dict[str, Dict[str, Any]] = {}


@router.post("/sessions", summary="创建对话会话")
async def create_chat_session(
    tool_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    session_id = str(uuid.uuid4())
    _chat_sessions[session_id] = {
        "tool_id": tool_id,
        "user_id": str(current_user.id),
        "messages": [
            {"role": "assistant", "content": "你好！我是AI助手，有什么可以帮你的吗？请描述你需要的创作需求。", "timestamp": int(time.time())}
        ],
        "created_at": int(time.time()),
    }
    return {"session_id": session_id, "messages": _chat_sessions[session_id]["messages"]}


@router.post("/sessions/{session_id}/messages", summary="发送消息")
async def send_message(
    session_id: str,
    content: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    if session_id not in _chat_sessions:
        raise HTTPException(status_code=404, detail="会话不存在")

    session = _chat_sessions[session_id]
    if session["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="无权访问此会话")

    # Add user message
    session["messages"].append({"role": "user", "content": content, "timestamp": int(time.time())})

    # Generate simple AI response (no real AI call for MVP — just echo + questionnaire)
    # In production, this would call AIProviderFactory
    user_msg_lower = content.lower()

    # Simple keyword-based response for MVP
    if any(kw in content for kw in ["主题", "故事", "绘本", "创作"]):
        response = "好的！我来帮你创作。请告诉我更多细节：\n\n1. 目标受众是谁？（如：3-6岁儿童）\n2. 你希望是什么风格？（如：卡通、梦幻）\n3. 大概需要多少页？\n4. 是否需要配音？"
    elif any(kw in content for kw in ["商品", "电商", "产品", "详情"]):
        response = "好的！我来帮你生成电商详情页。请提供：\n\n1. 产品名称是什么？\n2. 主要卖点有哪些？\n3. 目标受众是谁？\n4. 需要几张展示图？"
    elif any(kw in content for kw in ["营销", "文案", "推广", "广告"]):
        response = "好的！我来帮你写营销文案。请告诉我：\n\n1. 产品/品牌名称是什么？\n2. 核心卖点有哪些？\n3. 在哪个平台发布？（如：小红书、淘宝）\n4. 目标受众是谁？"
    else:
        response = "感谢你的描述！我已经记录了需求。当你准备好后，点击「开始生成」按钮，我将根据我们的对话内容为你创作。"

    session["messages"].append({"role": "assistant", "content": response, "timestamp": int(time.time())})

    return {"messages": session["messages"]}


@router.get("/sessions/{session_id}/messages", summary="获取消息历史")
async def get_messages(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    if session_id not in _chat_sessions:
        raise HTTPException(status_code=404, detail="会话不存在")
    if _chat_sessions[session_id]["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="无权访问此会话")
    return {"messages": _chat_sessions[session_id]["messages"]}
