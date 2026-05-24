from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, admin, health, points, stream, tasks, works, ideas, tools, payment, files, chat, settings, feedback

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["健康检查"])
api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_router.include_router(users.router, prefix="/users", tags=["用户"])
api_router.include_router(points.router, prefix="/points", tags=["积分管理"])
api_router.include_router(stream.router, prefix="/stream", tags=["实时流"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["任务管理"])
api_router.include_router(works.router, prefix="/works", tags=["成果管理"])
api_router.include_router(ideas.router, prefix="/ideas", tags=["构思与投票"])
api_router.include_router(tools.router, prefix="/tools", tags=["工具管理"])
api_router.include_router(payment.router, prefix="/payment", tags=["支付充值"])
api_router.include_router(admin.router, prefix="/admin", tags=["管理后台"])
api_router.include_router(settings.router, prefix="/admin", tags=["管理后台"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(chat.router, prefix="/chat", tags=["对话模式"])
api_router.include_router(feedback.router, prefix="/feedback", tags=["用户反馈"])
