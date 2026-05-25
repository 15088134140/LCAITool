"""
系统扩展表模型单元测试
"""
import pytest
import uuid
import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.models.system import (
    RealNameVerification, IdeaSubmission, IdeaVote, AdminAuditLog
)


@pytest.mark.asyncio
async def test_create_real_name_verification(db_session: AsyncSession):
    """测试创建实名认证记录"""
    user = User(nickname="testuser", phone="13800138000", balance=100)
    db_session.add(user)
    await db_session.commit()

    verification = RealNameVerification(
        user_id=user.id,
        real_name="张三",
        id_card_number_encrypted="encrypted_id_card_123",
        id_card_hash="sha256_hash_abc123",
        front_image="https://example.com/front.jpg",
        back_image="https://example.com/back.jpg",
        hold_image="https://example.com/hold.jpg",
        verification_status="pending"
    )
    db_session.add(verification)
    await db_session.commit()
    await db_session.refresh(verification)

    assert verification.id is not None
    assert verification.user_id == user.id
    assert verification.real_name == "张三"
    assert verification.verification_status == "pending"
    assert verification.created_at is not None


@pytest.mark.asyncio
async def test_real_name_verification_submit(db_session: AsyncSession):
    """测试提交实名认证"""
    user = User(nickname="testuser", phone="13800138001", balance=100)
    db_session.add(user)
    await db_session.commit()

    verification = RealNameVerification(
        user_id=user.id,
        real_name="张三",
        id_card_number_encrypted="encrypted_id_card_123",
        id_card_hash="sha256_hash_abc123"
    )
    db_session.add(verification)
    await db_session.commit()

    # 提交审核
    verification.submit()
    await db_session.commit()
    await db_session.refresh(verification)

    assert verification.verification_status == "reviewing"
    assert verification.submitted_at is not None


@pytest.mark.asyncio
async def test_real_name_verification_approve(db_session: AsyncSession):
    """测试实名认证审核通过"""
    user = User(nickname="testuser", phone="13800138002", balance=100)
    admin = User(nickname="admin", phone="13900139000", balance=0)
    db_session.add_all([user, admin])
    await db_session.commit()

    verification = RealNameVerification(
        user_id=user.id,
        real_name="张三",
        id_card_number_encrypted="encrypted_id_card_123",
        id_card_hash="sha256_hash_abc123"
    )
    db_session.add(verification)
    await db_session.commit()

    # 审核通过
    verification.approve(admin.id, "信息真实有效")
    await db_session.commit()
    await db_session.refresh(verification)

    assert verification.verification_status == "approved"
    assert verification.reviewer_id == admin.id
    assert verification.review_remark == "信息真实有效"
    assert verification.reviewed_at is not None


@pytest.mark.asyncio
async def test_real_name_verification_reject(db_session: AsyncSession):
    """测试实名认证审核拒绝"""
    user = User(nickname="testuser", phone="13800138003", balance=100)
    admin = User(nickname="admin", phone="13900139001", balance=0)
    db_session.add_all([user, admin])
    await db_session.commit()

    verification = RealNameVerification(
        user_id=user.id,
        real_name="张三",
        id_card_number_encrypted="encrypted_id_card_123",
        id_card_hash="sha256_hash_abc123"
    )
    db_session.add(verification)
    await db_session.commit()

    # 审核拒绝
    verification.reject(admin.id, "照片模糊，请重新上传")
    await db_session.commit()
    await db_session.refresh(verification)

    assert verification.verification_status == "rejected"
    assert verification.reviewer_id == admin.id
    assert verification.review_remark == "照片模糊，请重新上传"
    assert verification.reviewed_at is not None


@pytest.mark.asyncio
async def test_real_name_verification_relationships(db_session: AsyncSession):
    """测试实名认证关系"""
    user = User(nickname="testuser", phone="13800138004", balance=100)
    db_session.add(user)
    await db_session.commit()

    verification = RealNameVerification(
        user_id=user.id,
        real_name="张三",
        id_card_number_encrypted="encrypted_id_card_123",
        id_card_hash="sha256_hash_abc123"
    )
    db_session.add(verification)
    await db_session.commit()

    await db_session.refresh(user, ["real_name_verifications"])
    assert len(user.real_name_verifications) == 1
    assert user.real_name_verifications[0].id == verification.id


@pytest.mark.asyncio
async def test_create_idea_submission(db_session: AsyncSession):
    """测试创建创意提交"""
    user = User(nickname="testuser", phone="13800138005", balance=100)
    db_session.add(user)
    await db_session.commit()

    idea = IdeaSubmission(
        user_id=user.id,
        title="AI视频生成工具",
        description="一个可以生成短视频的AI工具",
        cover_image="https://example.com/cover.jpg",
        category="video",
        tags='["AI", "视频", "生成"]',
        contact_info="user@example.com"
    )
    db_session.add(idea)
    await db_session.commit()
    await db_session.refresh(idea)

    assert idea.id is not None
    assert idea.user_id == user.id
    assert idea.title == "AI视频生成工具"
    assert idea.vote_count == 0
    assert idea.view_count == 0
    assert idea.status == "pending"


@pytest.mark.asyncio
async def test_idea_submission_approve(db_session: AsyncSession):
    """测试创意审核通过"""
    user = User(nickname="testuser", phone="13800138006", balance=100)
    admin = User(nickname="admin", phone="13900139002", balance=0)
    db_session.add_all([user, admin])
    await db_session.commit()

    idea = IdeaSubmission(
        user_id=user.id,
        title="AI视频生成工具",
        description="一个可以生成短视频的AI工具"
    )
    db_session.add(idea)
    await db_session.commit()

    idea.approve(admin.id, "创意很棒，已通过审核")
    await db_session.commit()
    await db_session.refresh(idea)

    assert idea.status == "approved"
    assert idea.admin_id == admin.id
    assert idea.admin_remark == "创意很棒，已通过审核"
    assert idea.reviewed_at is not None


@pytest.mark.asyncio
async def test_idea_submission_reject(db_session: AsyncSession):
    """测试创意审核拒绝"""
    user = User(nickname="testuser", phone="13800138007", balance=100)
    admin = User(nickname="admin", phone="13900139003", balance=0)
    db_session.add_all([user, admin])
    await db_session.commit()

    idea = IdeaSubmission(
        user_id=user.id,
        title="AI视频生成工具",
        description="一个可以生成短视频的AI工具"
    )
    db_session.add(idea)
    await db_session.commit()

    idea.reject(admin.id, "创意描述不够详细，请补充后重新提交")
    await db_session.commit()
    await db_session.refresh(idea)

    assert idea.status == "rejected"
    assert idea.admin_id == admin.id
    assert idea.admin_remark == "创意描述不够详细，请补充后重新提交"


@pytest.mark.asyncio
async def test_idea_submission_implement(db_session: AsyncSession):
    """测试创意标记为已实现"""
    user = User(nickname="testuser", phone="13800138008", balance=100)
    db_session.add(user)
    await db_session.commit()

    idea = IdeaSubmission(
        user_id=user.id,
        title="AI视频生成工具",
        description="一个可以生成短视频的AI工具"
    )
    idea.status = "approved"
    db_session.add(idea)
    await db_session.commit()

    idea.implement()
    await db_session.commit()
    await db_session.refresh(idea)

    assert idea.status == "implemented"


@pytest.mark.asyncio
async def test_idea_submission_increment_vote(db_session: AsyncSession):
    """测试增加创意投票数"""
    user = User(nickname="testuser", phone="13800138009", balance=100)
    db_session.add(user)
    await db_session.commit()

    idea = IdeaSubmission(
        user_id=user.id,
        title="AI视频生成工具",
        description="一个可以生成短视频的AI工具"
    )
    db_session.add(idea)
    await db_session.commit()

    idea.increment_vote(1)
    await db_session.commit()
    await db_session.refresh(idea)
    assert idea.vote_count == 1

    idea.increment_vote(2)
    await db_session.commit()
    await db_session.refresh(idea)
    assert idea.vote_count == 3

    idea.increment_vote(-1)
    await db_session.commit()
    await db_session.refresh(idea)
    assert idea.vote_count == 2

    # 测试不能为负数
    idea.increment_vote(-10)
    await db_session.commit()
    await db_session.refresh(idea)
    assert idea.vote_count == 0


@pytest.mark.asyncio
async def test_idea_submission_increment_view(db_session: AsyncSession):
    """测试增加创意浏览数"""
    user = User(nickname="testuser", phone="13800138010", balance=100)
    db_session.add(user)
    await db_session.commit()

    idea = IdeaSubmission(
        user_id=user.id,
        title="AI视频生成工具",
        description="一个可以生成短视频的AI工具"
    )
    db_session.add(idea)
    await db_session.commit()

    idea.increment_view()
    await db_session.commit()
    await db_session.refresh(idea)
    assert idea.view_count == 1

    idea.increment_view()
    await db_session.commit()
    await db_session.refresh(idea)
    assert idea.view_count == 2


@pytest.mark.asyncio
async def test_create_idea_vote(db_session: AsyncSession):
    """测试创建创意投票"""
    user1 = User(nickname="testuser1", phone="13800138011", balance=100)
    user2 = User(nickname="testuser2", phone="13800138012", balance=100)
    db_session.add_all([user1, user2])
    await db_session.commit()

    idea = IdeaSubmission(
        user_id=user1.id,
        title="AI视频生成工具",
        description="一个可以生成短视频的AI工具"
    )
    db_session.add(idea)
    await db_session.commit()

    vote1 = IdeaVote(
        idea_id=idea.id,
        user_id=user2.id,
        vote_type="up"
    )
    db_session.add(vote1)
    await db_session.commit()
    await db_session.refresh(vote1)

    assert vote1.id is not None
    assert vote1.idea_id == idea.id
    assert vote1.user_id == user2.id
    assert vote1.vote_type == "up"


@pytest.mark.asyncio
async def test_idea_vote_unique_constraint(db_session: AsyncSession):
    """测试同一用户对同一创意只能投一票"""
    user1 = User(nickname="testuser1", phone="13800138013", balance=100)
    user2 = User(nickname="testuser2", phone="13800138014", balance=100)
    db_session.add_all([user1, user2])
    await db_session.commit()

    idea = IdeaSubmission(
        user_id=user1.id,
        title="AI视频生成工具",
        description="一个可以生成短视频的AI工具"
    )
    db_session.add(idea)
    await db_session.commit()

    # 第一次投票
    vote1 = IdeaVote(idea_id=idea.id, user_id=user2.id, vote_type="up")
    db_session.add(vote1)
    await db_session.commit()

    # 第二次投票应该失败
    from sqlalchemy.exc import IntegrityError

    vote2 = IdeaVote(idea_id=idea.id, user_id=user2.id, vote_type="down")
    db_session.add(vote2)

    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_idea_vote_relationships(db_session: AsyncSession):
    """测试创意投票关系"""
    user1 = User(nickname="testuser1", phone="13800138015", balance=100)
    user2 = User(nickname="testuser2", phone="13800138016", balance=100)
    db_session.add_all([user1, user2])
    await db_session.commit()

    idea = IdeaSubmission(
        user_id=user1.id,
        title="AI视频生成工具",
        description="一个可以生成短视频的AI工具"
    )
    db_session.add(idea)
    await db_session.commit()

    vote = IdeaVote(idea_id=idea.id, user_id=user2.id, vote_type="up")
    db_session.add(vote)
    await db_session.commit()

    await db_session.refresh(idea, ["votes"])
    await db_session.refresh(user2, ["idea_votes"])

    assert len(idea.votes) == 1
    assert idea.votes[0].id == vote.id
    assert len(user2.idea_votes) == 1
    assert user2.idea_votes[0].id == vote.id


@pytest.mark.asyncio
async def test_create_admin_audit_log(db_session: AsyncSession):
    """测试创建管理后台操作审计日志"""
    admin = User(nickname="admin", phone="13900139004", balance=0)
    db_session.add(admin)
    await db_session.commit()

    log = AdminAuditLog(
        admin_id=admin.id,
        action_type="user.update",
        target_type="User",
        target_id=str(uuid.uuid4()),
        ip_address="192.168.1.1",
        user_agent="Mozilla/5.0",
        request_data={"field": "nickname", "old": "old", "new": "new"},
        response_data={"success": True},
        success=True
    )
    db_session.add(log)
    await db_session.commit()
    await db_session.refresh(log)

    assert log.id is not None
    assert log.admin_id == admin.id
    assert log.action_type == "user.update"
    assert log.success is True
    assert log.created_at is not None


@pytest.mark.asyncio
async def test_create_admin_audit_log_failed(db_session: AsyncSession):
    """测试创建失败的审计日志"""
    admin = User(nickname="admin", phone="13900139005", balance=0)
    db_session.add(admin)
    await db_session.commit()

    log = AdminAuditLog(
        admin_id=admin.id,
        action_type="user.delete",
        target_type="User",
        target_id=str(uuid.uuid4()),
        ip_address="192.168.1.2",
        success=False,
        error_message="权限不足"
    )
    db_session.add(log)
    await db_session.commit()
    await db_session.refresh(log)

    assert log.id is not None
    assert log.success is False
    assert log.error_message == "权限不足"


@pytest.mark.asyncio
async def test_admin_audit_log_create_log_classmethod(db_session: AsyncSession):
    """测试审计日志类方法创建"""
    admin = User(nickname="admin", phone="13900139006", balance=0)
    db_session.add(admin)
    await db_session.commit()

    log = AdminAuditLog.create_log(
        admin_id=admin.id,
        action_type="tool.create",
        target_type="Tool",
        target_id="123",
        ip_address="192.168.1.3",
        request_data={"name": "新工具"},
        success=True
    )
    db_session.add(log)
    await db_session.commit()
    await db_session.refresh(log)

    assert log.id is not None
    assert log.action_type == "tool.create"
    assert log.target_type == "Tool"
    assert log.target_id == "123"


@pytest.mark.asyncio
async def test_admin_audit_log_relationships(db_session: AsyncSession):
    """测试审计日志关系"""
    admin = User(nickname="admin", phone="13900139007", balance=0)
    db_session.add(admin)
    await db_session.commit()

    log = AdminAuditLog(
        admin_id=admin.id,
        action_type="test.action",
        success=True
    )
    db_session.add(log)
    await db_session.commit()

    await db_session.refresh(admin, ["admin_audit_logs"])
    assert len(admin.admin_audit_logs) == 1
    assert admin.admin_audit_logs[0].id == log.id


@pytest.mark.asyncio
async def test_query_ideas_by_category_status(db_session: AsyncSession):
    """测试按分类和状态查询创意"""
    user = User(nickname="testuser", phone="13800138017", balance=100)
    db_session.add(user)
    await db_session.commit()

    idea1 = IdeaSubmission(
        user_id=user.id,
        title="AI视频工具",
        category="video",
        status="approved"
    )
    idea2 = IdeaSubmission(
        user_id=user.id,
        title="AI图像工具",
        category="image",
        status="approved"
    )
    idea3 = IdeaSubmission(
        user_id=user.id,
        title="AI文本工具",
        category="text",
        status="pending"
    )
    db_session.add_all([idea1, idea2, idea3])
    await db_session.commit()

    # 查询已通过的视频类创意
    result = await db_session.execute(
        select(IdeaSubmission).where(
            IdeaSubmission.category == "video",
            IdeaSubmission.status == "approved"
        )
    )
    ideas = result.scalars().all()

    assert len(ideas) == 1
    assert ideas[0].title == "AI视频工具"
