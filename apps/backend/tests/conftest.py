import pytest
import uuid
from unittest.mock import MagicMock, patch
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.main import app
from app.api.deps import get_db
from app.models.user import User


# 使用SQLite内存数据库进行单元测试
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="function")
async def test_engine():
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        pool_pre_ping=True
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def db_session(test_engine):
    async_session = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture
def mock_redis_client():
    """Mock Redis客户端"""
    mock_client = MagicMock()
    mock_client.set = MagicMock(return_value=True)
    mock_client.get = MagicMock(return_value=None)
    mock_client.delete = MagicMock(return_value=1)
    mock_client.ping = MagicMock(return_value=True)
    return mock_client


@pytest.fixture
async def client(db_session: AsyncSession, mock_redis_client):
    # 覆盖get_db依赖，使用测试数据库session
    async def override_get_db():
        yield db_session

    # 覆盖get_redis_client
    with patch('app.core.middleware.get_redis_client', return_value=mock_redis_client):
        with patch('app.api.v1.endpoints.health.get_redis_client', return_value=mock_redis_client):
            app.dependency_overrides[get_db] = override_get_db
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                yield ac
            # 清理覆盖
            app.dependency_overrides.clear()


@pytest.fixture
async def verified_user_id(db_session: AsyncSession):
    """创建一个已实名认证的用户用于测试"""
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        nickname="测试用户",
        id_card_verified=True,
        balance=1000,
        status=1
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user_id
