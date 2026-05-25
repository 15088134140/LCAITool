"""
Chat API 集成测试
覆盖：对话会话创建、消息发送、消息获取等接口
"""
import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models.user import User


async def _create_user(db_session: AsyncSession) -> User:
    """创建测试用户并返回"""
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        nickname="chat_test_user",
        balance=1000,
        status=1,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _get_auth_headers(db_session: AsyncSession, user_id: uuid.UUID = None) -> dict:
    """生成认证请求头"""
    if user_id is None:
        user = await _create_user(db_session)
        user_id = user.id
    token = create_access_token(str(user_id))
    return {"Authorization": f"Bearer {token}"}


class TestChatSessionCreation:
    """对话会话创建测试"""

    @pytest.mark.asyncio
    async def test_create_chat_session(self, client: AsyncClient, db_session: AsyncSession):
        """POST /api/v1/chat/sessions?tool_id=storybook-generator 创建对话会话"""
        headers = await _get_auth_headers(db_session)

        response = await client.post(
            "/api/v1/chat/sessions?tool_id=storybook-generator",
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert len(data["session_id"]) > 0
        assert "messages" in data
        assert len(data["messages"]) == 1
        assert data["messages"][0]["role"] == "assistant"

    @pytest.mark.asyncio
    async def test_create_chat_session_unauthorized(self, client: AsyncClient):
        """POST /api/v1/chat/sessions 无认证"""
        response = await client.post(
            "/api/v1/chat/sessions?tool_id=storybook-generator",
        )

        assert response.status_code == 401
        data = response.json()
        assert data["code"] == 401
        assert "message" in data


class TestSendMessage:
    """发送消息测试"""

    @pytest.mark.asyncio
    async def test_send_message(self, client: AsyncClient, db_session: AsyncSession):
        """POST /api/v1/chat/sessions/{session_id}/messages"""
        headers = await _get_auth_headers(db_session)

        # 先创建会话
        create_resp = await client.post(
            "/api/v1/chat/sessions?tool_id=storybook-generator",
            headers=headers,
        )
        session_id = create_resp.json()["session_id"]

        # 发送消息（使用 params 确保 URL 正确编码）
        response = await client.post(
            f"/api/v1/chat/sessions/{session_id}/messages",
            params={"content": "我想创作一个关于勇敢的小兔子的绘本故事"},
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        # 原始问候(1) + 用户消息(1) + AI回复(1) = 3
        assert len(data["messages"]) >= 3

        # 验证消息顺序
        messages = data["messages"]
        assert messages[-2]["role"] == "user"
        assert "勇敢的小兔子" in messages[-2]["content"]
        assert messages[-1]["role"] == "assistant"
        assert any(kw in messages[-1]["content"] for kw in ["主题", "故事", "绘本", "创作"])

    @pytest.mark.asyncio
    async def test_send_message_invalid_session(self, client: AsyncClient, db_session: AsyncSession):
        """发送消息到不存在的会话"""
        headers = await _get_auth_headers(db_session)
        fake_session_id = str(uuid.uuid4())

        response = await client.post(
            f"/api/v1/chat/sessions/{fake_session_id}/messages?content=测试消息",
            headers=headers,
        )

        assert response.status_code == 404
        data = response.json()
        assert data["code"] == 404
        assert "会话不存在" in data["message"]

    @pytest.mark.asyncio
    async def test_send_message_unauthorized(self, client: AsyncClient, db_session: AsyncSession):
        """发送消息无认证"""
        # 创建会话（带认证）
        headers = await _get_auth_headers(db_session)
        create_resp = await client.post(
            "/api/v1/chat/sessions?tool_id=storybook-generator",
            headers=headers,
        )
        session_id = create_resp.json()["session_id"]

        # 发送消息（无认证）
        response = await client.post(
            f"/api/v1/chat/sessions/{session_id}/messages?content=测试消息",
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_send_message_to_other_users_session(self, client: AsyncClient, db_session: AsyncSession):
        """发送消息到其他用户的会话"""
        # 用户A创建会话
        user_a = await _create_user(db_session)
        headers_a = await _get_auth_headers(db_session, user_a.id)
        create_resp = await client.post(
            "/api/v1/chat/sessions?tool_id=storybook-generator",
            headers=headers_a,
        )
        session_id = create_resp.json()["session_id"]

        # 用户B尝试发送消息
        user_b = await _create_user(db_session)
        headers_b = await _get_auth_headers(db_session, user_b.id)
        response = await client.post(
            f"/api/v1/chat/sessions/{session_id}/messages?content=测试消息",
            headers=headers_b,
        )

        assert response.status_code == 403


class TestGetMessages:
    """获取消息历史测试"""

    @pytest.mark.asyncio
    async def test_get_messages(self, client: AsyncClient, db_session: AsyncSession):
        """GET /api/v1/chat/sessions/{session_id}/messages"""
        headers = await _get_auth_headers(db_session)

        # 创建会话并发送消息
        create_resp = await client.post(
            "/api/v1/chat/sessions?tool_id=storybook-generator",
            headers=headers,
        )
        session_id = create_resp.json()["session_id"]

        await client.post(
            f"/api/v1/chat/sessions/{session_id}/messages?content=你好",
            headers=headers,
        )

        # 获取消息
        response = await client.get(
            f"/api/v1/chat/sessions/{session_id}/messages",
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        assert len(data["messages"]) >= 2

        # 验证消息结构
        for msg in data["messages"]:
            assert "role" in msg
            assert "content" in msg
            assert "timestamp" in msg
            assert msg["role"] in ("user", "assistant")

    @pytest.mark.asyncio
    async def test_get_messages_invalid_session(self, client: AsyncClient, db_session: AsyncSession):
        """获取不存在的会话消息"""
        headers = await _get_auth_headers(db_session)
        fake_session_id = str(uuid.uuid4())

        response = await client.get(
            f"/api/v1/chat/sessions/{fake_session_id}/messages",
            headers=headers,
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_messages_unauthorized(self, client: AsyncClient, db_session: AsyncSession):
        """获取消息无认证"""
        # 创建会话
        headers = await _get_auth_headers(db_session)
        create_resp = await client.post(
            "/api/v1/chat/sessions?tool_id=storybook-generator",
            headers=headers,
        )
        session_id = create_resp.json()["session_id"]

        # 无认证获取
        response = await client.get(
            f"/api/v1/chat/sessions/{session_id}/messages",
        )

        assert response.status_code == 401
