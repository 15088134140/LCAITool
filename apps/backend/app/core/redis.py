"""
Redis连接池模块
提供全局Redis连接池管理
"""
from typing import Optional
import redis.asyncio as redis
from app.core.config import settings

# 全局Redis连接池实例
_redis_pool: Optional[redis.ConnectionPool] = None
_redis_client: Optional[redis.Redis] = None


def get_redis_pool() -> redis.ConnectionPool:
    """获取Redis连接池（单例模式）"""
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = redis.ConnectionPool.from_url(
            settings.REDIS_URL,
            max_connections=50,
            decode_responses=False,
            socket_connect_timeout=5,
            socket_keepalive=True,
            health_check_interval=30
        )
    return _redis_pool


def get_redis_client() -> redis.Redis:
    """获取Redis客户端（单例模式）"""
    global _redis_client
    if _redis_client is None:
        pool = get_redis_pool()
        _redis_client = redis.Redis(connection_pool=pool)
    return _redis_client


async def close_redis_pool():
    """关闭Redis连接池"""
    global _redis_client, _redis_pool
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None
    if _redis_pool is not None:
        await _redis_pool.disconnect()
        _redis_pool = None
