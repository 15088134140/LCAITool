import base64
import hashlib
import os
from datetime import datetime, timedelta
from typing import Any, Union, Optional
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from jose import jwt
import bcrypt
from app.core.config import settings


def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # bcrypt has a 72-byte limit, truncate if necessary
    truncated_password = plain_password[:72]
    return bcrypt.checkpw(truncated_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    # bcrypt has a 72-byte limit, truncate if necessary
    truncated_password = password[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(truncated_password.encode('utf-8'), salt).decode('utf-8')


def get_aes_key() -> bytes:
    """从SECRET_KEY生成AES-256密钥"""
    return hashlib.sha256(settings.SECRET_KEY.encode()).digest()


def aes_encrypt(plain_text: str) -> str:
    """AES-256-CBC加密（使用随机IV，前置到密文）"""
    key = get_aes_key()
    iv = os.urandom(16)  # 每次加密使用随机IV
    cipher = AES.new(key, AES.MODE_CBC, iv)
    encrypted = cipher.encrypt(pad(plain_text.encode("utf-8"), AES.block_size))
    # 将IV前置到密文，方便解密时提取
    return base64.b64encode(iv + encrypted).decode("utf-8")


def aes_decrypt(encrypted_text: str) -> str:
    """AES-256-CBC解密（从密文前16字节提取IV）"""
    key = get_aes_key()
    encrypted = base64.b64decode(encrypted_text.encode("utf-8"))
    iv = encrypted[:16]  # 提取前16字节作为IV
    cipher = AES.new(key, AES.MODE_CBC, iv)
    decrypted = unpad(cipher.decrypt(encrypted[16:]), AES.block_size)
    return decrypted.decode("utf-8")


def mask_id_card(id_card: str) -> str:
    """脱敏身份证号：只显示前4位和后4位，中间用星号代替，保持原长度"""
    if not id_card or len(id_card) < 8:
        return id_card
    return id_card[:4] + "*" * (len(id_card) - 8) + id_card[-4:]


def mask_id_card_encrypted(encrypted_id_card: str) -> Optional[str]:
    """脱敏加密的身份证号：先解密再脱敏"""
    if not encrypted_id_card:
        return None
    try:
        decrypted = aes_decrypt(encrypted_id_card)
        return mask_id_card(decrypted)
    except:
        # 解密失败返回None
        return None


def validate_id_card_format(id_card: str) -> bool:
    """
    验证身份证号格式
    18位身份证：前17位数字，最后一位可以是数字或X
    15位身份证：全部数字
    """
    if not id_card:
        return False

    # 18位身份证
    if len(id_card) == 18:
        if not id_card[:17].isdigit():
            return False
        if not (id_card[17].isdigit() or id_card[17].upper() == 'X'):
            return False
        return True
    # 15位身份证
    elif len(id_card) == 15:
        return id_card.isdigit()

    return False
