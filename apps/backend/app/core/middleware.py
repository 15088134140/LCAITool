"""
中间件模块
包含请求ID生成、幂等性Token检查等中间件
"""
import uuid
import time
import json
from typing import Optional, Callable
from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from app.core.config import settings
from app.core.exceptions import IdempotentTokenException
from app.core.redis import get_redis_client
import logging
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)

# 幂等性Token头名称
IDEMPOTENCY_KEY_HEADER = "X-Idempotency-Key"
# 幂等性Token有效期（秒）
IDEMPOTENCY_TTL = 86400  # 24小时
# 幂等性存储键前缀
IDEMPOTENCY_PREFIX = "idempotency:"


class RequestIdMiddleware(BaseHTTPMiddleware):
    """请求ID中间件 - 为每个请求生成唯一ID"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 生成或获取请求ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

        # 将请求ID存入request.state
        request.state.request_id = request_id

        # 记录请求开始时间
        start_time = time.time()

        # 处理请求
        response = await call_next(request)

        # 计算处理时间
        process_time = (time.time() - start_time) * 1000

        # 将请求ID添加到响应头
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{process_time:.2f}ms"

        return response


class IdempotencyMiddleware(BaseHTTPMiddleware):
    """幂等性Token检查中间件 - 确保非幂等请求的重复提交安全"""

    def __init__(
        self,
        app: ASGIApp,
        *,
        ttl: int = IDEMPOTENCY_TTL,
        header_name: str = IDEMPOTENCY_KEY_HEADER,
    ):
        super().__init__(app)
        self.ttl = ttl
        self.header_name = header_name

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 只对非幂等方法检查幂等性
        non_idempotent_methods = {"POST", "PUT", "PATCH"}

        if request.method not in non_idempotent_methods:
            return await call_next(request)

        # 获取幂等性Token
        idempotency_key = request.headers.get(self.header_name)

        # 没有幂等性Token，直接放行
        if not idempotency_key:
            return await call_next(request)

        # 构建Redis键，包含用户ID以防止跨用户冲突
        # 从request.state中获取user_id（如果已认证）
        user_id = "anonymous"
        if hasattr(request.state, "user") and request.state.user:
            user_id = str(request.state.user.id)
        redis_key = f"{IDEMPOTENCY_PREFIX}{user_id}:{idempotency_key}"

        r = None
        try:
            r = get_redis_client()

            # 尝试设置幂等性键（NX = 仅不存在时设置）
            success = await r.set(
                redis_key,
                "processing",
                ex=self.ttl,
                nx=True
            )

            if not success:
                # 键已存在，检查是否已完成
                cached_value = await r.get(redis_key)

                if cached_value and cached_value != b"processing":
                    # 已有完成的响应，返回缓存
                    try:
                        cached_data = json.loads(cached_value)
                        return Response(
                            content=cached_data["content"],
                            status_code=cached_data["status_code"],
                            headers=cached_data["headers"],
                            media_type=cached_data["media_type"]
                        )
                    except (json.JSONDecodeError, KeyError) as e:
                        # 缓存数据损坏，删除后继续处理
                        logger.warning(f"幂等性缓存数据损坏: {str(e)}")
                        await r.delete(redis_key)
                else:
                    # 请求正在处理中
                    raise IdempotentTokenException(
                        detail="该请求正在处理中，请勿重复提交",
                        error_code="REQUEST_IN_PROGRESS"
                    )

            # 执行请求
            response = await call_next(request)

            # 缓存响应结果
            if response.status_code < 500:  # 只缓存成功或客户端错误响应
                response_body = b""
                async for chunk in response.body_iterator:
                    response_body += chunk

                # 构建缓存数据
                cache_data = {
                    "content": response_body.decode("utf-8") if response_body else "",
                    "status_code": response.status_code,
                    "headers": dict(response.headers),
                    "media_type": response.media_type or "application/json"
                }

                await r.set(
                    redis_key,
                    json.dumps(cache_data),
                    ex=self.ttl
                )

                # 重新构建响应
                return Response(
                    content=response_body,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type
                )

            # 服务器错误，删除幂等性键允许重试
            await r.delete(redis_key)
            return response

        except IdempotentTokenException:
            raise
        except Exception as e:
            # Redis出错时，记录日志但不阻止请求（降级策略）
            logger.warning(f"幂等性检查失败: {str(e)}")
            return await call_next(request)