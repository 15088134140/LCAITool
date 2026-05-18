from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.api.deps import get_db
import redis.asyncio as redis
from app.core.config import settings

router = APIRouter()


@router.get("/", summary="健康检查")
async def health_check():
    return {"status": "ok", "service": "灵创AI工具箱 API"}


@router.get("/db", summary="数据库健康检查")
async def db_health_check(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT 1"))
        result.scalar()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": "disconnected", "error": str(e)}


@router.get("/redis", summary="Redis健康检查")
async def redis_health_check():
    try:
        r = redis.from_url(settings.REDIS_URL)
        await r.ping()
        await r.close()
        return {"status": "ok", "redis": "connected"}
    except Exception as e:
        return {"status": "error", "redis": "disconnected", "error": str(e)}
