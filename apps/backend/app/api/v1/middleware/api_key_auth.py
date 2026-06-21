"""
API Key 认证中间件
支持 HTTP Bearer Token（Header）和 api_key 查询参数两种方式。
"""
import hashlib
import time
from typing import Optional

from fastapi import Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.api_key import ApiKey

security = HTTPBearer(auto_error=False, scheme_name="APIKey")


async def _validate_api_key(key: str, db: AsyncSession):
    """校验 API Key 字符串，返回 ApiKey 对象或 None。"""
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


async def verify_api_key(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """从 Authorization: Bearer header 验证 API Key。"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    return await _validate_api_key(credentials.credentials, db)


async def verify_api_key_any(
    request: Request,
    api_key_param: Optional[str] = Query(None, alias="api_key"),
    db: AsyncSession = Depends(get_db),
):
    """从 api_key 查询参数或 Authorization header 验证 API Key。

    优先使用查询参数，适用于 <img>、<audio> 等嵌入资源场景。
    如果未提供 API Key，则返回 None（允许无认证访问）。
    """
    # 先尝试查询参数
    if api_key_param:
        return await _validate_api_key(api_key_param, db)

    # 再尝试 Authorization header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return await _validate_api_key(auth_header[7:], db)

    # 未提供 API Key，返回 None（允许无认证访问）
    return None
