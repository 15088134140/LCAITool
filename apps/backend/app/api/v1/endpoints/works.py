"""
成果管理 API 端点
实现成果列表、详情、迭代、分享、下载权限检查等功能
"""
import io
import os
import zipfile
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.schemas.work import (
    Work as WorkSchema,
    WorkDetail as WorkDetailSchema,
    WorkShareCreate,
    WorkShare as WorkShareSchema,
    IterationCreate,
)
from app.services.work_service import WorkService
from app.core.config import settings

router = APIRouter()


@router.get("", summary="获取用户成果列表")
async def get_user_works(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(12, ge=1, le=100, description="每页数量"),
    status: Optional[str] = Query(None, description="状态筛选: published, draft"),
    category_id: Optional[str] = Query(None, description="工具分类ID"),
    search: Optional[str] = Query(None, max_length=255, description="按名称搜索"),
    date_from: Optional[int] = Query(None, description="起始时间戳"),
    date_to: Optional[int] = Query(None, description="结束时间戳"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    分页获取当前用户的成果列表
    """
    skip = (page - 1) * page_size
    category_uuid = uuid.UUID(category_id) if category_id else None

    works, total = await WorkService.list_user_works(
        db=db,
        user_id=current_user.id,
        status=status,
        category_id=category_uuid,
        search=search,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=page_size
    )

    items = [WorkSchema.model_validate(w) for w in works]

    # 获取统计信息（使用相同筛选条件，不分页）
    stats = await WorkService.get_works_stats(
        db=db,
        user_id=current_user.id,
        category_id=category_uuid,
        search=search,
        date_from=date_from,
        date_to=date_to,
    )

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "stats": stats,
    }


@router.put("/{work_id}/status", summary="切换成果状态")
async def update_work_status(
    work_id: uuid.UUID,
    status: str = Query(..., description="目标状态：published 或 draft"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """切换成果的 published/draft 状态"""
    work = await WorkService.toggle_status(
        db=db,
        work_id=work_id,
        current_user_id=current_user.id,
        new_status=status
    )
    return WorkSchema.model_validate(work)


@router.get("/{work_id}", response_model=WorkDetailSchema, summary="获取成果详情")
async def get_work_detail(
    work_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    获取成果的详细信息，包含：
    - 基本信息
    - 文件列表
    - 分享记录
    - 下载权限状态
    """
    work = await WorkService.get_work_detail(
        db=db,
        work_id=work_id,
        current_user_id=current_user.id
    )

    # 权限检查：所有者或公开状态可查看
    from app.core.exceptions import ResourceNotFoundException, InsufficientPermissionsException

    if not work:
        raise ResourceNotFoundException("成果不存在")

    if work.user_id != current_user.id and not work.is_public:
        raise InsufficientPermissionsException()

    # 增加查看次数
    await WorkService.increment_view_count(db=db, work_id=work_id)

    return work


@router.post("/{work_id}/iterate", response_model=WorkSchema, summary="迭代创作")
async def iterate_work(
    work_id: uuid.UUID,
    iteration_in: IterationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    基于已有成果创建新版本（迭代创作）

    - 复制原成果的文件
    - 版本号自动 +1
    - 可以自定义新标题和描述
    - 迭代优惠：基础费用打8折
    """
    # 验证父成果存在且属于当前用户
    parent_work = await WorkService.get_by_id(db=db, work_id=work_id)

    from app.core.exceptions import ResourceNotFoundException, InsufficientPermissionsException

    if not parent_work:
        raise ResourceNotFoundException("父成果不存在")

    if parent_work.user_id != current_user.id:
        raise InsufficientPermissionsException()

    # 创建迭代版本
    new_work = await WorkService.create_iteration(
        db=db,
        parent_work_id=work_id,
        current_user_id=current_user.id,
        title=iteration_in.title,
        description=iteration_in.description
    )

    return new_work


@router.put("/{work_id}/share", response_model=WorkShareSchema, summary="设置成果分享")
async def set_work_share(
    work_id: uuid.UUID,
    share_in: WorkShareCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    设置成果的分享状态并创建分享链接

    - 支持设置公开/私有状态
    - 支持设置分享密码
    - 支持设置分享过期时间
    - 生成唯一的分享链接
    """
    work = await WorkService.get_by_id(db=db, work_id=work_id)

    from app.core.exceptions import ResourceNotFoundException, InsufficientPermissionsException

    if not work:
        raise ResourceNotFoundException("成果不存在")

    if work.user_id != current_user.id:
        raise InsufficientPermissionsException()

    # 更新公开状态
    if share_in.share_type in ["public", "link"]:
        await WorkService.set_public_status(
            db=db,
            work_id=work_id,
            is_public=True,
            current_user_id=current_user.id
        )
    else:
        await WorkService.set_public_status(
            db=db,
            work_id=work_id,
            is_public=False,
            current_user_id=current_user.id
        )

    # 创建分享记录
    share = await WorkService.create_share_link(
        db=db,
        work_id=work_id,
        share_type=share_in.share_type,
        password=share_in.password,
        expire_days=share_in.expire_days
    )

    return share


@router.get("/{work_id}/download-permission", summary="检查成果下载权限")
async def check_download_permission(
    work_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    检查当前用户是否有权限下载该成果

    权限规则：
    1. 成果所有者始终有权限
    2. 公开成果允许所有人下载
    3. 分享链接访问的用户根据分享设置判断
    """
    has_permission = await WorkService.check_download_permission(
        db=db,
        work_id=work_id,
        user_id=current_user.id
    )

    return {
        "work_id": str(work_id),
        "has_permission": has_permission,
        "message": "有权限下载" if has_permission else "无下载权限"
    }


@router.get("/{work_id}/files", summary="获取成果文件列表")
async def get_work_files(
    work_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    获取成果的文件列表
    """
    from app.services.work_service import WorkService
    from app.core.exceptions import ResourceNotFoundException

    work = await WorkService.get_by_id(db=db, work_id=work_id)
    if not work:
        raise ResourceNotFoundException("成果不存在")

    if work.user_id != current_user.id and not work.is_public:
        from app.core.exceptions import InsufficientPermissionsException
        raise InsufficientPermissionsException()

    from app.schemas.work import WorkFile as WorkFileSchema
    raw_files = await WorkService.get_work_files(db=db, work_id=work_id)
    return [WorkFileSchema.model_validate(f) for f in raw_files]


@router.get("/{work_id}/versions", summary="获取成果版本历史")
async def get_work_versions(
    work_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    获取成果的版本历史（基于父ID查找同源所有版本）
    """
    from app.services.work_service import WorkService
    from app.core.exceptions import ResourceNotFoundException

    work = await WorkService.get_by_id(db=db, work_id=work_id)
    if not work:
        raise ResourceNotFoundException("成果不存在")

    if work.user_id != current_user.id and not work.is_public:
        from app.core.exceptions import InsufficientPermissionsException
        raise InsufficientPermissionsException()

    from app.schemas.work import Work as WorkSchema
    raw_versions = await WorkService.get_work_versions(db=db, work_id=work_id)
    return [WorkSchema.model_validate(v) for v in raw_versions]


@router.get("/{work_id}/download", summary="下载成果全部文件（ZIP压缩包）")
async def download_work_files(
    work_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    动态打包成果的完整工作目录为 ZIP 压缩包并下载

    直接以 task_id 目录为单位打包，不依赖 WorkFile 记录与磁盘文件名的一致性。
    """
    from app.models.task import Work
    from app.core.exceptions import ResourceNotFoundException, InsufficientPermissionsException

    # 验证成果存在且有权限
    work = await WorkService.get_by_id(db=db, work_id=work_id)
    if not work:
        raise ResourceNotFoundException("成果不存在")
    if work.user_id != current_user.id and not work.is_public:
        raise InsufficientPermissionsException()

    work_dir = os.path.join(settings.WORKS_DIR, str(work.task_id))
    if not os.path.isdir(work_dir):
        raise HTTPException(status_code=404, detail="成果文件目录不存在")

    # 在内存中创建 ZIP，保留目录结构
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, _dirs, files in os.walk(work_dir):
            for file_name in files:
                full_path = os.path.join(root, file_name)
                # 相对路径作为 ZIP 内的存档名，保留目录层级
                arcname = os.path.relpath(full_path, work_dir)
                zf.write(full_path, arcname)

    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="work_{work_id}.zip"',
            "Content-Type": "application/zip",
        }
    )
