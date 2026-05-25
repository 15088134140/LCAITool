import pytest
import uuid
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.api_key import ApiKey
from app.models.external_file import ExternalFile
from app.models.user import User
from app.schemas.api_key import (
    ApiKeyCreate,
    ApiKeyStatusUpdate,
    ApiKeyResponse,
    ApiKeyCreatedResponse,
    ApiKeyRevealResponse,
)


class TestApiKeySchemas:
    """Test API Key schema classes"""

    def test_api_key_create(self):
        """Test ApiKeyCreate schema"""
        data = ApiKeyCreate(name="测试密钥")
        assert data.name == "测试密钥"

    def test_api_key_status_update_active(self):
        """Test ApiKeyStatusUpdate with valid status='active'"""
        data = ApiKeyStatusUpdate(status="active")
        assert data.status == "active"

    def test_api_key_status_update_disabled(self):
        """Test ApiKeyStatusUpdate with valid status='disabled'"""
        data = ApiKeyStatusUpdate(status="disabled")
        assert data.status == "disabled"

    def test_api_key_status_update_invalid(self):
        """Test ApiKeyStatusUpdate with invalid status raises ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            ApiKeyStatusUpdate(status="invalid_status")
        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["loc"] == ("status",)

    def test_api_key_status_update_invalid_empty(self):
        """Test ApiKeyStatusUpdate with empty string raises ValidationError"""
        with pytest.raises(ValidationError):
            ApiKeyStatusUpdate(status="")

    def test_api_key_status_update_invalid_number(self):
        """Test ApiKeyStatusUpdate with invalid type raises ValidationError"""
        with pytest.raises(ValidationError):
            ApiKeyStatusUpdate(status=123)

    def test_api_key_response_from_attributes(self):
        """Test ApiKeyResponse can be created from model attributes"""
        now = 1717000000
        data = ApiKeyResponse(
            id=uuid.uuid4(),
            name="测试密钥",
            key_prefix="sk-a1b2",
            status="active",
            created_at=now,
        )
        assert data.name == "测试密钥"
        assert data.key_prefix == "sk-a1b2"
        assert data.status == "active"
        assert data.created_at == now
        assert data.last_used_at is None

        # Verify from_attributes config is present (Pydantic v2 ConfigDict)
        assert ApiKeyResponse.model_config.get("from_attributes") is True

    def test_api_key_created_response_has_warning(self):
        """Test ApiKeyCreatedResponse includes the key and warning message"""
        now = 1717000000
        data = ApiKeyCreatedResponse(
            id=uuid.uuid4(),
            name="新密钥",
            key_prefix="sk-xxxx",
            status="active",
            created_at=now,
            key="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        )
        assert data.key == "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        assert "请立即复制密钥" in data.warning
        # Warning should be the default value set in the schema
        assert data.warning == "请立即复制密钥，关闭后不再显示"

    def test_api_key_reveal_response(self):
        """Test ApiKeyRevealResponse schema"""
        key_id = uuid.uuid4()
        data = ApiKeyRevealResponse(
            id=key_id,
            key="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        )
        assert data.id == key_id
        assert data.key == "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"


@pytest.mark.asyncio
async def test_create_api_key(db_session: AsyncSession):
    """Test creating an ApiKey record in the database"""
    # Create a test user first
    user = User(
        id=uuid.uuid4(),
        nickname="test_api_key_user",
        phone="13800138100",
        balance=0,
    )
    db_session.add(user)
    await db_session.commit()

    # Create an API key
    api_key = ApiKey(
        user_id=user.id,
        name="测试API密钥",
        key_prefix="sk-test",
        key_hash="abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        key_encrypted="gAAAAABmZWNyeXB0ZWRfdGV4dA==",
        status="active",
    )
    db_session.add(api_key)
    await db_session.commit()
    await db_session.refresh(api_key)

    assert api_key.id is not None
    assert api_key.user_id == user.id
    assert api_key.name == "测试API密钥"
    assert api_key.key_prefix == "sk-test"
    assert api_key.key_hash == "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    assert api_key.key_encrypted == "gAAAAABmZWNyeXB0ZWRfdGV4dA=="
    assert api_key.status == "active"
    assert api_key.last_used_at is None
    assert api_key.created_at is not None
    assert api_key.updated_at is not None


@pytest.mark.asyncio
async def test_create_api_key_disabled(db_session: AsyncSession):
    """Test creating an ApiKey with disabled status"""
    user = User(
        id=uuid.uuid4(),
        nickname="test_api_key_user2",
        phone="13800138101",
        balance=0,
    )
    db_session.add(user)
    await db_session.commit()

    api_key = ApiKey(
        user_id=user.id,
        name="已禁用密钥",
        key_prefix="sk-off",
        key_hash="a" * 64,
        key_encrypted="encrypted_data",
        status="disabled",
    )
    db_session.add(api_key)
    await db_session.commit()
    await db_session.refresh(api_key)

    assert api_key.status == "disabled"


@pytest.mark.asyncio
async def test_create_external_file(db_session: AsyncSession):
    """Test creating an ExternalFile record in the database"""
    # Create a test user first
    user = User(
        id=uuid.uuid4(),
        nickname="test_ext_file_user",
        phone="13800138102",
        balance=0,
    )
    db_session.add(user)
    await db_session.commit()

    # Create an external file
    ext_file = ExternalFile(
        user_id=user.id,
        file_name="test_image.png",
        file_path="/works/test_task/test_image.png",
        file_size=102400,
        mime_type="image/png",
        api_endpoint="images",
    )
    db_session.add(ext_file)
    await db_session.commit()
    await db_session.refresh(ext_file)

    assert ext_file.id is not None
    assert ext_file.user_id == user.id
    assert ext_file.file_name == "test_image.png"
    assert ext_file.file_path == "/works/test_task/test_image.png"
    assert ext_file.file_size == 102400
    assert ext_file.mime_type == "image/png"
    assert ext_file.api_endpoint == "images"
    assert ext_file.created_at is not None


@pytest.mark.asyncio
async def test_create_external_file_with_nullable_fields(db_session: AsyncSession):
    """Test creating an ExternalFile with nullable fields omitted"""
    user = User(
        id=uuid.uuid4(),
        nickname="test_ext_file_user2",
        phone="13800138103",
        balance=0,
    )
    db_session.add(user)
    await db_session.commit()

    ext_file = ExternalFile(
        user_id=user.id,
        file_name="document.pdf",
        file_path="/works/test_task/document.pdf",
        api_endpoint="chat",
    )
    db_session.add(ext_file)
    await db_session.commit()
    await db_session.refresh(ext_file)

    assert ext_file.file_name == "document.pdf"
    assert ext_file.file_size is None
    assert ext_file.mime_type is None
    assert ext_file.api_endpoint == "chat"


@pytest.mark.asyncio
async def test_api_key_user_relationship(db_session: AsyncSession):
    """Test the foreign key relationship between ApiKey and User"""
    user = User(
        id=uuid.uuid4(),
        nickname="test_relationship_user",
        phone="13800138104",
        balance=0,
    )
    db_session.add(user)
    await db_session.commit()

    api_key1 = ApiKey(
        user_id=user.id,
        name="密钥1",
        key_prefix="sk-1",
        key_hash="b" * 64,
        key_encrypted="enc1",
        status="active",
    )
    api_key2 = ApiKey(
        user_id=user.id,
        name="密钥2",
        key_prefix="sk-2",
        key_hash="c" * 64,
        key_encrypted="enc2",
        status="disabled",
    )
    db_session.add_all([api_key1, api_key2])
    await db_session.commit()
    await db_session.refresh(api_key1)
    await db_session.refresh(api_key2)

    assert api_key1.user_id == user.id
    assert api_key2.user_id == user.id
    assert api_key1.name == "密钥1"
    assert api_key2.name == "密钥2"


@pytest.mark.asyncio
async def test_external_file_api_endpoint_values(db_session: AsyncSession):
    """Test creating ExternalFiles with different api_endpoint values"""
    from sqlalchemy import select

    user = User(
        id=uuid.uuid4(),
        nickname="test_endpoint_user",
        phone="13800138105",
        balance=0,
    )
    db_session.add(user)
    await db_session.commit()

    endpoints = ["images", "audio", "video", "chat"]
    for i, endpoint in enumerate(endpoints):
        ext_file = ExternalFile(
            user_id=user.id,
            file_name=f"file_{i}.bin",
            file_path=f"/works/test_task/file_{i}.bin",
            api_endpoint=endpoint,
        )
        db_session.add(ext_file)
    await db_session.commit()

    # Verify all endpoints were saved via query
    result = await db_session.execute(
        select(ExternalFile).where(ExternalFile.user_id == user.id)
    )
    saved_files = result.scalars().all()
    saved_endpoints = {f.api_endpoint for f in saved_files}
    assert saved_endpoints == set(endpoints)
