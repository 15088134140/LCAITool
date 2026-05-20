"""
健康检查端点
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.api.deps import get_db
from app.core.redis import get_redis_client
from app.core.config import settings
from app.core.response import ok

router = APIRouter()


@router.get("", summary="服务健康检查")
async def health_check():
    return ok(
        data={"service": settings.PROJECT_NAME, "status": "healthy"},
        message="服务运行正常"
    )


@router.get("/db", summary="数据库健康检查")
async def db_health_check(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT 1"))
        result.scalar()
        return ok(
            data={"database": "connected"},
            message="数据库连接正常"
        )
    except Exception as e:
        return ok(
            data={"database": "disconnected", "error": str(e)},
            message="数据库连接失败"
        )


@router.get("/redis", summary="Redis健康检查")
async def redis_health_check():
    r = None
    try:
        r = get_redis_client()
        await r.ping()
        return ok(
            data={"redis": "connected"},
            message="Redis连接正常"
        )
    except Exception as e:
        return ok(
            data={"redis": "disconnected", "error": str(e)},
            message="Redis连接失败"
        )
