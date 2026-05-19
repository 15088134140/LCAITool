from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.exceptions import (
    UserAlreadyExistsException,
    UserNotFoundException,
    InvalidCredentialsException,
    InvalidTokenException,
    InsufficientPermissionsException,
    InvalidIdCardFormatException,
)
from app.api.v1.api import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)


# 全局异常处理器
@app.exception_handler(UserAlreadyExistsException)
async def user_already_exists_exception_handler(request: Request, exc: UserAlreadyExistsException):
    return JSONResponse(
        status_code=400,
        content={"code": 400, "message": exc.detail, "data": None},
    )


@app.exception_handler(UserNotFoundException)
async def user_not_found_exception_handler(request: Request, exc: UserNotFoundException):
    return JSONResponse(
        status_code=404,
        content={"code": 404, "message": exc.detail, "data": None},
    )


@app.exception_handler(InvalidCredentialsException)
async def invalid_credentials_exception_handler(request: Request, exc: InvalidCredentialsException):
    return JSONResponse(
        status_code=401,
        content={"code": 401, "message": exc.detail, "data": None},
        headers=exc.headers,
    )


@app.exception_handler(InvalidTokenException)
async def invalid_token_exception_handler(request: Request, exc: InvalidTokenException):
    return JSONResponse(
        status_code=401,
        content={"code": 401, "message": exc.detail, "data": None},
        headers=exc.headers,
    )


@app.exception_handler(InsufficientPermissionsException)
async def insufficient_permissions_exception_handler(request: Request, exc: InsufficientPermissionsException):
    return JSONResponse(
        status_code=403,
        content={"code": 403, "message": exc.detail, "data": None},
    )


@app.exception_handler(InvalidIdCardFormatException)
async def invalid_id_card_format_exception_handler(request: Request, exc: InvalidIdCardFormatException):
    return JSONResponse(
        status_code=400,
        content={"code": 400, "message": exc.detail, "data": None},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """处理FastAPI内置的HTTP异常（如OAuth2认证失败）"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": exc.status_code, "message": exc.detail, "data": None},
        headers=exc.headers,
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"code": 500, "message": "服务器内部错误", "data": None},
    )


@app.get("/")
async def root():
    return {"code": 200, "message": "欢迎使用灵创AI工具箱API", "data": {"version": "1.0.0"}}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
