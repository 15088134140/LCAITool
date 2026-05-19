import pytest
from app.core.security import (
    get_password_hash,
    verify_password,
    aes_encrypt,
    aes_decrypt,
    mask_id_card,
    create_access_token,
    create_refresh_token
)
from jose import jwt
from app.core.config import settings


def test_password_hash():
    password = "testpassword123"
    hashed = get_password_hash(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_aes_encrypt_decrypt():
    plain_text = "身份证号123456"
    encrypted = aes_encrypt(plain_text)
    decrypted = aes_decrypt(encrypted)

    assert encrypted != plain_text
    assert decrypted == plain_text


def test_mask_id_card():
    id_card = "110101199001011234"
    masked = mask_id_card(id_card)

    assert masked == "1101**********1234"
    assert len(masked) == len(id_card)

    # 测试None情况
    assert mask_id_card(None) is None
    assert mask_id_card("") == ""


def test_create_access_token():
    user_id = "test-user-id-123"
    token = create_access_token(subject=user_id)

    assert token is not None
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == user_id
    assert payload["type"] == "access"
    assert "exp" in payload


def test_create_refresh_token():
    user_id = "test-user-id-456"
    token = create_refresh_token(subject=user_id)

    assert token is not None
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == user_id
    assert payload["type"] == "refresh"
    assert "exp" in payload


def test_different_tokens():
    """确保access token和refresh token是不同的"""
    user_id = "same-user"
    access_token = create_access_token(subject=user_id)
    refresh_token = create_refresh_token(subject=user_id)

    assert access_token != refresh_token

    access_payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    refresh_payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

    assert access_payload["type"] == "access"
    assert refresh_payload["type"] == "refresh"
