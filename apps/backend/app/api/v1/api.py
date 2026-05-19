from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, admin, health, points

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["健康检查"])
api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_router.include_router(users.router, prefix="/users", tags=["用户"])
api_router.include_router(points.router, prefix="/points", tags=["积分管理"])
api_router.include_router(admin.router, prefix="/admin", tags=["管理后台"])
