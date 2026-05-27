import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.user import UserCreate
from app.schemas.work import WorkCreate, WorkFileCreate, WorkUpdate
from app.services.user_service import UserService
from app.services.work_service import WorkService
from app.core.exceptions import (
    ResourceNotFoundException,
    InsufficientPermissionsException
)


@pytest.mark.asyncio
async def test_create_work_with_files(db_session: AsyncSession):
    """测试创建成果及关联文件"""
    # 创建用户
    user_in = UserCreate(
        nickname="testwork1",
        password="testpassword123",
        phone="13800138300",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建成果参数
    work_in = WorkCreate(
        user_id=user.id,
        task_id=uuid.uuid4(),
        tool_id=uuid.uuid4(),
        title="测试成果",
        description="这是一个测试成果",
        status="published",
        is_public=False
    )

    # 创建文件列表
    file_list = [
        WorkFileCreate(
            work_id=uuid.uuid4(),  # 会被实际的 work_id 覆盖
            file_type="image",
            file_name="test1.jpg",
            file_url="/files/test1.jpg",
            file_size=102400,
            is_preview=True
        ),
        WorkFileCreate(
            work_id=uuid.uuid4(),
            file_type="pdf",
            file_name="test2.pdf",
            file_url="/files/test2.pdf",
            file_size=204800
        )
    ]

    # 创建成果
    work = await WorkService.create_work_with_files(
        db=db_session,
        work_in=work_in,
        file_list=file_list
    )

    assert work.id is not None
    assert work.title == "测试成果"
    assert work.user_id == user.id

    # 验证文件已创建
    files = await WorkService.get_work_files(db_session, work.id)
    assert len(files) == 2
    assert files[0].file_name == "test1.jpg"
    assert files[1].file_name == "test2.pdf"


@pytest.mark.asyncio
async def test_get_work_detail(db_session: AsyncSession):
    """测试获取成果详情"""
    # 创建用户
    user_in = UserCreate(
        nickname="testwork2",
        password="testpassword123",
        phone="13800138301",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建成果
    work_in = WorkCreate(
        user_id=user.id,
        task_id=uuid.uuid4(),
        title="详情测试成果",
        description="测试详情"
    )
    work = await WorkService.create_work_with_files(
        db_session, work_in, []
    )

    # 获取详情
    detail = await WorkService.get_work_detail(
        db=db_session,
        work_id=work.id,
        current_user_id=user.id
    )

    assert detail.id == work.id
    assert detail.title == "详情测试成果"
    assert detail.has_download_permission is True  # 所有者有权限


@pytest.mark.asyncio
async def test_get_work_detail_not_found(db_session: AsyncSession):
    """测试获取不存在的成果详情"""
    with pytest.raises(ResourceNotFoundException):
        await WorkService.get_work_detail(
            db=db_session,
            work_id=uuid.uuid4(),
            current_user_id=uuid.uuid4()
        )


@pytest.mark.asyncio
async def test_list_user_works(db_session: AsyncSession):
    """测试获取用户成果列表"""
    # 创建用户
    user_in = UserCreate(
        nickname="testwork3",
        password="testpassword123",
        phone="13800138302",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建多个成果
    for i in range(5):
        work_in = WorkCreate(
            user_id=user.id,
            task_id=uuid.uuid4(),
            title=f"成果{i}",
            status="published" if i % 2 == 0 else "draft"
        )
        await WorkService.create_work_with_files(
            db_session, work_in, []
        )

    # 获取全部列表
    works, total = await WorkService.list_user_works(
        db=db_session,
        user_id=user.id,
        skip=0,
        limit=10
    )
    assert total == 5
    assert len(works) == 5

    # 按状态筛选 - published
    works_published, total_published = await WorkService.list_user_works(
        db=db_session,
        user_id=user.id,
        status="published",
        skip=0,
        limit=10
    )
    assert total_published == 3
    assert len(works_published) == 3


@pytest.mark.asyncio
async def test_list_user_works_pagination(db_session: AsyncSession):
    """测试成果列表分页"""
    # 创建用户
    user_in = UserCreate(
        nickname="testwork4",
        password="testpassword123",
        phone="13800138303",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建15个成果
    for i in range(15):
        work_in = WorkCreate(
            user_id=user.id,
            task_id=uuid.uuid4(),
            title=f"成果{i}"
        )
        await WorkService.create_work_with_files(
            db_session, work_in, []
        )

    # 第一页
    works1, total1 = await WorkService.list_user_works(
        db_session, user.id, skip=0, limit=10
    )
    assert total1 == 15
    assert len(works1) == 10

    # 第二页
    works2, total2 = await WorkService.list_user_works(
        db_session, user.id, skip=10, limit=10
    )
    assert total2 == 15
    assert len(works2) == 5


@pytest.mark.asyncio
async def test_set_public_status(db_session: AsyncSession):
    """测试设置成果公开/私有状态"""
    # 创建用户
    user_in = UserCreate(
        nickname="testwork5",
        password="testpassword123",
        phone="13800138304",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建成果
    work_in = WorkCreate(
        user_id=user.id,
        task_id=uuid.uuid4(),
        title="隐私测试成果",
        is_public=False
    )
    work = await WorkService.create_work_with_files(
        db_session, work_in, []
    )
    assert work.is_public is False

    # 设置为公开
    work_updated = await WorkService.set_public_status(
        db=db_session,
        work_id=work.id,
        is_public=True,
        current_user_id=user.id
    )
    assert work_updated.is_public is True

    # 非所有者不能修改
    other_user_id = uuid.uuid4()
    with pytest.raises(InsufficientPermissionsException):
        await WorkService.set_public_status(
            db=db_session,
            work_id=work.id,
            is_public=False,
            current_user_id=other_user_id
        )


@pytest.mark.asyncio
async def test_create_share_link(db_session: AsyncSession):
    """测试生成分享链接"""
    # 创建用户
    user_in = UserCreate(
        nickname="testwork6",
        password="testpassword123",
        phone="13800138305",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建成果
    work_in = WorkCreate(
        user_id=user.id,
        task_id=uuid.uuid4(),
        title="分享测试成果"
    )
    work = await WorkService.create_work_with_files(
        db_session, work_in, []
    )

    initial_share_count = work.share_count

    # 创建分享链接
    share = await WorkService.create_share_link(
        db=db_session,
        work_id=work.id,
        share_type="link",
        password="testpass",
        expire_days=7
    )

    assert share.id is not None
    assert share.work_id == work.id
    assert share.share_url is not None
    assert share.password == "testpass"
    assert share.expire_at is not None
    assert share.status == "pending"

    # 验证分享计数增加
    work_updated = await WorkService.get_by_id(db_session, work.id)
    assert work_updated.share_count == initial_share_count + 1


@pytest.mark.asyncio
async def test_create_iteration(db_session: AsyncSession):
    """测试创建迭代版本"""
    # 创建用户
    user_in = UserCreate(
        nickname="testwork7",
        password="testpassword123",
        phone="13800138306",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建原始成果
    work_in = WorkCreate(
        user_id=user.id,
        task_id=uuid.uuid4(),
        title="原始版本",
        description="这是原始版本",
        version=1
    )
    work = await WorkService.create_work_with_files(
        db_session, work_in, []
    )

    # 添加一个文件
    await WorkService.add_work_file(
        db=db_session,
        work_id=work.id,
        file_in=WorkFileCreate(
            work_id=work.id,
            file_type="image",
            file_name="test.jpg",
            file_url="/test.jpg"
        ),
        current_user_id=user.id
    )

    # 创建新版本
    new_work = await WorkService.create_iteration(
        db=db_session,
        parent_work_id=work.id,
        current_user_id=user.id
    )

    assert new_work.id is not None
    assert new_work.parent_id == work.id
    assert new_work.version == 2
    assert "(V2)" in new_work.title
    assert new_work.description == "这是原始版本"

    # 验证文件被复制
    files = await WorkService.get_work_files(db_session, new_work.id)
    assert len(files) == 1


@pytest.mark.asyncio
async def test_check_download_permission(db_session: AsyncSession):
    """测试下载权限检查"""
    # 创建两个用户
    user1_in = UserCreate(
        nickname="testwork8a",
        password="testpassword123",
        phone="13800138307",
        code="8888"
    )
    user1 = await UserService.create(db_session, user1_in)

    user2_in = UserCreate(
        nickname="testwork8b",
        password="testpassword123",
        phone="13800138308",
        code="8888"
    )
    user2 = await UserService.create(db_session, user2_in)

    # 用户1创建私有成果
    work_private_in = WorkCreate(
        user_id=user1.id,
        task_id=uuid.uuid4(),
        title="私有成果",
        status="published",
        is_public=False
    )
    work_private = await WorkService.create_work_with_files(
        db_session, work_private_in, []
    )

    # 用户1创建公开成果
    work_public_in = WorkCreate(
        user_id=user1.id,
        task_id=uuid.uuid4(),
        title="公开成果",
        status="published",
        is_public=True
    )
    work_public = await WorkService.create_work_with_files(
        db_session, work_public_in, []
    )

    # 所有者对私有成果有权限
    permission1 = await WorkService.check_download_permission(
        db=db_session,
        work_id=work_private.id,
        user_id=user1.id
    )
    assert permission1 is True

    # 其他用户对私有成果无权限
    permission2 = await WorkService.check_download_permission(
        db=db_session,
        work_id=work_private.id,
        user_id=user2.id
    )
    assert permission2 is False

    # 未登录用户对私有成果无权限
    permission3 = await WorkService.check_download_permission(
        db=db_session,
        work_id=work_private.id,
        user_id=None
    )
    assert permission3 is False

    # 公开成果对所有用户有权限
    permission4 = await WorkService.check_download_permission(
        db=db_session,
        work_id=work_public.id,
        user_id=user2.id
    )
    assert permission4 is True


@pytest.mark.asyncio
async def test_increment_view_and_like_count(db_session: AsyncSession):
    """测试增加查看和点赞次数"""
    # 创建用户
    user_in = UserCreate(
        nickname="testwork9",
        password="testpassword123",
        phone="13800138309",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建成果
    work_in = WorkCreate(
        user_id=user.id,
        task_id=uuid.uuid4(),
        title="计数测试成果"
    )
    work = await WorkService.create_work_with_files(
        db_session, work_in, []
    )

    assert work.view_count == 0
    assert work.like_count == 0

    # 增加查看次数
    await WorkService.increment_view_count(db_session, work.id)
    work_updated = await WorkService.get_by_id(db_session, work.id)
    assert work_updated.view_count == 1

    # 增加点赞次数
    await WorkService.increment_like_count(db_session, work.id)
    work_updated = await WorkService.get_by_id(db_session, work.id)
    assert work_updated.like_count == 1


@pytest.mark.asyncio
async def test_update_work(db_session: AsyncSession):
    """测试更新成果"""
    # 创建用户
    user_in = UserCreate(
        nickname="testwork10",
        password="testpassword123",
        phone="13800138310",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建成果
    work_in = WorkCreate(
        user_id=user.id,
        task_id=uuid.uuid4(),
        title="原始标题",
        description="原始描述"
    )
    work = await WorkService.create_work_with_files(
        db_session, work_in, []
    )

    # 更新
    work_updated = await WorkService.update_work(
        db=db_session,
        work_id=work.id,
        work_in=WorkUpdate(
            title="更新后的标题",
            description="更新后的描述"
        ),
        current_user_id=user.id
    )

    assert work_updated.title == "更新后的标题"
    assert work_updated.description == "更新后的描述"

    # 非所有者不能更新
    other_user_id = uuid.uuid4()
    with pytest.raises(InsufficientPermissionsException):
        await WorkService.update_work(
            db=db_session,
            work_id=work.id,
            work_in=WorkUpdate(title="非法更新"),
            current_user_id=other_user_id
        )


@pytest.mark.asyncio
async def test_delete_work(db_session: AsyncSession):
    """测试删除成果"""
    # 创建用户
    user_in = UserCreate(
        nickname="testwork11",
        password="testpassword123",
        phone="13800138311",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建成果
    work_in = WorkCreate(
        user_id=user.id,
        task_id=uuid.uuid4(),
        title="待删除成果"
    )
    work = await WorkService.create_work_with_files(
        db_session, work_in, []
    )

    # 非所有者不能删除
    other_user_id = uuid.uuid4()
    with pytest.raises(InsufficientPermissionsException):
        await WorkService.delete_work(
            db=db_session,
            work_id=work.id,
            current_user_id=other_user_id
        )

    # 所有者可以删除
    await WorkService.delete_work(
        db=db_session,
        work_id=work.id,
        current_user_id=user.id
    )

    # 验证已软删除
    deleted_work = await WorkService.get_by_id(db_session, work.id)
    assert deleted_work is not None
    assert deleted_work.is_deleted is True
    assert deleted_work.deleted_at is not None


@pytest.mark.asyncio
async def test_list_public_works(db_session: AsyncSession):
    """测试公开成果列表"""
    # 创建用户
    user_in = UserCreate(
        nickname="testwork12",
        password="testpassword123",
        phone="13800138312",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    tool_id = uuid.uuid4()

    # 创建公开和私有的成果
    for i in range(3):
        work_in = WorkCreate(
            user_id=user.id,
            task_id=uuid.uuid4(),
            tool_id=tool_id,
            title=f"公开成果{i}",
            status="published",
            is_public=True
        )
        await WorkService.create_work_with_files(
            db_session, work_in, []
        )

    # 创建私有成果
    for i in range(2):
        work_in = WorkCreate(
            user_id=user.id,
            task_id=uuid.uuid4(),
            title=f"私有成果{i}",
            status="published",
            is_public=False
        )
        await WorkService.create_work_with_files(
            db_session, work_in, []
        )

    # 获取公开列表
    public_works, total = await WorkService.list_public_works(
        db=db_session,
        skip=0,
        limit=10
    )

    # 应该只返回已发布的公开成果
    # 注意：可能有其他测试创建的公开成果，所以只检查数量 >= 3
    assert total >= 3
    for w in public_works:
        assert w.is_public is True
        assert w.status == "published"


@pytest.mark.asyncio
async def test_get_iteration_history(db_session: AsyncSession):
    """测试获取迭代历史"""
    # 创建用户
    user_in = UserCreate(
        nickname="testwork13",
        password="testpassword123",
        phone="13800138313",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建 V1
    v1_in = WorkCreate(
        user_id=user.id,
        task_id=uuid.uuid4(),
        title="我的作品",
        version=1
    )
    v1 = await WorkService.create_work_with_files(
        db_session, v1_in, []
    )

    # 创建 V2
    v2 = await WorkService.create_iteration(
        db=db_session,
        parent_work_id=v1.id,
        current_user_id=user.id
    )

    # 创建 V3
    v3 = await WorkService.create_iteration(
        db=db_session,
        parent_work_id=v2.id,
        current_user_id=user.id
    )

    # 获取迭代历史
    history = await WorkService.get_iteration_history(
        db=db_session,
        work_id=v3.id
    )

    assert len(history) == 3
    assert history[0].version == 1  # 最早版本
    assert history[1].version == 2
    assert history[2].version == 3  # 最新版本
