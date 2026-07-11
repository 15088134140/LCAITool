"""
灵创AI工具箱 API 主应用
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from app.core.config import settings
from app.core.middleware import RequestIdMiddleware, IdempotencyMiddleware
from app.core.redis import close_redis_pool
from app.core.response import (
    success_response,
    error_response,
    ok,
    get_request_id
)
from app.core.exceptions import (
    BusinessException,
    ValidationException,
    IdempotentTokenException,
    UserAlreadyExistsException,
    UserNotFoundException,
    InvalidCredentialsException,
    InvalidTokenException,
    InsufficientPermissionsException,
    InvalidIdCardFormatException,
    InvalidVerificationCodeException,
    TokenExpiredException,
    InsufficientBalanceException,
    OptimisticLockException,
)
from app.api.v1.api import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# 添加中间件
# 请求ID中间件（最先添加，确保所有请求都有ID）
app.add_middleware(RequestIdMiddleware)

# 幂等性中间件
app.add_middleware(IdempotencyMiddleware)

# CORS配置 - 开发环境允许常见前端端口
if settings.DEBUG:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
elif settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin).rstrip('/') for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# 注册路由
app.include_router(api_router, prefix=settings.API_V1_STR)


# ==========================================
# 全局异常处理器
# ==========================================

@app.exception_handler(BusinessException)
async def business_exception_handler(request: Request, exc: BusinessException):
    """业务异常处理"""
    request_id = get_request_id(request)
    return error_response(
        code=exc.status_code,
        message=exc.detail,
        error_code=exc.error_code,
        request_id=request_id
    )


@app.exception_handler(ValidationException)
async def validation_exception_handler(request: Request, exc: ValidationException):
    """验证异常处理"""
    request_id = get_request_id(request)
    return error_response(
        code=exc.status_code,
        message=exc.detail,
        error_code=exc.error_code,
        details=exc.validation_errors,
        request_id=request_id
    )


@app.exception_handler(IdempotentTokenException)
async def idempotent_token_exception_handler(request: Request, exc: IdempotentTokenException):
    """幂等性Token异常处理"""
    request_id = get_request_id(request)
    return error_response(
        code=exc.status_code,
        message=exc.detail,
        error_code=exc.error_code,
        request_id=request_id
    )


@app.exception_handler(UserAlreadyExistsException)
async def user_already_exists_exception_handler(request: Request, exc: UserAlreadyExistsException):
    """用户已存在异常"""
    request_id = get_request_id(request)
    return error_response(
        code=exc.status_code,
        message=exc.detail,
        error_code="USER_ALREADY_EXISTS",
        request_id=request_id
    )


@app.exception_handler(UserNotFoundException)
async def user_not_found_exception_handler(request: Request, exc: UserNotFoundException):
    """用户不存在异常"""
    request_id = get_request_id(request)
    return error_response(
        code=exc.status_code,
        message=exc.detail,
        error_code="USER_NOT_FOUND",
        request_id=request_id
    )


@app.exception_handler(InvalidCredentialsException)
async def invalid_credentials_exception_handler(request: Request, exc: InvalidCredentialsException):
    """无效凭证异常"""
    request_id = get_request_id(request)
    return error_response(
        code=exc.status_code,
        message=exc.detail,
        error_code="INVALID_CREDENTIALS",
        request_id=request_id
    )


@app.exception_handler(InvalidTokenException)
async def invalid_token_exception_handler(request: Request, exc: InvalidTokenException):
    """无效Token异常"""
    request_id = get_request_id(request)
    return error_response(
        code=exc.status_code,
        message=exc.detail,
        error_code="INVALID_TOKEN",
        request_id=request_id
    )


@app.exception_handler(TokenExpiredException)
async def token_expired_exception_handler(request: Request, exc: TokenExpiredException):
    """Token过期异常"""
    request_id = get_request_id(request)
    return error_response(
        code=exc.status_code,
        message=exc.detail,
        error_code="TOKEN_EXPIRED",
        request_id=request_id
    )


@app.exception_handler(InsufficientPermissionsException)
async def insufficient_permissions_exception_handler(request: Request, exc: InsufficientPermissionsException):
    """权限不足异常"""
    request_id = get_request_id(request)
    return error_response(
        code=exc.status_code,
        message=exc.detail,
        error_code="INSUFFICIENT_PERMISSIONS",
        request_id=request_id
    )


@app.exception_handler(InvalidIdCardFormatException)
async def invalid_id_card_format_exception_handler(request: Request, exc: InvalidIdCardFormatException):
    """身份证格式异常"""
    request_id = get_request_id(request)
    return error_response(
        code=exc.status_code,
        message=exc.detail,
        error_code="INVALID_ID_CARD",
        request_id=request_id
    )


@app.exception_handler(InvalidVerificationCodeException)
async def invalid_verification_code_exception_handler(request: Request, exc: InvalidVerificationCodeException):
    """验证码错误异常"""
    request_id = get_request_id(request)
    return error_response(
        code=exc.status_code,
        message=exc.detail,
        error_code="INVALID_VERIFICATION_CODE",
        request_id=request_id
    )


@app.exception_handler(InsufficientBalanceException)
async def insufficient_balance_exception_handler(request: Request, exc: InsufficientBalanceException):
    """余额不足异常"""
    request_id = get_request_id(request)
    return error_response(
        code=exc.status_code,
        message=exc.detail,
        error_code="INSUFFICIENT_BALANCE",
        request_id=request_id
    )


@app.exception_handler(OptimisticLockException)
async def optimistic_lock_exception_handler(request: Request, exc: OptimisticLockException):
    """乐观锁异常"""
    request_id = get_request_id(request)
    return error_response(
        code=exc.status_code,
        message=exc.detail,
        error_code="OPTIMISTIC_LOCK_ERROR",
        request_id=request_id
    )


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(request: Request, exc: RequestValidationError):
    """FastAPI请求参数验证异常处理"""
    request_id = get_request_id(request)
    return error_response(
        code=422,
        message="请求参数验证失败",
        error_code="VALIDATION_ERROR",
        details=exc.errors(),
        request_id=request_id
    )


@app.exception_handler(ValidationError)
async def pydantic_validation_error_handler(request: Request, exc: ValidationError):
    """Pydantic验证异常处理"""
    request_id = get_request_id(request)
    return error_response(
        code=422,
        message="数据验证失败",
        error_code="VALIDATION_ERROR",
        details=exc.errors(),
        request_id=request_id
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """处理FastAPI内置的HTTP异常（如OAuth2认证失败）"""
    request_id = get_request_id(request)
    return error_response(
        code=exc.status_code,
        message=exc.detail,
        error_code=exc.headers.get("X-Error-Code") if exc.headers else f"HTTP_{exc.status_code}",
        request_id=request_id
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """全局异常处理"""
    request_id = get_request_id(request)
    # 仅在调试模式下返回详细错误信息
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"未捕获的异常 [request_id={request_id}]: {str(exc)}", exc_info=True)

    if settings.DEBUG:
        import traceback
        details = {
            "exception_type": type(exc).__name__,
            "exception_message": str(exc),
            "stack_trace": traceback.format_exc()
        }
    else:
        details = None

    return error_response(
        code=500,
        message="服务器内部错误",
        error_code="INTERNAL_SERVER_ERROR",
        details=details,
        request_id=request_id
    )


# ==========================================
# 根路由
# ==========================================

@app.get("/", summary="API根路径")
async def root():
    return ok(
        data={"version": "1.0.0", "service": settings.PROJECT_NAME},
        message="欢迎使用灵创AI工具箱API"
    )


@app.get("/health", summary="健康检查")
async def health():
    return ok(
        data={"status": "healthy", "service": settings.PROJECT_NAME},
        message="服务正常运行"
    )


@app.get("/api/v1/health", tags=["system"])
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "service": "lcaitool-backend"}


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时清理资源"""
    await close_redis_pool()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
