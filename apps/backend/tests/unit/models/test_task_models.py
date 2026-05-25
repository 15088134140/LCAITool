import pytest
import uuid
import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.task import Task, TaskLog, Work, WorkFile, WorkShare
from app.models.user import User


@pytest.mark.asyncio
async def test_create_task(db_session: AsyncSession):
    """测试创建任务"""
    # 创建测试用户
    user = User(
        id=uuid.uuid4(),
        nickname="testuser",
        phone="13800138000",
        balance=100
    )
    db_session.add(user)
    await db_session.commit()

    # 创建任务
    tool_id = uuid.uuid4()
    task = Task(
        user_id=user.id,
        tool_id=tool_id,
        task_type="storybook-generator",
        status="pending",
        estimated_cost=50,
        input_params={"theme": "太空冒险", "pages": 10}
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)

    assert task.id is not None
    assert task.user_id == user.id
    assert task.tool_id == tool_id
    assert task.task_type == "storybook-generator"
    assert task.status == "pending"
    assert task.progress == 0
    assert task.estimated_cost == 50
    assert task.created_at is not None


@pytest.mark.asyncio
async def test_task_status_transitions(db_session: AsyncSession):
    """测试任务状态转换"""
    user = User(
        id=uuid.uuid4(),
        nickname="testuser2",
        phone="13800138001",
        balance=100
    )
    db_session.add(user)
    await db_session.commit()

    task = Task(
        user_id=user.id,
        task_type="storybook-generator",
        estimated_cost=50
    )
    db_session.add(task)
    await db_session.commit()

    # 测试开始任务
    task.start()
    await db_session.commit()
    await db_session.refresh(task)
    assert task.status == "running"
    assert task.started_at is not None
    assert task.progress == 0

    # 测试更新进度
    task.update_progress(50, "生成中...")
    await db_session.commit()
    await db_session.refresh(task)
    assert task.progress == 50
    assert task.progress_message == "生成中..."

    # 测试进度边界
    task.update_progress(150)
    assert task.progress == 100
    task.update_progress(-10)
    assert task.progress == 0

    # 测试完成任务
    task.update_progress(80)
    task.complete(actual_cost=45)
    await db_session.commit()
    await db_session.refresh(task)
    assert task.status == "completed"
    assert task.progress == 100
    assert task.actual_cost == 45
    assert task.completed_at is not None


@pytest.mark.asyncio
async def test_task_failure_and_cancellation(db_session: AsyncSession):
    """测试任务失败和取消"""
    user = User(
        id=uuid.uuid4(),
        nickname="testuser3",
        phone="13800138002",
        balance=100
    )
    db_session.add(user)
    await db_session.commit()

    # 测试失败
    task1 = Task(user_id=user.id, task_type="storybook-generator")
    db_session.add(task1)
    await db_session.commit()

    task1.start()
    task1.fail("API调用超时")
    await db_session.commit()
    await db_session.refresh(task1)
    assert task1.status == "failed"
    assert task1.error_message == "API调用超时"
    assert task1.completed_at is not None

    # 测试取消
    task2 = Task(user_id=user.id, task_type="storybook-generator")
    db_session.add(task2)
    await db_session.commit()

    task2.start()
    task2.cancel()
    await db_session.commit()
    await db_session.refresh(task2)
    assert task2.status == "cancelled"
    assert task2.completed_at is not None

    # 测试超时
    task3 = Task(user_id=user.id, task_type="storybook-generator")
    db_session.add(task3)
    await db_session.commit()

    task3.start()
    task3.timeout()
    await db_session.commit()
    await db_session.refresh(task3)
    assert task3.status == "timeout"
    assert task3.completed_at is not None


@pytest.mark.asyncio
async def test_task_log_creation(db_session: AsyncSession):
    """测试任务日志创建"""
    user = User(
        id=uuid.uuid4(),
        nickname="testuser4",
        phone="13800138003",
        balance=100
    )
    db_session.add(user)
    await db_session.commit()

    task = Task(user_id=user.id, task_type="storybook-generator")
    db_session.add(task)
    await db_session.commit()

    # 创建日志
    log1 = TaskLog(
        task_id=task.id,
        level="info",
        message="任务开始",
        details={"step": 1}
    )
    log2 = TaskLog(
        task_id=task.id,
        level="debug",
        message="参数验证完成",
        details={"valid": True}
    )
    db_session.add_all([log1, log2])
    await db_session.commit()

    # 查询任务的日志
    result = await db_session.execute(select(TaskLog).where(TaskLog.task_id == task.id))
    logs = result.scalars().all()
    assert len(logs) == 2
    assert logs[0].task_id == task.id
    assert logs[0].level == "info"
    assert logs[0].message == "任务开始"
    assert logs[0].details == {"step": 1}
    assert logs[0].timestamp is not None


@pytest.mark.asyncio
async def test_create_work(db_session: AsyncSession):
    """测试创建成果"""
    user = User(
        id=uuid.uuid4(),
        nickname="testuser5",
        phone="13800138004",
        balance=100
    )
    db_session.add(user)
    await db_session.commit()

    tool_id = uuid.uuid4()
    task = Task(
        user_id=user.id,
        tool_id=tool_id,
        task_type="storybook-generator"
    )
    db_session.add(task)
    await db_session.commit()

    # 创建成果
    work = Work(
        user_id=user.id,
        task_id=task.id,
        tool_id=tool_id,
        title="我的太空冒险绘本",
        description="一本关于太空探索的儿童绘本",
        version=1,
        cover_image="https://example.com/cover.jpg",
        status="published",
        is_public=True
    )
    db_session.add(work)
    await db_session.commit()
    await db_session.refresh(work)

    assert work.id is not None
    assert work.user_id == user.id
    assert work.task_id == task.id
    assert work.title == "我的太空冒险绘本"
    assert work.version == 1
    assert work.view_count == 0
    assert work.like_count == 0
    assert work.share_count == 0


@pytest.mark.asyncio
async def test_work_versioning(db_session: AsyncSession):
    """测试成果版本管理（迭代创作）"""
    user = User(
        id=uuid.uuid4(),
        nickname="testuser6",
        phone="13800138005",
        balance=100
    )
    db_session.add(user)
    await db_session.commit()

    tool_id = uuid.uuid4()

    # 创建第一个版本
    task1 = Task(user_id=user.id, tool_id=tool_id, task_type="storybook-generator")
    db_session.add(task1)
    await db_session.commit()

    work1 = Work(
        user_id=user.id,
        task_id=task1.id,
        tool_id=tool_id,
        title="第一版绘本",
        version=1
    )
    db_session.add(work1)
    await db_session.commit()
    await db_session.refresh(work1)

    # 创建第二个版本（基于第一个版本）
    task2 = Task(user_id=user.id, tool_id=tool_id, task_type="storybook-generator")
    db_session.add(task2)
    await db_session.commit()

    work2 = Work(
        user_id=user.id,
        task_id=task2.id,
        tool_id=tool_id,
        parent_id=work1.id,
        title="第二版绘本（优化版）",
        version=2
    )
    db_session.add(work2)
    await db_session.commit()
    await db_session.refresh(work2)

    assert work2.parent_id == work1.id
    assert work2.version == 2

    # 验证关系
    result = await db_session.execute(select(Work).where(Work.parent_id == work1.id))
    children = result.scalars().all()
    assert len(children) == 1
    assert children[0].id == work2.id


@pytest.mark.asyncio
async def test_work_count_increment(db_session: AsyncSession):
    """测试成果计数增加"""
    user = User(
        id=uuid.uuid4(),
        nickname="testuser7",
        phone="13800138006",
        balance=100
    )
    db_session.add(user)
    await db_session.commit()

    task = Task(user_id=user.id, task_type="storybook-generator")
    db_session.add(task)
    await db_session.commit()

    work = Work(
        user_id=user.id,
        task_id=task.id,
        title="测试绘本"
    )
    db_session.add(work)
    await db_session.commit()

    # 测试计数
    work.increment_view_count()
    work.increment_like_count()
    work.increment_share_count()
    work.increment_view_count()  # 再看一次

    await db_session.commit()
    await db_session.refresh(work)

    assert work.view_count == 2
    assert work.like_count == 1
    assert work.share_count == 1


@pytest.mark.asyncio
async def test_work_file_creation(db_session: AsyncSession):
    """测试成果文件创建"""
    user = User(
        id=uuid.uuid4(),
        nickname="testuser8",
        phone="13800138007",
        balance=100
    )
    db_session.add(user)
    await db_session.commit()

    task = Task(user_id=user.id, task_type="storybook-generator")
    db_session.add(task)
    await db_session.commit()

    work = Work(user_id=user.id, task_id=task.id, title="绘本")
    db_session.add(work)
    await db_session.commit()

    # 添加文件
    file1 = WorkFile(
        work_id=work.id,
        file_type="image",
        file_name="page1.jpg",
        file_url="https://example.com/page1.jpg",
        file_size=102400,
        page_number=1,
        mime_type="image/jpeg",
        is_preview=True
    )
    file2 = WorkFile(
        work_id=work.id,
        file_type="audio",
        file_name="page1.mp3",
        file_url="https://example.com/page1.mp3",
        file_size=512000,
        page_number=1,
        mime_type="audio/mpeg",
        duration=30
    )
    file3 = WorkFile(
        work_id=work.id,
        file_type="pdf",
        file_name="book.pdf",
        file_url="https://example.com/book.pdf",
        file_size=2048000,
        mime_type="application/pdf"
    )
    db_session.add_all([file1, file2, file3])
    await db_session.commit()

    # 查询成果的文件
    result = await db_session.execute(select(WorkFile).where(WorkFile.work_id == work.id))
    files = result.scalars().all()
    assert len(files) == 3

    image_files = [f for f in files if f.file_type == "image"]
    assert len(image_files) == 1
    assert image_files[0].is_preview is True

    audio_files = [f for f in files if f.file_type == "audio"]
    assert len(audio_files) == 1
    assert audio_files[0].duration == 30


@pytest.mark.asyncio
async def test_work_share_creation_and_review(db_session: AsyncSession):
    """测试成果分享创建和审核"""
    user = User(
        id=uuid.uuid4(),
        nickname="testuser9",
        phone="13800138008",
        balance=100
    )
    db_session.add(user)
    await db_session.commit()

    task = Task(user_id=user.id, task_type="storybook-generator")
    db_session.add(task)
    await db_session.commit()

    work = Work(user_id=user.id, task_id=task.id, title="分享的绘本")
    db_session.add(work)
    await db_session.commit()

    reviewer_id = uuid.uuid4()

    # 创建分享
    share = WorkShare(
        work_id=work.id,
        share_type="link",
        share_url="https://example.com/share/abc123",
        password="secret123",
        expire_at=int(time.time()) + 86400  # 24小时后过期
    )
    db_session.add(share)
    await db_session.commit()
    await db_session.refresh(share)

    assert share.id is not None
    assert share.status == "pending"
    assert share.view_count == 0

    # 测试计数
    share.increment_view_count()
    share.increment_view_count()
    share.increment_like_count()
    share.increment_comment_count()

    await db_session.commit()
    await db_session.refresh(share)

    assert share.view_count == 2
    assert share.like_count == 1
    assert share.comment_count == 1

    # 测试审核通过
    share.approve(reviewer_id)
    await db_session.commit()
    await db_session.refresh(share)

    assert share.status == "approved"
    assert share.reviewed_by == reviewer_id
    assert share.reviewed_at is not None

    # 创建另一个分享并拒绝
    share2 = WorkShare(
        work_id=work.id,
        share_type="public"
    )
    db_session.add(share2)
    await db_session.commit()

    share2.reject(reviewer_id)
    await db_session.commit()
    await db_session.refresh(share2)

    assert share2.status == "rejected"


@pytest.mark.asyncio
async def test_task_work_relationship(db_session: AsyncSession):
    """测试任务和成果的关系"""
    user = User(
        id=uuid.uuid4(),
        nickname="testuser10",
        phone="13800138009",
        balance=100
    )
    db_session.add(user)
    await db_session.commit()

    # 创建任务和成果
    task = Task(user_id=user.id, task_type="storybook-generator")
    db_session.add(task)
    await db_session.commit()

    work = Work(
        user_id=user.id,
        task_id=task.id,
        title="测试绘本"
    )
    db_session.add(work)
    await db_session.commit()

    # 从任务访问成果
    await db_session.refresh(task, ["work"])
    assert task.work is not None
    assert task.work.id == work.id

    # 从成果访问任务
    await db_session.refresh(work, ["task"])
    assert work.task is not None
    assert work.task.id == task.id


@pytest.mark.asyncio
async def test_snapshot_data(db_session: AsyncSession):
    """测试快照数据（用于断点续跑）"""
    user = User(
        id=uuid.uuid4(),
        nickname="testuser11",
        phone="13800138010",
        balance=100
    )
    db_session.add(user)
    await db_session.commit()

    task = Task(
        user_id=user.id,
        task_type="storybook-generator",
        snapshot_data={
            "current_step": 3,
            "generated_pages": [1, 2, 3],
            "last_ai_response": {"status": "partial"}
        }
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)

    assert task.snapshot_data is not None
    assert task.snapshot_data["current_step"] == 3
    assert task.snapshot_data["generated_pages"] == [1, 2, 3]

    # 更新快照
    task.snapshot_data = {
        "current_step": 5,
        "generated_pages": [1, 2, 3, 4, 5],
        "last_ai_response": {"status": "continuing"}
    }
    await db_session.commit()
    await db_session.refresh(task)

    assert task.snapshot_data["current_step"] == 5
