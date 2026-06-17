"""AIProviderFactory.get_provider_from_db 行为测试"""
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.exceptions import ConfigurationError
from app.providers.ai import AIProviderFactory


@pytest.mark.asyncio
async def test_get_provider_from_db_uses_base_url_field():
    """factory 把 DB 中的 base_url/text_model 等原样注入 provider"""
    fake_provider = MagicMock()
    fake_provider.slug = "volcano"
    fake_provider.config = {
        "api_key": "plain-key",
        "base_url": "https://example.com/api",
        "text_model": "test-text",
        "video_model": "test-video",
    }
    db = AsyncMock()
    db.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=fake_provider)
    )

    p = await AIProviderFactory.get_provider_from_db(db, "volcano")
    assert p.api_key == "plain-key"
    assert p.base_url == "https://example.com/api"
    assert p.text_model == "test-text"
    assert p.video_model == "test-video"
    assert p.slug == "volcano"


@pytest.mark.asyncio
async def test_get_provider_from_db_raises_value_error_when_provider_missing():
    db = AsyncMock()
    db.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=None)
    )
    with pytest.raises(ValueError, match="not found"):
        await AIProviderFactory.get_provider_from_db(db, "ghost")


@pytest.mark.asyncio
async def test_get_provider_from_db_raises_configuration_error_when_api_key_missing():
    fake_provider = MagicMock()
    fake_provider.slug = "volcano"
    fake_provider.config = {"base_url": "https://example.com/api"}
    db = AsyncMock()
    db.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=fake_provider)
    )
    with pytest.raises(ConfigurationError, match="api_key"):
        await AIProviderFactory.get_provider_from_db(db, "volcano")


@pytest.mark.asyncio
async def test_get_provider_from_db_raises_configuration_error_when_base_url_missing():
    fake_provider = MagicMock()
    fake_provider.slug = "volcano"
    fake_provider.config = {"api_key": "k"}
    db = AsyncMock()
    db.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=fake_provider)
    )
    with pytest.raises(ConfigurationError, match="base_url"):
        await AIProviderFactory.get_provider_from_db(db, "volcano")
