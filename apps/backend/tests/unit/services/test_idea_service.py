import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.schemas.idea import IdeaSubmissionCreate, IdeaVoteCreate
from app.services.idea_service import IdeaService
from app.core.exceptions import (
    IdeaNotFoundException,
    UserNotVerifiedException,
    AlreadyVotedException
)


# ============== Idea Submission Tests ==============

@pytest.mark.asyncio
async def test_submit_idea(db_session: AsyncSession):
    """测试提交创意"""
    user_id = uuid.uuid4()
    idea_in = IdeaSubmissionCreate(
        title="AI电商商品详情页生成器",
        description="一键生成专业级电商商品详情页，包含主图、细节图、营销文案等",
        category="AI工具",
        tags=["电商", "AI", "图片生成"],
        contact_info="user@example.com"
    )
    idea = await IdeaService.submit_idea(db_session, user_id, idea_in)

    assert idea.id is not None
    assert idea.user_id == user_id
    assert idea.title == "AI电商商品详情页生成器"
    assert idea.category == "AI工具"
    assert idea.vote_count == 0
    assert idea.view_count == 0
    assert idea.status == "pending"


@pytest.mark.asyncio
async def test_get_idea(db_session: AsyncSession):
    """测试获取创意详情"""
    user_id = uuid.uuid4()
    idea_in = IdeaSubmissionCreate(title="测试创意", description="测试描述")
    idea = await IdeaService.submit_idea(db_session, user_id, idea_in)

    found = await IdeaService.get_idea(db_session, idea.id)
    assert found is not None
    assert found.id == idea.id
    assert found.title == "测试创意"


@pytest.mark.asyncio
async def test_get_idea_increment_view(db_session: AsyncSession):
    """测试获取创意时增加浏览数"""
    user_id = uuid.uuid4()
    idea_in = IdeaSubmissionCreate(title="浏览测试创意")
    idea = await IdeaService.submit_idea(db_session, user_id, idea_in)
    initial_views = idea.view_count

    # 获取并增加浏览数
    found = await IdeaService.get_idea(db_session, idea.id, increment_view=True)

    assert found.view_count == initial_views + 1


@pytest.mark.asyncio
async def test_get_idea_not_found(db_session: AsyncSession):
    """测试获取不存在的创意"""
    found = await IdeaService.get_idea(db_session, uuid.uuid4())
    assert found is None


@pytest.mark.asyncio
async def test_list_ideas_sorted_by_votes(db_session: AsyncSession):
    """测试按票数排序列出创意"""
    user_id = uuid.uuid4()

    # 创建多个创意
    ideas = []
    for i in range(3):
        idea_in = IdeaSubmissionCreate(title=f"创意{i}", description=f"描述{i}")
        idea = await IdeaService.submit_idea(db_session, user_id, idea_in)
        ideas.append(idea)

    # 手动设置不同的投票数（模拟投票）
    ideas[0].vote_count = 10
    ideas[1].vote_count = 20
    ideas[2].vote_count = 5
    await db_session.commit()

    # 按票数排序（默认）
    result, total = await IdeaService.list_ideas(db_session, skip=0, limit=10, status=None)

    assert total >= 3
    # 验证按票数降序排列：20, 10, 5
    assert result[0].vote_count >= result[1].vote_count >= result[2].vote_count


@pytest.mark.asyncio
async def test_list_ideas_sorted_by_newest(db_session: AsyncSession):
    """测试按时间排序"""
    user_id = uuid.uuid4()

    for i in range(3):
        idea_in = IdeaSubmissionCreate(title=f"新创意{i}")
        await IdeaService.submit_idea(db_session, user_id, idea_in)

    result, total = await IdeaService.list_ideas(db_session, skip=0, limit=10, sort_by="newest", status=None)

    assert total >= 3
    # 验证按创建时间降序
    assert result[0].created_at >= result[1].created_at >= result[2].created_at


@pytest.mark.asyncio
async def test_list_ideas_pagination(db_session: AsyncSession):
    """测试创意列表分页"""
    user_id = uuid.uuid4()

    # 创建15个创意
    for i in range(15):
        idea_in = IdeaSubmissionCreate(title=f"分页测试创意{i}")
        await IdeaService.submit_idea(db_session, user_id, idea_in)

    # 第一页
    ideas1, total1 = await IdeaService.list_ideas(db_session, skip=0, limit=10, status=None)
    assert total1 >= 15
    assert len(ideas1) == 10

    # 第二页
    ideas2, total2 = await IdeaService.list_ideas(db_session, skip=10, limit=10, status=None)
    assert total2 >= 15
    assert len(ideas2) == 5


@pytest.mark.asyncio
async def test_list_ideas_filter_by_category(db_session: AsyncSession):
    """测试按分类过滤"""
    user_id = uuid.uuid4()

    # 创建不同分类的创意
    for i in range(3):
        idea_in = IdeaSubmissionCreate(title=f"AI工具创意{i}", category="AI工具")
        await IdeaService.submit_idea(db_session, user_id, idea_in)

    for i in range(2):
        idea_in = IdeaSubmissionCreate(title=f"其他创意{i}", category="其他")
        await IdeaService.submit_idea(db_session, user_id, idea_in)

    # 按分类过滤
    result, total = await IdeaService.list_ideas(
        db_session, skip=0, limit=10, category="AI工具", status=None
    )

    assert total == 3
    assert len(result) == 3
    for idea in result:
        assert idea.category == "AI工具"


# ============== Vote Tests ==============

@pytest.mark.asyncio
async def test_vote_idea_success(verified_user_id: uuid.UUID, db_session: AsyncSession):
    """测试成功投票（实名认证用户）"""
    idea_in = IdeaSubmissionCreate(title="投票测试创意")
    idea = await IdeaService.submit_idea(db_session, verified_user_id, idea_in)

    vote_in = IdeaVoteCreate(idea_id=idea.id, vote_type="up")
    vote = await IdeaService.vote_idea(db_session, verified_user_id, vote_in)

    assert vote.id is not None
    assert vote.user_id == verified_user_id
    assert vote.idea_id == idea.id
    assert vote.vote_type == "up"

    # 验证投票数已增加
    updated_idea = await IdeaService.get_idea(db_session, idea.id)
    assert updated_idea.vote_count == 1


@pytest.mark.asyncio
async def test_vote_idea_user_not_verified(db_session: AsyncSession):
    """测试未实名认证用户投票（应失败）"""
    # 创建一个未实名认证的用户
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        nickname="未认证用户",
        id_card_verified=False,
        balance=1000,
        status=1
    )
    db_session.add(user)
    await db_session.commit()

    idea_in = IdeaSubmissionCreate(title="未认证投票测试")
    idea = await IdeaService.submit_idea(db_session, user_id, idea_in)

    vote_in = IdeaVoteCreate(idea_id=idea.id)

    with pytest.raises(UserNotVerifiedException):
        await IdeaService.vote_idea(db_session, user_id, vote_in)

    # 验证投票数未增加
    updated_idea = await IdeaService.get_idea(db_session, idea.id)
    assert updated_idea.vote_count == 0


@pytest.mark.asyncio
async def test_vote_idea_already_voted(verified_user_id: uuid.UUID, db_session: AsyncSession):
    """测试重复投票（应失败）"""
    idea_in = IdeaSubmissionCreate(title="重复投票测试创意")
    idea = await IdeaService.submit_idea(db_session, verified_user_id, idea_in)

    # 第一次投票
    vote_in = IdeaVoteCreate(idea_id=idea.id)
    await IdeaService.vote_idea(db_session, verified_user_id, vote_in)

    # 第二次投票（应抛出异常）
    with pytest.raises(AlreadyVotedException):
        await IdeaService.vote_idea(db_session, verified_user_id, vote_in)

    # 验证投票数只增加了一次
    updated_idea = await IdeaService.get_idea(db_session, idea.id)
    assert updated_idea.vote_count == 1


@pytest.mark.asyncio
async def test_vote_idea_not_found(verified_user_id: uuid.UUID, db_session: AsyncSession):
    """测试给不存在的创意投票"""
    vote_in = IdeaVoteCreate(idea_id=uuid.uuid4())

    with pytest.raises(IdeaNotFoundException):
        await IdeaService.vote_idea(db_session, verified_user_id, vote_in)


@pytest.mark.asyncio
async def test_vote_idea_down(verified_user_id: uuid.UUID, db_session: AsyncSession):
    """测试反对票"""
    idea_in = IdeaSubmissionCreate(title="反对票测试创意")
    idea = await IdeaService.submit_idea(db_session, verified_user_id, idea_in)

    vote_in = IdeaVoteCreate(idea_id=idea.id, vote_type="down")
    await IdeaService.vote_idea(db_session, verified_user_id, vote_in)

    # 验证投票数不会减少到0以下（初始为0，投反对票后保持为0）
    updated_idea = await IdeaService.get_idea(db_session, idea.id)
    assert updated_idea.vote_count == 0


# ============== Helper Methods Tests ==============

@pytest.mark.asyncio
async def test_has_user_voted(verified_user_id: uuid.UUID, db_session: AsyncSession):
    """测试检查用户是否已投票"""
    idea_in = IdeaSubmissionCreate(title="投票检查测试")
    idea = await IdeaService.submit_idea(db_session, verified_user_id, idea_in)

    # 未投票时
    has_voted = await IdeaService.has_user_voted(db_session, verified_user_id, idea.id)
    assert has_voted is False

    # 投票后
    vote_in = IdeaVoteCreate(idea_id=idea.id)
    await IdeaService.vote_idea(db_session, verified_user_id, vote_in)

    has_voted = await IdeaService.has_user_voted(db_session, verified_user_id, idea.id)
    assert has_voted is True


@pytest.mark.asyncio
async def test_get_user_votes(verified_user_id: uuid.UUID, db_session: AsyncSession):
    """测试获取用户的投票列表"""
    # 创建多个创意并投票
    for i in range(3):
        idea_in = IdeaSubmissionCreate(title=f"用户投票创意{i}")
        idea = await IdeaService.submit_idea(db_session, verified_user_id, idea_in)
        vote_in = IdeaVoteCreate(idea_id=idea.id)
        await IdeaService.vote_idea(db_session, verified_user_id, vote_in)

    votes, total = await IdeaService.get_user_votes(db_session, verified_user_id)

    assert total == 3
    assert len(votes) == 3
    for vote in votes:
        assert vote.user_id == verified_user_id
