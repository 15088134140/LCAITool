from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, health

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["健康检查"])
api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_router.include_router(users.router, prefix="/users", tags=["用户"])
