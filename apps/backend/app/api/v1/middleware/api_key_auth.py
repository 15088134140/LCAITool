"""
API Key 认证中间件
通过 HTTP Bearer Token 验证 API Key 的有效性
"""
import hashlib
import time
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.api_key import ApiKey

security = HTTPBearer(auto_error=False)


async def verify_api_key(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """验证 API Key 的有效性

    从 Authorization header 中提取 Bearer token，
    验证 key 格式（lcai_ 前缀），通过 key_prefix + SHA-256 hash 查询数据库。
    认证成功后更新 last_used_at。
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    key = credentials.credentials
    if not key.startswith("lcai_"):
        raise HTTPException(status_code=401, detail="Invalid API Key format")
    prefix = key[:10]
    key_hash = hashlib.sha256(key.encode()).hexdigest()
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.key_prefix == prefix,
            ApiKey.key_hash == key_hash,
            ApiKey.status == "active",
        )
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid or disabled API Key")
    api_key.last_used_at = int(time.time())
    await db.commit()
    return api_key
