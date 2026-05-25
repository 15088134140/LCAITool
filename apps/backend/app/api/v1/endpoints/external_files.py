"""
外部文件服务
通过 API Key 认证，提供对外生成的文件下载服务。
"""
import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.v1.middleware.api_key_auth import verify_api_key
from app.models.api_key import ApiKey
from app.models.external_file import ExternalFile

router = APIRouter(dependencies=[Depends(verify_api_key)])


@router.get(
    "/files/{file_id}",
    summary="下载外部文件",
    response_class=FileResponse,
)
async def get_external_file(
    file_id: str,
    api_key: ApiKey = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    """通过文件 ID 下载外部生成的文件。

    需要 API Key 认证，且仅能访问属于该 API Key 所属用户的文件。
    """
    # 验证 UUID 格式
    try:
        fid = uuid.UUID(file_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    # 查询数据库记录
    result = await db.execute(
        select(ExternalFile).where(ExternalFile.id == fid)
    )
    ext_file: Optional[ExternalFile] = result.scalar_one_or_none()

    if not ext_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    # 文件所属权校验：仅 API Key 所属用户可访问
    if ext_file.user_id != api_key.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # 验证文件在磁盘上存在
    if not os.path.exists(ext_file.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk",
        )

    media_type = ext_file.mime_type or "application/octet-stream"

    return FileResponse(
        path=ext_file.file_path,
        media_type=media_type,
        filename=ext_file.file_name,
    )
