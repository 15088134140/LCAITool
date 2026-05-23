"""
文件服务 API 端点
从本地持久化存储读取文件，支持图片预览和 ZIP 下载
"""
import os
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.core.config import settings
from sqlalchemy import select

router = APIRouter()


@router.get("/works/{work_file_id}", summary="获取成果文件")
async def get_work_file(
    work_file_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    根据 WorkFile ID 获取文件内容

    支持：
    - 图片预览（直接返回图片流）
    - ZIP 下载（设置 Content-Disposition）
    - 其他文件类型自动识别 MIME
    """
    from app.models.task import Work, WorkFile as WorkFileModel

    result = await db.execute(
        select(WorkFileModel).where(WorkFileModel.id == work_file_id)
    )
    work_file = result.scalar_one_or_none()

    if not work_file:
        raise HTTPException(status_code=404, detail="文件不存在")

    # 验证权限：文件所属成果的用户
    work_result = await db.execute(
        select(Work).where(Work.id == work_file.work_id)
    )
    work = work_result.scalar_one_or_none()
    if not work or work.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此文件")

    # 构建文件路径
    file_path = os.path.join(settings.WORKS_DIR, str(work.task_id), work_file.file_url)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="文件不存在或已被清理")

    # 根据文件类型设置 Content-Type
    media_type_map = {
        "image": "image/png",
        "audio": "audio/wav",
        "pdf": "application/pdf",
        "psd": "application/octet-stream",
        "other": "application/octet-stream",
    }
    media_type = media_type_map.get(work_file.file_type, "application/octet-stream")

    # ZIP 文件设置下载头
    headers = {}
    if work_file.file_type == "other" and work_file.file_name.endswith(".zip"):
        headers["Content-Disposition"] = f'attachment; filename="{work_file.file_name}"'

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=work_file.file_name,
        headers=headers
    )
