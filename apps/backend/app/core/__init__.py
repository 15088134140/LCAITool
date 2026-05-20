"""
核心模块
包含配置、异常处理、响应格式、中间件等
"""
from app.core.config import settings
from app.core.exceptions import (
    BusinessException,
    ValidationException,
    IdempotentTokenException,
    UserAlreadyExistsException,
    UserNotFoundException,
    InvalidCredentialsException,
    InvalidTokenException,
    TokenExpiredException,
    InsufficientPermissionsException,
    InvalidIdCardFormatException,
    InvalidVerificationCodeException,
    InsufficientBalanceException,
    OptimisticLockException,
)
from app.core.response import (
    ResponseModel,
    SuccessResponse,
    ErrorResponse,
    success_response,
    error_response,
    ok,
    created,
    bad_request,
    unauthorized,
    forbidden,
    not_found,
    conflict,
    internal_server_error,
    get_request_id,
)
from app.core.middleware import (
    RequestIdMiddleware,
    IdempotencyMiddleware,
)

__all__ = [
    # config
    "settings",
    # exceptions
    "BusinessException",
    "ValidationException",
    "IdempotentTokenException",
    "UserAlreadyExistsException",
    "UserNotFoundException",
    "InvalidCredentialsException",
    "InvalidTokenException",
    "TokenExpiredException",
    "InsufficientPermissionsException",
    "InvalidIdCardFormatException",
    "InvalidVerificationCodeException",
    "InsufficientBalanceException",
    "OptimisticLockException",
    # response
    "ResponseModel",
    "SuccessResponse",
    "ErrorResponse",
    "success_response",
    "error_response",
    "ok",
    "created",
    "bad_request",
    "unauthorized",
    "forbidden",
    "not_found",
    "conflict",
    "internal_server_error",
    "get_request_id",
    # middleware
    "RequestIdMiddleware",
    "IdempotencyMiddleware",
]
