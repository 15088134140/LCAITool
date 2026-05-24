"""add p0 features: checkin/invite/feedback/settings/ai_providers

Revision ID: a1513fffa107
Revises: 008_change_cover_image_to_text
Create Date: 2026-05-25 00:00:44.856785

"""
from alembic import op
import sqlalchemy as sa
from app.models.mixins import JSONType

# revision identifiers, used by Alembic.
revision = 'a1513fffa107'
down_revision = '008_change_cover_image_to_text'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- users: add invite/checkin columns ---
    op.add_column('users', sa.Column('invited_by', sa.UUID(), nullable=True, comment='邀请人用户ID'))
    op.add_column('users', sa.Column('invite_code', sa.String(length=20), nullable=True, comment='唯一邀请码'))
    op.add_column('users', sa.Column('checkin_streak', sa.Integer(), nullable=False, server_default='0', comment='连续签到天数'))
    op.add_column('users', sa.Column('last_checkin_date', sa.String(length=10), nullable=True, comment='最后签到日期(YYYY-MM-DD)'))
    op.add_column('users', sa.Column('total_checkin_days', sa.Integer(), nullable=False, server_default='0', comment='累计签到天数'))
    op.create_index(op.f('ix_users_invite_code'), 'users', ['invite_code'], unique=True)
    op.create_index(op.f('ix_users_invited_by'), 'users', ['invited_by'], unique=False)
    op.create_foreign_key('fk_users_invited_by', 'users', 'users', ['invited_by'], ['id'], ondelete='SET NULL')

    # --- feedbacks ---
    op.create_table('feedbacks',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False, comment='用户ID'),
        sa.Column('type', sa.String(length=20), nullable=False, comment='类型: feature/bug/consult/other'),
        sa.Column('title', sa.String(length=200), nullable=False, comment='反馈标题'),
        sa.Column('description', sa.Text(), nullable=True, comment='详细描述'),
        sa.Column('contact', sa.String(length=200), nullable=True, comment='联系方式'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending', comment='状态: pending/processing/resolved/adopted'),
        sa.Column('admin_reply', sa.Text(), nullable=True, comment='管理员回复'),
        sa.Column('reply_points', sa.Integer(), nullable=True, comment='采纳奖励积分'),
        sa.Column('replied_at', sa.Integer(), nullable=True, comment='回复时间'),
        sa.Column('rewarded_at', sa.Integer(), nullable=True, comment='奖励发放时间'),
        sa.Column('replied_by', sa.UUID(), nullable=True, comment='回复管理员ID'),
        sa.Column('created_at', sa.Integer(), nullable=False, comment='创建时间'),
        sa.Column('updated_at', sa.Integer(), nullable=False, comment='更新时间'),
        sa.ForeignKeyConstraint(['replied_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_feedbacks_id'), 'feedbacks', ['id'], unique=False)
    op.create_index('idx_feedback_status', 'feedbacks', ['status'], unique=False)
    op.create_index('idx_feedback_user', 'feedbacks', ['user_id'], unique=False)

    # --- system_configs ---
    op.create_table('system_configs',
        sa.Column('key', sa.String(length=100), nullable=False, comment='配置键'),
        sa.Column('value', sa.Text(), nullable=True, comment='配置值'),
        sa.Column('group', sa.String(length=50), nullable=False, comment='分组: basic/business'),
        sa.Column('label', sa.String(length=100), nullable=False, comment='显示名称'),
        sa.Column('description', sa.String(length=500), nullable=True, comment='配置说明'),
        sa.Column('type', sa.String(length=20), nullable=False, server_default='string', comment='值类型: string/number/boolean/richtext'),
        sa.Column('updated_by', sa.UUID(), nullable=True, comment='更新人'),
        sa.Column('created_at', sa.Integer(), nullable=False, comment='创建时间'),
        sa.Column('updated_at', sa.Integer(), nullable=False, comment='更新时间'),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('key')
    )
    op.create_index(op.f('ix_system_configs_group'), 'system_configs', ['group'], unique=False)

    # --- ai_providers ---
    op.create_table('ai_providers',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('slug', sa.String(length=50), nullable=False, comment='标识符: volcano/deepseek/dify/openai'),
        sa.Column('name', sa.String(length=100), nullable=False, comment='显示名称'),
        sa.Column('provider_type', sa.String(length=50), nullable=False, comment='类型: openai/volcano/dify/custom'),
        sa.Column('config', JSONType(), nullable=True, comment='配置JSON: 含api_key/base_url/model等'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true', comment='是否启用'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0', comment='排序'),
        sa.Column('created_by', sa.UUID(), nullable=True, comment='创建人'),
        sa.Column('created_at', sa.Integer(), nullable=False, comment='创建时间'),
        sa.Column('updated_at', sa.Integer(), nullable=False, comment='更新时间'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_providers_id'), 'ai_providers', ['id'], unique=False)
    op.create_index(op.f('ix_ai_providers_slug'), 'ai_providers', ['slug'], unique=True)


def downgrade() -> None:
    # --- ai_providers ---
    op.drop_index(op.f('ix_ai_providers_slug'), table_name='ai_providers')
    op.drop_index(op.f('ix_ai_providers_id'), table_name='ai_providers')
    op.drop_table('ai_providers')

    # --- system_configs ---
    op.drop_index(op.f('ix_system_configs_group'), table_name='system_configs')
    op.drop_table('system_configs')

    # --- feedbacks ---
    op.drop_index('idx_feedback_user', table_name='feedbacks')
    op.drop_index('idx_feedback_status', table_name='feedbacks')
    op.drop_index(op.f('ix_feedbacks_id'), table_name='feedbacks')
    op.drop_table('feedbacks')

    # --- users: remove invite/checkin columns ---
    op.drop_constraint('fk_users_invited_by', 'users', type_='foreignkey')
    op.drop_index(op.f('ix_users_invited_by'), table_name='users')
    op.drop_index(op.f('ix_users_invite_code'), table_name='users')
    op.drop_column('users', 'total_checkin_days')
    op.drop_column('users', 'last_checkin_date')
    op.drop_column('users', 'checkin_streak')
    op.drop_column('users', 'invite_code')
    op.drop_column('users', 'invited_by')
