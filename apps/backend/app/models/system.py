"""
系统扩展表模型
包含实名认证记录、创意提交、构思工具投票、管理后台操作审计日志
"""
import uuid
import time
from sqlalchemy import (
    Column, String, Integer, ForeignKey, Text, Boolean,
    UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.mixins import JSONType


class RealNameVerification(BaseModel):
    """实名认证记录表"""
    __tablename__ = "real_name_verifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True, comment="记录ID")
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="用户ID")
    real_name = Column(String(50), nullable=False, comment="身份证姓名")
    id_card_number_encrypted = Column(String(255), nullable=False, comment="身份证号(AES-256加密)")
    id_card_hash = Column(String(64), nullable=False, index=True, comment="身份证号SHA-256哈希")
    front_image = Column(String(255), nullable=True, comment="身份证正面照片URL")
    back_image = Column(String(255), nullable=True, comment="身份证背面照片URL")
    hold_image = Column(String(255), nullable=True, comment="手持身份证照片URL")
    verification_status = Column(
        String(20),
        nullable=False,
        default="pending",
        index=True,
        comment="审核状态：pending待提交 reviewing审核中 approved已通过 rejected已拒绝"
    )
    review_remark = Column(String(500), nullable=True, comment="审核备注")
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True, comment="审核人ID")
    reviewed_at = Column(Integer, nullable=True, comment="审核时间")
    submitted_at = Column(Integer, nullable=True, comment="提交时间")

    # 关系
    user = relationship("User", foreign_keys=[user_id], backref="real_name_verifications")
    reviewer = relationship("User", foreign_keys=[reviewer_id])

    __table_args__ = (
        Index("idx_real_name_user_status", "user_id", "verification_status"),
    )

    def submit(self):
        """提交审核"""
        self.verification_status = "reviewing"
        self.submitted_at = int(time.time())

    def approve(self, reviewer_id, remark=None):
        """审核通过"""
        self.verification_status = "approved"
        self.reviewer_id = reviewer_id
        self.review_remark = remark
        self.reviewed_at = int(time.time())

    def reject(self, reviewer_id, remark=None):
        """审核拒绝"""
        self.verification_status = "rejected"
        self.reviewer_id = reviewer_id
        self.review_remark = remark
        self.reviewed_at = int(time.time())


class IdeaSubmission(BaseModel):
    """创意提交表"""
    __tablename__ = "idea_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True, comment="创意ID")
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="提交用户ID")
    title = Column(String(200), nullable=False, comment="创意标题")
    description = Column(Text, nullable=True, comment="创意描述")
    cover_image = Column(String(255), nullable=True, comment="封面图片URL")
    category = Column(String(50), nullable=True, index=True, comment="分类")
    tags = Column(Text, nullable=True, comment="标签(JSON数组格式)")
    contact_info = Column(String(200), nullable=True, comment="联系方式")
    vote_count = Column(Integer, default=0, nullable=False, comment="投票数")
    view_count = Column(Integer, default=0, nullable=False, comment="浏览数")
    status = Column(
        String(20),
        nullable=False,
        default="pending",
        index=True,
        comment="状态：pending待审核 reviewing审核中 approved已通过 implemented已实现 rejected已拒绝"
    )
    admin_remark = Column(String(500), nullable=True, comment="管理员备注")
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True, comment="审核管理员ID")
    reviewed_at = Column(Integer, nullable=True, comment="审核时间")

    # 关系
    user = relationship("User", foreign_keys=[user_id], backref="idea_submissions")
    admin = relationship("User", foreign_keys=[admin_id])
    votes = relationship("IdeaVote", back_populates="idea", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_idea_category_status", "category", "status"),
    )

    def approve(self, admin_id, remark=None):
        """审核通过"""
        self.status = "approved"
        self.admin_id = admin_id
        self.admin_remark = remark
        self.reviewed_at = int(time.time())

    def reject(self, admin_id, remark=None):
        """审核拒绝"""
        self.status = "rejected"
        self.admin_id = admin_id
        self.admin_remark = remark
        self.reviewed_at = int(time.time())

    def implement(self):
        """标记为已实现"""
        self.status = "implemented"
        self.reviewed_at = int(time.time())

    def unapprove(self, admin_id, remark=None):
        """弃审：将已审核的创意回退到待审核状态"""
        self.status = "pending"
        self.admin_remark = remark
        self.reviewed_at = int(time.time())

    def increment_vote(self, delta=1):
        """增加投票数（支持正负值，防止负数）"""
        self.vote_count = max((self.vote_count or 0) + delta, 0)

    def increment_view(self):
        """增加浏览数"""
        self.view_count = (self.view_count or 0) + 1


class IdeaVote(BaseModel):
    """构思工具投票表"""
    __tablename__ = "idea_votes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True, comment="投票ID")
    idea_id = Column(UUID(as_uuid=True), ForeignKey("idea_submissions.id", ondelete="CASCADE"), nullable=False, index=True, comment="创意ID")
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="用户ID")
    vote_type = Column(String(10), nullable=False, default="up", comment="投票类型：up支持 down反对")

    # 关系
    idea = relationship("IdeaSubmission", back_populates="votes")
    user = relationship("User", backref="idea_votes")

    __table_args__ = (
        UniqueConstraint("idea_id", "user_id", name="uq_idea_user_vote"),
        Index("idx_idea_vote_type", "idea_id", "vote_type"),
    )


class AdminAuditLog(BaseModel):
    """管理后台操作审计日志表"""
    __tablename__ = "admin_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True, comment="日志ID")
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True, comment="管理员ID")
    action_type = Column(String(50), nullable=False, index=True, comment="操作类型")
    target_type = Column(String(50), nullable=True, index=True, comment="目标类型")
    target_id = Column(String(100), nullable=True, index=True, comment="目标ID")
    ip_address = Column(String(50), nullable=True, comment="IP地址")
    user_agent = Column(String(500), nullable=True, comment="用户代理")
    request_data = Column(JSONType, nullable=True, comment="请求数据(JSON)")
    response_data = Column(JSONType, nullable=True, comment="响应数据(JSON)")
    success = Column(Boolean, default=True, nullable=False, index=True, comment="是否成功")
    error_message = Column(String(500), nullable=True, comment="错误信息")

    # 关系
    admin = relationship("User", backref="admin_audit_logs")

    __table_args__ = (
        Index("idx_audit_admin_action", "admin_id", "action_type"),
        Index("idx_audit_target", "target_type", "target_id"),
        Index("idx_audit_created_at", "created_at"),
    )

    @classmethod
    def create_log(cls, admin_id, action_type, target_type=None, target_id=None,
                   ip_address=None, user_agent=None, request_data=None,
                   response_data=None, success=True, error_message=None):
        """创建审计日志"""
        return cls(
            admin_id=admin_id,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            ip_address=ip_address,
            user_agent=user_agent,
            request_data=request_data,
            response_data=response_data,
            success=success,
            error_message=error_message
        )


class Feedback(BaseModel):
    """用户反馈表"""
    __tablename__ = "feedbacks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="用户ID")
    type = Column(String(20), nullable=False, comment="类型: feature/bug/consult/other")
    title = Column(String(200), nullable=False, comment="反馈标题")
    description = Column(Text, nullable=True, comment="详细描述")
    contact = Column(String(200), nullable=True, comment="联系方式")
    status = Column(String(20), nullable=False, default="pending", index=True, comment="状态: pending/processing/resolved/adopted")
    admin_reply = Column(Text, nullable=True, comment="管理员回复")
    reply_points = Column(Integer, nullable=True, comment="采纳奖励积分")
    replied_at = Column(Integer, nullable=True, comment="回复时间")
    rewarded_at = Column(Integer, nullable=True, comment="奖励发放时间")
    replied_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, comment="回复管理员ID")

    user = relationship("User", foreign_keys=[user_id], backref="feedbacks")
    replier = relationship("User", foreign_keys=[replied_by])

    __table_args__ = (
        Index("idx_feedback_status", "status"),
        Index("idx_feedback_user", "user_id"),
    )


class SystemConfig(BaseModel):
    """系统配置表"""
    __tablename__ = "system_configs"

    key = Column(String(100), primary_key=True, comment="配置键")
    value = Column(Text, nullable=True, comment="配置值")
    group = Column(String(50), nullable=False, index=True, comment="分组: basic/business")
    label = Column(String(100), nullable=False, comment="显示名称")
    description = Column(String(500), nullable=True, comment="配置说明")
    type = Column(String(20), nullable=False, default="string", comment="值类型: string/number/boolean/richtext")
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, comment="更新人")


class AiProvider(BaseModel):
    """AI 提供商配置表"""
    __tablename__ = "ai_providers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    slug = Column(String(50), unique=True, nullable=False, index=True, comment="标识符: volcano/deepseek/dify/openai")
    name = Column(String(100), nullable=False, comment="显示名称")
    provider_type = Column(String(50), nullable=False, comment="类型: openai/volcano/dify/custom")
    config = Column(JSONType, nullable=True, comment="配置JSON: 含api_key/base_url/model等")
    is_active = Column(Boolean, default=True, nullable=False, comment="是否启用")
    sort_order = Column(Integer, default=0, nullable=False, comment="排序")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, comment="创建人")

    creator = relationship("User", foreign_keys=[created_by])
