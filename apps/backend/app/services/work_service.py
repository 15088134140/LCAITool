import uuid
import time
import secrets
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.models.task import Work, WorkFile, WorkShare, Task
from app.schemas.work import (
    WorkCreate, WorkUpdate, WorkFileCreate,
    WorkShareCreate, WorkDetail, IterationCreate
)
from app.core.exceptions import (
    ResourceNotFoundException,
    BusinessException,
    InsufficientPermissionsException
)


class WorkService:
    """成果管理服务 - 处理成果创建、查询、分享、迭代等操作"""

    # ============ Work CRUD Methods ============

    @staticmethod
    async def create_work(
        db: AsyncSession,
        work_in: WorkCreate
    ) -> Work:
        """
        仅创建成果（无文件）

        Args:
            db: 数据库会话
            work_in: 成果创建参数

        Returns:
            创建的成果对象
        """
        db_work = Work(**work_in.model_dump())
        db.add(db_work)
        await db.commit()
        await db.refresh(db_work)
        return db_work

    @staticmethod
    async def create_work_with_files(
        db: AsyncSession,
        work_in: WorkCreate,
        file_list: List[WorkFileCreate]
    ) -> Work:
        """
        批量创建成果和关联文件

        Args:
            db: 数据库会话
            work_in: 成果创建参数
            file_list: 文件列表

        Returns:
            创建的成果对象
        """
        # 创建成果
        db_work = Work(**work_in.model_dump())
        db.add(db_work)
        await db.flush()  # 获取 work.id

        # 批量创建文件
        for file_in in file_list:
            db_file = WorkFile(
                work_id=db_work.id,
                **file_in.model_dump(exclude={"work_id"})
            )
            db.add(db_file)

        await db.commit()
        await db.refresh(db_work)
        return db_work

    @staticmethod
    async def get_by_id(db: AsyncSession, work_id: uuid.UUID) -> Optional[Work]:
        """根据ID获取成果"""
        result = await db.execute(select(Work).where(Work.id == work_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_work_detail(
        db: AsyncSession,
        work_id: uuid.UUID,
        current_user_id: Optional[uuid.UUID] = None
    ) -> WorkDetail:
        """
        获取成果详情，包含文件列表和分享记录

        Args:
            db: 数据库会话
            work_id: 成果ID
            current_user_id: 当前用户ID，用于权限检查

        Returns:
            WorkDetail: 成果详情对象
        """
        # 查询成果及其关联数据
        result = await db.execute(
            select(Work)
            .where(Work.id == work_id)
        )
        work = result.scalar_one_or_none()

        if not work:
            raise ResourceNotFoundException("成果不存在")

        if work.is_deleted:
            raise ResourceNotFoundException("成果不存在或已被删除")

        # 获取 Task 的 input_params
        input_params = None
        tool_param_schema = None
        usage_modes = []
        if work.task_id:
            task_result = await db.execute(
                select(Task).where(Task.id == work.task_id)
            )
            task = task_result.scalar_one_or_none()
            if task:
                input_params = task.input_params

        # 获取 Tool 的 param_schema 和 usage_modes
        if work.tool_id:
            from app.models.tool import Tool as ToolModel
            tool_result = await db.execute(
                select(ToolModel).where(ToolModel.id == work.tool_id)
            )
            tool = tool_result.scalar_one_or_none()
            if tool:
                if tool.param_schema:
                    tool_param_schema = sorted(tool.param_schema, key=lambda x: x.get("order", 999))
                usage_modes = tool.usage_modes or []

        # 获取文件列表
        files_result = await db.execute(
            select(WorkFile).where(WorkFile.work_id == work_id)
        )
        files = files_result.scalars().all()

        # 获取分享记录
        shares_result = await db.execute(
            select(WorkShare).where(WorkShare.work_id == work_id)
        )
        shares = shares_result.scalars().all()

        # 检查下载权限
        has_download_permission = WorkService._check_download_permission_internal(
            work=work,
            user_id=current_user_id
        )

        # 构建详情对象
        work_dict = {c.name: getattr(work, c.name) for c in work.__table__.columns}
        work_detail = WorkDetail(
            **work_dict,
            files=files,
            shares=shares,
            has_download_permission=has_download_permission,
            input_params=input_params,
            tool_param_schema=tool_param_schema,
            usage_modes=usage_modes,
        )

        return work_detail

    @staticmethod
    def _is_relative_path(url: Optional[str]) -> bool:
        """判断 cover_image 是否为无法解析的相对路径"""
        if not url:
            return True
        # 相对路径如 'images/page_1.png' 无法被前端 resolveApiUrl 解析
        return not (url.startswith("http://") or url.startswith("https://") or url.startswith("/"))

    @staticmethod
    async def _fill_cover_images(db: AsyncSession, works: List[Work]) -> None:
        """
        为 cover_image 为空或为相对路径的成果自动填充 WorkFile 中的第一张图片

        查询 WorkFile 中 file_type='image' 的第一张图（按 page_number 排序），
        将 cover_image 设为 /api/v1/files/works/{file_id} 格式，前端 resolveApiUrl 可解析。

        Args:
            db: 数据库会话
            works: 成果列表（会被就地修改）
        """
        # 找出 cover_image 为空或为相对路径的成果
        need_fill = [w for w in works if WorkService._is_relative_path(w.cover_image)]
        if not need_fill:
            return

        work_ids = [w.id for w in need_fill]
        # 查询这些成果的第一张图片文件（按 page_number 排序），需要 id 构造 URL
        sub = (
            select(
                WorkFile.work_id,
                WorkFile.id,
                func.row_number().over(
                    partition_by=WorkFile.work_id,
                    order_by=WorkFile.page_number.asc().nulls_last()
                ).label("rn")
            )
            .where(
                WorkFile.work_id.in_(work_ids),
                WorkFile.file_type == "image"
            )
            .subquery()
        )
        stmt = select(sub.c.work_id, sub.c.id).where(sub.c.rn == 1)
        result = await db.execute(stmt)
        cover_map = {row.work_id: row.id for row in result}

        # 就地填充为前端可解析的 API 路径
        for w in need_fill:
            if w.id in cover_map:
                w.cover_image = f"/api/v1/files/works/{cover_map[w.id]}"

    @staticmethod
    async def list_user_works(
        db: AsyncSession,
        user_id: uuid.UUID,
        status: Optional[str] = None,
        category_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        date_from: Optional[int] = None,
        date_to: Optional[int] = None,
        skip: int = 0,
        limit: int = 12
    ) -> Tuple[List[Work], int]:
        """获取用户的成果列表（带筛选和分页）"""
        from app.models.tool import Tool
        conditions = [Work.user_id == user_id, Work.is_deleted == False]

        if status is not None:
            conditions.append(Work.status == status)

        if category_id is not None:
            conditions.append(Tool.category_id == category_id)

        if search is not None:
            conditions.append(Work.title.ilike(f"%{search}%", escape="/"))

        if date_from is not None:
            conditions.append(Work.created_at >= date_from)

        if date_to is not None:
            conditions.append(Work.created_at <= date_to)

        # 总数查询（category 筛选需要 JOIN Tool）
        if category_id is not None:
            base_query = select(Work).join(Tool, Work.tool_id == Tool.id).where(and_(*conditions))
        else:
            base_query = select(Work).where(and_(*conditions))
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # 分页查询
        query = (
            base_query
            .order_by(Work.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(query)
        works = list(result.scalars().all())

        # 批量加载 tool usage_modes（避免前端 N+1 查询每个 tool 的 usage_modes）
        tool_ids = list(set(w.tool_id for w in works if w.tool_id))
        if tool_ids:
            tool_result = await db.execute(
                select(Tool.id, Tool.usage_modes).where(Tool.id.in_(tool_ids))
            )
            usage_modes_map = {row.id: (row.usage_modes or []) for row in tool_result}
            for w in works:
                w.usage_modes = usage_modes_map.get(w.tool_id, [])

        # 自动填充 cover_image
        await WorkService._fill_cover_images(db, works)

        return works, total

    @staticmethod
    async def list_public_works(
        db: AsyncSession,
        tool_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[Work], int]:
        """
        获取公开的成果列表

        Args:
            db: 数据库会话
            tool_id: 工具ID筛选
            skip: 跳过数量
            limit: 每页数量

        Returns:
            Tuple[List[Work], int]: (成果列表, 总数)
        """
        conditions = [Work.is_public == True, Work.status == "published", Work.is_deleted == False]

        if tool_id is not None:
            conditions.append(Work.tool_id == tool_id)

        # 总数查询
        count_query = select(func.count()).select_from(Work).where(and_(*conditions))
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # 分页查询
        query = (
            select(Work)
            .where(and_(*conditions))
            .order_by(Work.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(query)
        works = list(result.scalars().all())

        # 自动填充 cover_image
        await WorkService._fill_cover_images(db, works)

        return works, total

    @staticmethod
    async def update_work(
        db: AsyncSession,
        work_id: uuid.UUID,
        work_in: WorkUpdate,
        current_user_id: uuid.UUID
    ) -> Work:
        """
        更新成果信息

        Args:
            db: 数据库会话
            work_id: 成果ID
            work_in: 更新参数
            current_user_id: 当前用户ID

        Returns:
            更新后的成果对象
        """
        work = await WorkService.get_by_id(db, work_id)
        if not work:
            raise ResourceNotFoundException("成果不存在")

        # 权限检查：仅所有者可修改
        if work.user_id != current_user_id:
            raise InsufficientPermissionsException()

        # 更新字段
        update_data = work_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(work, field, value)

        await db.commit()
        await db.refresh(work)
        return work

    @staticmethod
    async def delete_work(
        db: AsyncSession,
        work_id: uuid.UUID,
        current_user_id: uuid.UUID
    ) -> None:
        """软删除成果（标记 is_deleted=True，数据保留）"""
        work = await WorkService.get_by_id(db, work_id)
        if not work:
            raise ResourceNotFoundException("成果不存在")

        # 权限检查：仅所有者可删除
        if work.user_id != current_user_id:
            raise InsufficientPermissionsException()

        work.is_deleted = True
        work.deleted_at = int(time.time())
        await db.commit()

    @staticmethod
    async def toggle_status(
        db: AsyncSession,
        work_id: uuid.UUID,
        current_user_id: uuid.UUID,
        new_status: str
    ) -> Work:
        """切换成果的 published/draft 状态"""
        if new_status not in ("published", "draft"):
            raise BusinessException("状态值无效，仅支持 published 和 draft")

        work = await WorkService.get_by_id(db, work_id)
        if not work:
            raise ResourceNotFoundException("成果不存在")

        # 权限检查：仅所有者可修改状态
        if work.user_id != current_user_id:
            raise InsufficientPermissionsException()

        work.status = new_status
        await db.commit()
        await db.refresh(work)
        return work

    @staticmethod
    async def get_works_stats(
        db: AsyncSession,
        user_id: uuid.UUID,
        category_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        date_from: Optional[int] = None,
        date_to: Optional[int] = None,
    ) -> dict:
        """获取用户的成果统计信息"""
        from app.schemas.work import WorkStats
        from app.models.tool import Tool
        from sqlalchemy import func as sa_func

        conditions = [Work.user_id == user_id, Work.is_deleted == False]

        if category_id is not None:
            conditions.append(Work.tool_id == Tool.id)
            conditions.append(Tool.category_id == category_id)

        if search is not None:
            conditions.append(Work.title.ilike(f"%{search}%", escape="/"))

        if date_from is not None:
            conditions.append(Work.created_at >= date_from)

        if date_to is not None:
            conditions.append(Work.created_at <= date_to)

        if category_id is not None:
            stats_query = select(
                sa_func.count().label("total"),
                sa_func.sum(sa_func.cast(Work.status == "published", sa_func.Integer)).label("published_count"),
                sa_func.coalesce(sa_func.sum(Work.view_count), 0).label("total_views"),
                sa_func.coalesce(sa_func.avg(Work.version), 0.0).label("avg_version"),
            ).select_from(Work).join(Tool, Work.tool_id == Tool.id).where(and_(*conditions))
        else:
            stats_query = select(
                sa_func.count().label("total"),
                sa_func.sum(sa_func.cast(Work.status == "published", sa_func.Integer)).label("published_count"),
                sa_func.coalesce(sa_func.sum(Work.view_count), 0).label("total_views"),
                sa_func.coalesce(sa_func.avg(Work.version), 0.0).label("avg_version"),
            ).where(and_(*conditions))

        stats_result = await db.execute(stats_query)
        row = stats_result.one()

        return WorkStats(
            total=row.total,
            published_count=row.published_count or 0,
            total_views=row.total_views or 0,
            avg_version=round(float(row.avg_version or 0), 1),
        ).model_dump()

    # ============ Public Status Methods ============

    @staticmethod
    async def set_public_status(
        db: AsyncSession,
        work_id: uuid.UUID,
        is_public: bool,
        current_user_id: uuid.UUID
    ) -> Work:
        """
        设置成果公开/私有状态

        Args:
            db: 数据库会话
            work_id: 成果ID
            is_public: 是否公开
            current_user_id: 当前用户ID

        Returns:
            更新后的成果对象
        """
        work = await WorkService.get_by_id(db, work_id)
        if not work:
            raise ResourceNotFoundException("成果不存在")

        # 权限检查：仅所有者可修改公开状态
        if work.user_id != current_user_id:
            raise InsufficientPermissionsException()

        work.is_public = is_public
        await db.commit()
        await db.refresh(work)
        return work

    # ============ Share Methods ============

    @staticmethod
    async def create_share_link(
        db: AsyncSession,
        work_id: uuid.UUID,
        share_type: str = "link",
        password: Optional[str] = None,
        expire_days: Optional[int] = None
    ) -> WorkShare:
        """
        生成分享链接

        Args:
            db: 数据库会话
            work_id: 成果ID
            share_type: 分享类型 public/link/friends
            password: 分享密码
            expire_days: 过期天数

        Returns:
            分享记录对象
        """
        work = await WorkService.get_by_id(db, work_id)
        if not work:
            raise ResourceNotFoundException("成果不存在")

        # 生成唯一分享令牌
        share_token = secrets.token_urlsafe(16)
        share_url = f"/share/{share_token}"

        # 计算过期时间
        expire_at = None
        if expire_days:
            expire_at = int(time.time()) + expire_days * 24 * 3600

        # 创建分享记录
        db_share = WorkShare(
            work_id=work_id,
            share_type=share_type,
            share_url=share_url,
            password=password,
            expire_at=expire_at,
            status="pending",  # 待审核
            view_count=0,
            like_count=0,
            comment_count=0
        )
        db.add(db_share)

        # 更新成果的分享计数
        work.share_count += 1

        await db.commit()
        await db.refresh(db_share)
        return db_share

    @staticmethod
    async def get_share_by_token(
        db: AsyncSession,
        share_token: str
    ) -> Optional[WorkShare]:
        """根据分享令牌获取分享记录"""
        share_url = f"/share/{share_token}"
        result = await db.execute(
            select(WorkShare).where(WorkShare.share_url == share_url)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def increment_share_view_count(
        db: AsyncSession,
        share_id: uuid.UUID
    ) -> None:
        """增加分享的查看次数"""
        share = await db.get(WorkShare, share_id)
        if share:
            share.view_count += 1
            await db.commit()

    # ============ Iteration Methods ============

    @staticmethod
    async def create_iteration(
        db: AsyncSession,
        parent_work_id: uuid.UUID,
        current_user_id: uuid.UUID,
        title: Optional[str] = None,
        description: Optional[str] = None
    ) -> Work:
        """
        基于父成果创建新版本（迭代）

        Args:
            db: 数据库会话
            parent_work_id: 父成果ID
            current_user_id: 当前用户ID
            title: 新标题（可选）
            description: 新描述（可选）

        Returns:
            新版本成果对象
        """
        # 获取父成果
        parent_work = await WorkService.get_by_id(db, parent_work_id)
        if not parent_work:
            raise ResourceNotFoundException("父成果不存在")

        # 权限检查：仅所有者可以迭代
        if parent_work.user_id != current_user_id:
            raise InsufficientPermissionsException()

        # 获取新版本号
        new_version = parent_work.version + 1

        # 自动生成标题
        if title is None:
            title = f"{parent_work.title} (V{new_version})"

        # 使用传入的描述或继承父描述
        if description is None:
            description = parent_work.description

        # 创建新版本成果
        # 注意：这里没有 task_id，因为迭代可能不需要重新执行任务
        # 实际应用中可能需要创建新的 task
        db_work = Work(
            user_id=current_user_id,
            task_id=parent_work.task_id,  # 继承原任务ID
            parent_id=parent_work_id,
            tool_id=parent_work.tool_id,
            title=title,
            description=description,
            version=new_version,
            cover_image=parent_work.cover_image,
            status="draft",
            is_public=False,
            view_count=0,
            like_count=0,
            share_count=0
        )
        db.add(db_work)
        await db.flush()

        # 复制原成果的文件
        parent_files = await WorkService.get_work_files(db, parent_work_id)
        for file in parent_files:
            new_file = WorkFile(
                work_id=db_work.id,
                file_type=file.file_type,
                file_name=file.file_name,
                file_url=file.file_url,
                file_size=file.file_size,
                page_number=file.page_number,
                mime_type=file.mime_type,
                duration=file.duration,
                is_preview=file.is_preview
            )
            db.add(new_file)

        await db.commit()
        await db.refresh(db_work)
        return db_work

    @staticmethod
    async def get_iteration_history(
        db: AsyncSession,
        work_id: uuid.UUID
    ) -> List[Work]:
        """
        获取成果的迭代历史（所有祖先版本）

        Args:
            db: 数据库会话
            work_id: 成果ID

        Returns:
            迭代历史列表
        """
        history = []
        current_id = work_id

        while current_id:
            work = await WorkService.get_by_id(db, current_id)
            if not work:
                break
            history.append(work)
            current_id = work.parent_id

        # 按版本号升序排列
        history.sort(key=lambda x: x.version)
        return history

    # ============ Permission Methods ============

    @staticmethod
    async def check_download_permission(
        db: AsyncSession,
        work_id: uuid.UUID,
        user_id: Optional[uuid.UUID]
    ) -> bool:
        """
        检查用户是否有权限下载成果

        Args:
            db: 数据库会话
            work_id: 成果ID
            user_id: 用户ID（None表示未登录用户）

        Returns:
            bool: 是否有权限
        """
        work = await WorkService.get_by_id(db, work_id)
        if not work:
            return False

        return WorkService._check_download_permission_internal(work, user_id)

    @staticmethod
    def _check_download_permission_internal(
        work: Work,
        user_id: Optional[uuid.UUID]
    ) -> bool:
        """内部权限检查方法（避免重复查询）"""
        # 所有者有完全权限
        if user_id is not None and work.user_id == user_id:
            return True

        # 公开成果允许下载
        if work.is_public and work.status == "published":
            return True

        # TODO: 可以扩展更多权限逻辑（如分享链接访问、团队成员等）

        return False

    # ============ View & Like Count Methods ============

    @staticmethod
    async def increment_view_count(
        db: AsyncSession,
        work_id: uuid.UUID
    ) -> None:
        """增加成果的查看次数"""
        work = await WorkService.get_by_id(db, work_id)
        if work:
            work.view_count += 1
            await db.commit()

    @staticmethod
    async def increment_like_count(
        db: AsyncSession,
        work_id: uuid.UUID
    ) -> None:
        """增加成果的点赞次数"""
        work = await WorkService.get_by_id(db, work_id)
        if work:
            work.like_count += 1
            await db.commit()

    # ============ Work File Methods ============

    @staticmethod
    async def get_work_files(
        db: AsyncSession,
        work_id: uuid.UUID
    ) -> List[WorkFile]:
        """获取成果的文件列表"""
        result = await db.execute(
            select(WorkFile)
            .where(WorkFile.work_id == work_id)
            .order_by(WorkFile.page_number, WorkFile.created_at)
        )
        return result.scalars().all()

    @staticmethod
    async def get_work_versions(
        db: AsyncSession,
        work_id: uuid.UUID
    ) -> List[Work]:
        """获取成果的版本历史"""
        from sqlalchemy import or_
        # 先找到当前 work 的根 parent_id
        stmt = select(Work).where(Work.id == work_id)
        result = await db.execute(stmt)
        current_work = result.scalar_one_or_none()
        if not current_work:
            return []

        # 查找同根的所有版本（parent_id 链）
        root_id = current_work.parent_id or current_work.id
        stmt = select(Work).where(
            or_(Work.id == root_id, Work.parent_id == root_id, Work.id == current_work.id)
        ).order_by(Work.version)
        result = await db.execute(stmt)
        versions = list(result.scalars().all())
        await WorkService._fill_cover_images(db, versions)
        return versions

    @staticmethod
    async def add_work_file(
        db: AsyncSession,
        work_id: uuid.UUID,
        file_in: WorkFileCreate,
        current_user_id: uuid.UUID
    ) -> WorkFile:
        """
        为成果添加文件

        Args:
            db: 数据库会话
            work_id: 成果ID
            file_in: 文件创建参数
            current_user_id: 当前用户ID

        Returns:
            创建的文件对象
        """
        work = await WorkService.get_by_id(db, work_id)
        if not work:
            raise ResourceNotFoundException("成果不存在")

        # 权限检查：仅所有者可添加文件
        if work.user_id != current_user_id:
            raise InsufficientPermissionsException()

        db_file = WorkFile(
            work_id=work_id,
            **file_in.model_dump(exclude={"work_id"})
        )
        db.add(db_file)
        await db.commit()
        await db.refresh(db_file)
        return db_file

    @staticmethod
    async def delete_work_file(
        db: AsyncSession,
        file_id: uuid.UUID,
        current_user_id: uuid.UUID
    ) -> None:
        """
        删除成果文件

        Args:
            db: 数据库会话
            file_id: 文件ID
            current_user_id: 当前用户ID
        """
        result = await db.execute(
            select(WorkFile).where(WorkFile.id == file_id)
        )
        db_file = result.scalar_one_or_none()

        if not db_file:
            raise ResourceNotFoundException("文件不存在")

        # 检查所属成果的所有者
        work = await WorkService.get_by_id(db, db_file.work_id)
        if not work or work.user_id != current_user_id:
            raise InsufficientPermissionsException()

        await db.delete(db_file)
        await db.commit()
