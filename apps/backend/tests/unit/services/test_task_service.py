import pytest
import uuid
import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskLogCreate,
    WorkCreate, WorkFileCreate
)
from app.schemas.user import UserCreate
from app.services.task_service import TaskService
from app.services.user_service import UserService
from app.services.point_service import PointService
from app.services.work_service import WorkService
from app.models.task import Task, TaskLog, Work, WorkFile
from app.models.user import User
from app.core.exceptions import (
    InsufficientBalanceException,
    ResourceNotFoundException,
    BusinessException
)


# ============ Task Creation Tests ============

@pytest.mark.asyncio
async def test_create_task_with_points_freeze(db_session: AsyncSession):
    """测试创建任务并预冻结积分"""
    # 创建用户
    user_in = UserCreate(
        nickname="testtask1",
        password="testpassword123",
        phone="13800138001",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建任务（预估费用50积分）
    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook",
        estimated_cost=50,
        input_params={"theme": "太空冒险"}
    )
    task = await TaskService.create_task(db_session, task_in)

    # 验证任务创建
    assert task.id is not None
    assert task.user_id == user.id
    assert task.task_type == "storybook"
    assert task.status == "pending"
    assert task.estimated_cost == 50
    assert task.progress == 0

    # 验证积分已冻结
    user_result = await db_session.execute(select(User).where(User.id == user.id))
    user_after = user_result.scalar_one_or_none()

    # 初始100 - 冻结50 = 余额50，冻结余额50
    assert user_after.balance == 50
    assert user_after.frozen_balance == 50


@pytest.mark.asyncio
async def test_create_task_insufficient_balance(db_session: AsyncSession):
    """测试余额不足时创建任务应该失败"""
    # 创建用户
    user_in = UserCreate(
        nickname="testtask2",
        password="testpassword123",
        phone="13800138002",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建任务（预估费用超过余额）
    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook",
        estimated_cost=200  # 超过初始余额100
    )

    with pytest.raises(InsufficientBalanceException):
        await TaskService.create_task(db_session, task_in)


@pytest.mark.asyncio
async def test_create_task_zero_cost(db_session: AsyncSession):
    """测试创建零费用任务（不冻结积分）"""
    user_in = UserCreate(
        nickname="testtask3",
        password="testpassword123",
        phone="13800138003",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook",
        estimated_cost=0
    )
    task = await TaskService.create_task(db_session, task_in)

    assert task.status == "pending"

    # 验证积分未冻结
    user_result = await db_session.execute(select(User).where(User.id == user.id))
    user_after = user_result.scalar_one_or_none()
    assert user_after.balance == 100
    assert user_after.frozen_balance == 0


# ============ Task Status Update Tests ============

@pytest.mark.asyncio
async def test_update_task_status_to_running(db_session: AsyncSession):
    """测试更新任务状态为运行中"""
    user_in = UserCreate(
        nickname="testtask4",
        password="testpassword123",
        phone="13800138004",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook",
        estimated_cost=50
    )
    task = await TaskService.create_task(db_session, task_in)

    # 更新为运行中
    task = await TaskService.update_task_status(
        db=db_session,
        task_id=task.id,
        status="running",
        progress=10,
        message="任务开始执行"
    )

    assert task.status == "running"
    assert task.progress == 10
    assert task.progress_message == "任务开始执行"
    assert task.started_at is not None


@pytest.mark.asyncio
async def test_update_task_progress_only(db_session: AsyncSession):
    """测试仅更新任务进度"""
    user_in = UserCreate(
        nickname="testtask5",
        password="testpassword123",
        phone="13800138005",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook",
        estimated_cost=50
    )
    task = await TaskService.create_task(db_session, task_in)

    # 仅更新进度
    task = await TaskService.update_task_status(
        db=db_session,
        task_id=task.id,
        progress=50,
        message="生成中..."
    )

    assert task.status == "pending"  # 状态不变
    assert task.progress == 50
    assert task.progress_message == "生成中..."


@pytest.mark.asyncio
async def test_update_task_nonexistent(db_session: AsyncSession):
    """测试更新不存在的任务"""
    fake_task_id = uuid.uuid4()

    with pytest.raises(ResourceNotFoundException):
        await TaskService.update_task_status(
            db=db_session,
            task_id=fake_task_id,
            status="running"
        )


# ============ Task Completion and Settlement Tests ============

@pytest.mark.asyncio
async def test_complete_task_with_refund(db_session: AsyncSession):
    """测试完成任务并结算（有退款）"""
    user_in = UserCreate(
        nickname="testtask6",
        password="testpassword123",
        phone="13800138006",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 预估50，实际30，应该退还20
    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook",
        estimated_cost=50
    )
    task = await TaskService.create_task(db_session, task_in)

    # 完成任务
    task = await TaskService.complete_task(
        db=db_session,
        task_id=task.id,
        actual_cost=30
    )

    assert task.status == "completed"
    assert task.actual_cost == 30
    assert task.completed_at is not None
    assert task.progress == 100

    # 验证结算：消费30，退还20
    user_result = await db_session.execute(select(User).where(User.id == user.id))
    user_after = user_result.scalar_one_or_none()

    # 余额 = 初始100 - 消费30 = 70
    # 冻结余额应该为0
    assert user_after.balance == 70
    assert user_after.frozen_balance == 0


@pytest.mark.asyncio
async def test_complete_task_with_extra_cost(db_session: AsyncSession):
    """测试完成任务并结算（有额外扣费）"""
    user_in = UserCreate(
        nickname="testtask7",
        password="testpassword123",
        phone="13800138007",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 预估30，实际50，需要额外扣除20
    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook",
        estimated_cost=30
    )
    task = await TaskService.create_task(db_session, task_in)

    # 完成任务（实际费用大于预估）
    task = await TaskService.complete_task(
        db=db_session,
        task_id=task.id,
        actual_cost=50
    )

    assert task.status == "completed"
    assert task.actual_cost == 50

    # 验证结算：总共消费50
    user_result = await db_session.execute(select(User).where(User.id == user.id))
    user_after = user_result.scalar_one_or_none()

    # 余额 = 初始100 - 消费50 = 50
    assert user_after.balance == 50
    assert user_after.frozen_balance == 0


@pytest.mark.asyncio
async def test_complete_task_exact_cost(db_session: AsyncSession):
    """测试完成任务并结算（费用刚好）"""
    user_in = UserCreate(
        nickname="testtask8",
        password="testpassword123",
        phone="13800138008",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 预估50，实际50
    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook",
        estimated_cost=50
    )
    task = await TaskService.create_task(db_session, task_in)

    task = await TaskService.complete_task(
        db=db_session,
        task_id=task.id,
        actual_cost=50
    )

    assert task.status == "completed"

    # 验证：消费刚好
    user_result = await db_session.execute(select(User).where(User.id == user.id))
    user_after = user_result.scalar_one_or_none()

    assert user_after.balance == 50  # 100 - 50
    assert user_after.frozen_balance == 0


@pytest.mark.asyncio
async def test_complete_already_completed_task(db_session: AsyncSession):
    """测试重复完成已完成的任务"""
    user_in = UserCreate(
        nickname="testtask9",
        password="testpassword123",
        phone="13800138009",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook",
        estimated_cost=50
    )
    task = await TaskService.create_task(db_session, task_in)

    # 第一次完成
    await TaskService.complete_task(db_session, task.id, actual_cost=30)

    # 第二次完成应该失败
    with pytest.raises(BusinessException):
        await TaskService.complete_task(
            db=db_session,
            task_id=task.id,
            actual_cost=40
        )


# ============ Task Cancellation Tests ============

@pytest.mark.asyncio
async def test_cancel_task_with_full_refund(db_session: AsyncSession):
    """测试取消任务并全额解冻积分"""
    user_in = UserCreate(
        nickname="testtask10",
        password="testpassword123",
        phone="13800138010",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook",
        estimated_cost=50
    )
    task = await TaskService.create_task(db_session, task_in)

    # 取消任务
    task = await TaskService.cancel_task(
        db=db_session,
        task_id=task.id,
        reason="用户主动取消"
    )

    assert task.status == "cancelled"
    assert task.completed_at is not None

    # 验证全额解冻
    user_result = await db_session.execute(select(User).where(User.id == user.id))
    user_after = user_result.scalar_one_or_none()

    assert user_after.balance == 100  # 全部退还
    assert user_after.frozen_balance == 0


@pytest.mark.asyncio
async def test_cancel_already_cancelled_task(db_session: AsyncSession):
    """测试重复取消已取消的任务"""
    user_in = UserCreate(
        nickname="testtask11",
        password="testpassword123",
        phone="13800138011",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook",
        estimated_cost=50
    )
    task = await TaskService.create_task(db_session, task_in)

    # 第一次取消
    await TaskService.cancel_task(db_session, task.id, reason="第一次取消")

    # 第二次取消应该失败
    with pytest.raises(BusinessException):
        await TaskService.cancel_task(db_session, task.id, reason="第二次取消")


# ============ Task Failure Tests ============

@pytest.mark.asyncio
async def test_fail_task_with_refund(db_session: AsyncSession):
    """测试任务失败并全额解冻积分"""
    user_in = UserCreate(
        nickname="testtask12",
        password="testpassword123",
        phone="13800138012",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook",
        estimated_cost=50
    )
    task = await TaskService.create_task(db_session, task_in)

    # 标记任务失败
    task = await TaskService.fail_task(
        db=db_session,
        task_id=task.id,
        error_message="AI API调用失败"
    )

    assert task.status == "failed"
    assert task.error_message == "AI API调用失败"

    # 验证全额解冻
    user_result = await db_session.execute(select(User).where(User.id == user.id))
    user_after = user_result.scalar_one_or_none()

    assert user_after.balance == 100
    assert user_after.frozen_balance == 0


# ============ Task Log Tests ============

@pytest.mark.asyncio
async def test_add_task_log(db_session: AsyncSession):
    """测试添加任务日志"""
    user_in = UserCreate(
        nickname="testtask13",
        password="testpassword123",
        phone="13800138013",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook",
        estimated_cost=50
    )
    task = await TaskService.create_task(db_session, task_in)

    # 添加日志
    log = await TaskService.add_task_log(
        db=db_session,
        task_id=task.id,
        level="info",
        message="任务步骤1完成",
        details={"step": 1, "duration": 2.5}
    )

    assert log.id is not None
    assert log.task_id == task.id
    assert log.level == "info"
    assert log.message == "任务步骤1完成"
    assert log.details == {"step": 1, "duration": 2.5}
    assert log.timestamp is not None


@pytest.mark.asyncio
async def test_get_task_logs(db_session: AsyncSession):
    """测试获取任务日志列表"""
    user_in = UserCreate(
        nickname="testtask14",
        password="testpassword123",
        phone="13800138014",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook",
        estimated_cost=50
    )
    task = await TaskService.create_task(db_session, task_in)

    # 添加多条日志
    for i in range(5):
        await TaskService.add_task_log(
            db=db_session,
            task_id=task.id,
            level="info",
            message=f"步骤{i+1}完成",
            details={"step": i + 1}
        )

    # 获取日志
    logs, total = await TaskService.get_task_logs(
        db=db_session,
        task_id=task.id,
        skip=0,
        limit=10
    )

    assert total == 5
    assert len(logs) == 5
    # 验证所有消息都存在（时间戳相同时排序不确定）
    messages = [log.message for log in logs]
    for i in range(5):
        assert f"步骤{i+1}完成" in messages


@pytest.mark.asyncio
async def test_get_task_logs_pagination(db_session: AsyncSession):
    """测试任务日志分页"""
    user_in = UserCreate(
        nickname="testtask15",
        password="testpassword123",
        phone="13800138015",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook",
        estimated_cost=50
    )
    task = await TaskService.create_task(db_session, task_in)

    # 添加15条日志
    for i in range(15):
        await TaskService.add_task_log(
            db=db_session,
            task_id=task.id,
            level="info",
            message=f"步骤{i+1}完成"
        )

    # 第一页
    logs1, total1 = await TaskService.get_task_logs(db_session, task.id, skip=0, limit=10)
    assert total1 == 15
    assert len(logs1) == 10

    # 第二页
    logs2, total2 = await TaskService.get_task_logs(db_session, task.id, skip=10, limit=10)
    assert total2 == 15
    assert len(logs2) == 5


# ============ Snapshot Tests ============

@pytest.mark.asyncio
async def test_save_and_get_snapshot(db_session: AsyncSession):
    """测试保存和获取快照（断点续跑）"""
    user_in = UserCreate(
        nickname="testtask16",
        password="testpassword123",
        phone="13800138016",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook",
        estimated_cost=50
    )
    task = await TaskService.create_task(db_session, task_in)

    # 保存快照
    snapshot_data = {
        "current_step": 3,
        "generated_pages": [1, 2, 3],
        "last_ai_response": {"status": "partial", "text": "..."},
        "checkpoint_timestamp": int(time.time())
    }

    task = await TaskService.save_snapshot(
        db=db_session,
        task_id=task.id,
        snapshot_data=snapshot_data
    )

    # 验证快照已保存
    retrieved_snapshot = await TaskService.get_snapshot(db_session, task.id)
    assert retrieved_snapshot is not None
    assert retrieved_snapshot["current_step"] == 3
    assert retrieved_snapshot["generated_pages"] == [1, 2, 3]
    assert retrieved_snapshot["last_ai_response"]["status"] == "partial"


@pytest.mark.asyncio
async def test_update_snapshot(db_session: AsyncSession):
    """测试更新快照"""
    user_in = UserCreate(
        nickname="testtask17",
        password="testpassword123",
        phone="13800138017",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook",
        estimated_cost=50
    )
    task = await TaskService.create_task(db_session, task_in)

    # 第一次保存
    await TaskService.save_snapshot(
        db=db_session,
        task_id=task.id,
        snapshot_data={"current_step": 2}
    )

    # 第二次更新
    await TaskService.save_snapshot(
        db=db_session,
        task_id=task.id,
        snapshot_data={"current_step": 5, "extra": "data"}
    )

    retrieved = await TaskService.get_snapshot(db_session, task.id)
    assert retrieved["current_step"] == 5
    assert retrieved["extra"] == "data"


# ============ User Task List Tests ============

@pytest.mark.asyncio
async def test_get_user_tasks(db_session: AsyncSession):
    """测试获取用户任务列表"""
    user_in = UserCreate(
        nickname="testtask18",
        password="testpassword123",
        phone="13800138018",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建多个任务
    for i in range(5):
        task_in = TaskCreate(
            user_id=user.id,
            task_type="storybook",
            estimated_cost=10
        )
        await TaskService.create_task(db_session, task_in)

    tasks, total = await TaskService.get_by_user_id(
        db=db_session,
        user_id=user.id,
        skip=0,
        limit=10
    )

    assert total == 5
    assert len(tasks) == 5


# ============ Work Tests ============

@pytest.mark.asyncio
async def test_create_work(db_session: AsyncSession):
    """测试创建成果"""
    user_in = UserCreate(
        nickname="testtask19",
        password="testpassword123",
        phone="13800138019",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook",
        estimated_cost=50
    )
    task = await TaskService.create_task(db_session, task_in)

    # 创建成果
    work_in = WorkCreate(
        user_id=user.id,
        task_id=task.id,
        title="我的太空冒险绘本",
        description="一本关于太空探索的儿童绘本",
        version=1,
        status="published",
        is_public=True
    )
    work = await WorkService.create_work(db_session, work_in)

    assert work.id is not None
    assert work.user_id == user.id
    assert work.task_id == task.id
    assert work.title == "我的太空冒险绘本"
    assert work.version == 1
    assert work.status == "published"
    assert work.is_public is True


@pytest.mark.asyncio
async def test_create_work_versioning(db_session: AsyncSession):
    """测试创建迭代版本的成果"""
    user_in = UserCreate(
        nickname="testtask20",
        password="testpassword123",
        phone="13800138020",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 第一个版本
    task1_in = TaskCreate(user_id=user.id, task_type="storybook", estimated_cost=50)
    task1 = await TaskService.create_task(db_session, task1_in)

    work1_in = WorkCreate(
        user_id=user.id, task_id=task1.id, title="第一版绘本", version=1
    )
    work1 = await WorkService.create_work(db_session, work1_in)
    # 保存ID，因为后续TaskService.create_task会expire session对象
    work1_id = work1.id

    # 第二个版本（基于第一个版本）
    task2_in = TaskCreate(user_id=user.id, task_type="storybook", estimated_cost=30)
    task2 = await TaskService.create_task(db_session, task2_in)

    work2_in = WorkCreate(
        user_id=user.id,
        task_id=task2.id,
        parent_id=work1_id,
        title="第二版绘本（优化版）",
        version=2
    )
    work2 = await WorkService.create_work(db_session, work2_in)

    assert work2.parent_id == work1_id
    assert work2.version == 2


@pytest.mark.asyncio
async def test_get_user_works(db_session: AsyncSession):
    """测试获取用户成果列表"""
    user_in = UserCreate(
        nickname="testtask21",
        password="testpassword123",
        phone="13800138021",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    # 创建多个成果
    for i in range(3):
        task_in = TaskCreate(user_id=user.id, task_type="storybook", estimated_cost=10)
        task = await TaskService.create_task(db_session, task_in)

        work_in = WorkCreate(
            user_id=user.id, task_id=task.id, title=f"绘本{i+1}", version=1
        )
        await WorkService.create_work(db_session, work_in)

    works, total = await WorkService.list_user_works(db_session, user.id, skip=0, limit=10)
    assert total == 3
    assert len(works) == 3


# ============ Work File Tests ============

@pytest.mark.asyncio
async def test_create_work_file(db_session: AsyncSession):
    """测试创建成果文件"""
    user_in = UserCreate(
        nickname="testtask22",
        password="testpassword123",
        phone="13800138022",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    task_in = TaskCreate(user_id=user.id, task_type="storybook", estimated_cost=50)
    task = await TaskService.create_task(db_session, task_in)

    work_in = WorkCreate(user_id=user.id, task_id=task.id, title="测试绘本", version=1)
    work = await WorkService.create_work(db_session, work_in)

    # 添加文件
    file_in = WorkFileCreate(
        work_id=work.id,
        file_type="image",
        file_name="page1.jpg",
        file_url="https://example.com/page1.jpg",
        file_size=102400,
        page_number=1,
        mime_type="image/jpeg",
        is_preview=True
    )
    file = await WorkService.add_work_file(db_session, work.id, file_in, user.id)

    assert file.id is not None
    assert file.work_id == work.id
    assert file.file_type == "image"
    assert file.is_preview is True


@pytest.mark.asyncio
async def test_get_work_files(db_session: AsyncSession):
    """测试获取成果的文件列表"""
    user_in = UserCreate(
        nickname="testtask23",
        password="testpassword123",
        phone="13800138023",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    task_in = TaskCreate(user_id=user.id, task_type="storybook", estimated_cost=50)
    task = await TaskService.create_task(db_session, task_in)

    work_in = WorkCreate(user_id=user.id, task_id=task.id, title="测试绘本", version=1)
    work = await WorkService.create_work(db_session, work_in)

    # 添加多个文件
    for i in range(3):
        file_in = WorkFileCreate(
            work_id=work.id,
            file_type="image",
            file_name=f"page{i+1}.jpg",
            file_url=f"https://example.com/page{i+1}.jpg",
            page_number=i + 1
        )
        await WorkService.add_work_file(db_session, work.id, file_in, user.id)

    files = await WorkService.get_work_files(db_session, work.id)
    assert len(files) == 3


# ============ Edge Case Tests ============

@pytest.mark.asyncio
async def test_get_nonexistent_task(db_session: AsyncSession):
    """测试获取不存在的任务"""
    task = await TaskService.get_by_id(db_session, uuid.uuid4())
    assert task is None


@pytest.mark.asyncio
async def test_progress_boundaries(db_session: AsyncSession):
    """测试进度边界（0-100）"""
    user_in = UserCreate(
        nickname="testtask24",
        password="testpassword123",
        phone="13800138024",
        code="8888"
    )
    user = await UserService.create(db_session, user_in)

    task_in = TaskCreate(user_id=user.id, task_type="storybook", estimated_cost=50)
    task = await TaskService.create_task(db_session, task_in)

    # 测试超过100的进度
    task = await TaskService.update_task_status(db_session, task.id, progress=150)
    assert task.progress == 100  # 被限制在100

    # 测试负数进度
    task = await TaskService.update_task_status(db_session, task.id, progress=-10)
    assert task.progress == 0  # 被限制在0
