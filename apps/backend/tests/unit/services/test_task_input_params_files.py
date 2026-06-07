"""Task 20: 验证 input_params 中的文件元数据在任务创建和持久化过程中不丢失。

动态表单的文件字段会被前端组装成包含 file_id/file_name/file_size/mime_type/url
的对象（单文件）或对象数组（多文件），写入 task.input_params。
执行器要依靠 file_id 反查 user_uploads 表 —— 任何字段丢失都会导致执行器拿不到文件。
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.schemas.task import TaskCreate
from app.schemas.user import UserCreate
from app.services.task_service import TaskService
from app.services.user_service import UserService
from app.models.task import Task


@pytest.mark.asyncio
async def test_task_input_params_preserves_single_file_metadata(db_session: AsyncSession):
    """单文件字段：file_id/file_name/file_size/mime_type/url 都必须原样保留。"""
    user = await UserService.create(db_session, UserCreate(
        nickname="filetest1",
        password="testpassword123",
        phone="13900000201",
        code="8888",
    ))

    file_meta = {
        "file_id": "11111111-1111-1111-1111-111111111111",
        "file_name": "reference.png",
        "file_size": 24680,
        "mime_type": "image/png",
        "url": "/api/v1/files/uploads/11111111-1111-1111-1111-111111111111",
    }
    task_in = TaskCreate(
        user_id=user.id,
        task_type="storybook-generator",
        estimated_cost=0,
        input_params={
            "theme": "森林冒险",
            "reference_image": file_meta,
        },
    )
    task = await TaskService.create_task(db_session, task_in)

    # 重新查 DB，确保是序列化后再读出来的形态
    result = await db_session.execute(select(Task).where(Task.id == task.id))
    persisted = result.scalar_one()

    assert persisted.input_params is not None
    assert persisted.input_params["theme"] == "森林冒险"
    assert persisted.input_params["reference_image"] == file_meta
    # 5 个关键字段一个都不能少
    for k in ("file_id", "file_name", "file_size", "mime_type", "url"):
        assert k in persisted.input_params["reference_image"], f"丢失字段 {k}"


@pytest.mark.asyncio
async def test_task_input_params_preserves_multi_file_metadata(db_session: AsyncSession):
    """多文件字段：数组形态、顺序、每项字段必须完整保留。"""
    user = await UserService.create(db_session, UserCreate(
        nickname="filetest2",
        password="testpassword123",
        phone="13900000202",
        code="8888",
    ))

    files = [
        {
            "file_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "file_name": "a.jpg",
            "file_size": 1000,
            "mime_type": "image/jpeg",
            "url": "/api/v1/files/uploads/a",
        },
        {
            "file_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            "file_name": "b.jpg",
            "file_size": 2000,
            "mime_type": "image/jpeg",
            "url": "/api/v1/files/uploads/b",
        },
    ]
    task_in = TaskCreate(
        user_id=user.id,
        task_type="ecommerce-detail",
        estimated_cost=0,
        input_params={
            "productName": "测试商品",
            "reference_images": files,
        },
    )
    task = await TaskService.create_task(db_session, task_in)

    result = await db_session.execute(select(Task).where(Task.id == task.id))
    persisted = result.scalar_one()

    refs = persisted.input_params["reference_images"]
    assert isinstance(refs, list)
    assert len(refs) == 2
    assert refs[0] == files[0]
    assert refs[1] == files[1]
    # 顺序敏感（多张图常依赖顺序）
    assert refs[0]["file_id"].startswith("aaaa")
    assert refs[1]["file_id"].startswith("bbbb")


@pytest.mark.asyncio
async def test_task_input_params_mixed_fields_and_files(db_session: AsyncSession):
    """混合字段（普通字段 + 单文件 + 多文件 + 隐藏字段 + 嵌套对象）端到端保留。"""
    user = await UserService.create(db_session, UserCreate(
        nickname="filetest3",
        password="testpassword123",
        phone="13900000203",
        code="8888",
    ))

    payload = {
        "productName": "混合测试",
        "imageStyle": "professional",
        "mainImageCount": 3,
        "includePsd": True,
        "platformCount": 3,                       # hidden 字段
        "cover_image": {                          # 单文件
            "file_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
            "file_name": "cover.png",
            "file_size": 9999,
            "mime_type": "image/png",
            "url": "/api/v1/files/uploads/c",
        },
        "detail_images": [                        # 多文件
            {
                "file_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
                "file_name": "d.png",
                "file_size": 8888,
                "mime_type": "image/png",
                "url": "/api/v1/files/uploads/d",
            },
        ],
        "meta": {"source": "form", "nested": {"k": "v"}},  # 嵌套对象不应被压扁
    }

    task_in = TaskCreate(
        user_id=user.id,
        task_type="ecommerce-detail",
        estimated_cost=0,
        input_params=payload,
    )
    task = await TaskService.create_task(db_session, task_in)

    result = await db_session.execute(select(Task).where(Task.id == task.id))
    persisted = result.scalar_one()
    assert persisted.input_params == payload
