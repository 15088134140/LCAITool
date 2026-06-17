"""
文件服务 API 端点
从本地持久化存储读取文件，支持图片预览、ZIP 下载和用户文件上传
"""
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_db, get_current_active_user
from app.core.config import settings
from app.models.user import User
from app.models.user_upload import UserUpload
from app.models.task import Work, WorkFile

router = APIRouter()

# 允许的 MIME 类型
ALLOWED_MIME_PREFIXES = (
    "image/", "application/pdf", "text/plain",
    "audio/", "video/", "application/zip",
)
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


def _safe_filename(filename: str) -> str:
    """生成安全的存储文件名"""
    name, ext = os.path.splitext(filename)
    safe_name = "".join(c for c in name if c.isalnum() or c in "._-")
    return f"{safe_name}{ext}"


def _validate_mime(mime_type: str) -> bool:
    """校验 MIME 类型是否在允许列表中"""
    for prefix in ALLOWED_MIME_PREFIXES:
        if prefix.endswith("/"):
            if mime_type and mime_type.startswith(prefix):
                return True
        elif mime_type == prefix:
            return True
    return False


@router.post("/uploads", summary="上传文件")
async def upload_file(
    file: UploadFile = File(...),
    tool_id: str = Form(None),
    field_key: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    用户上传文件（需登录）

    - 文件大小限制 20MB
    - MIME 类型白名单校验
    - 返回文件元数据供写入 input_params
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名为空")

    # 校验文件大小
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"文件大小超过限制（最大 {MAX_FILE_SIZE // 1024 // 1024}MB）")

    # 校验 MIME 类型
    mime_type = file.content_type or "application/octet-stream"
    if not _validate_mime(mime_type):
        raise HTTPException(status_code=400, detail=f"不支持的文件类型: {mime_type}")

    # 生成存储路径
    upload_id = uuid.uuid4()
    safe_name = _safe_filename(file.filename)
    upload_dir = os.path.join(settings.STORAGE_DIR, "uploads", str(current_user.id))
    os.makedirs(upload_dir, exist_ok=True)
    storage_name = f"{upload_id}_{safe_name}"
    file_path = os.path.join(upload_dir, storage_name)

    # 写入文件
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # 记录到数据库
    tool_uuid = uuid.UUID(tool_id) if tool_id else None
    upload = UserUpload(
        id=upload_id,
        user_id=current_user.id,
        tool_id=tool_uuid,
        field_key=field_key,
        file_name=file.filename,
        file_path=os.path.join("uploads", str(current_user.id), storage_name),
        file_size=file_size,
        mime_type=mime_type,
    )
    db.add(upload)
    await db.commit()
    await db.refresh(upload)

    return {
        "id": str(upload.id),
        "file_name": upload.file_name,
        "file_size": upload.file_size,
        "mime_type": upload.mime_type,
        "url": f"/api/v1/files/uploads/{upload.id}",
    }


@router.get("/uploads/{upload_id}", summary="获取上传文件")
async def get_upload_file(
    upload_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    下载/预览用户上传的文件（需登录，只能访问自己的文件）
    """
    result = await db.execute(
        select(UserUpload).where(
            UserUpload.id == upload_id,
            UserUpload.user_id == current_user.id,
        )
    )
    upload = result.scalar_one_or_none()
    if not upload:
        raise HTTPException(status_code=404, detail="文件不存在")

    full_path = os.path.join(settings.STORAGE_DIR, str(upload.file_path))
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="文件不存在或已被清理")

    return FileResponse(
        path=full_path,
        media_type=str(upload.mime_type or "application/octet-stream"),
        filename=str(upload.file_name),
    )


@router.get("/works/{file_id}", summary="获取成果文件")
async def get_work_file(
    file_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    下载/预览成果文件（图片、视频、音频等）。

    - 不做权限校验，前端 <img>/<video> 等标签可直接引用。
    - 文件路径 = WORKS_DIR / {task_id} / {file_url}（file_url 为相对路径）。
    """
    result = await db.execute(
        select(WorkFile, Work)
        .join(Work, Work.id == WorkFile.work_id)
        .where(WorkFile.id == file_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="文件不存在")

    work_file, work = row
    full_path = os.path.join(settings.WORKS_DIR, str(work.task_id), str(work_file.file_url))
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="文件不存在或已被清理")

    return FileResponse(
        path=full_path,
        media_type=str(work_file.mime_type or "application/octet-stream"),
        filename=str(work_file.file_name),
    )
