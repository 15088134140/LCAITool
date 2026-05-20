"""Add system tables - real_name_verifications, idea_submissions, idea_votes, admin_audit_logs

Revision ID: 005
Revises: 004
Create Date: 2026-05-20 00:00:00.000000

"""
import time
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID


# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Real Name Verifications table
    op.create_table(
        'real_name_verifications',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('id_card_name', sa.String(length=50), nullable=False),
        sa.Column('id_card_number_encrypted', sa.String(length=255), nullable=False),
        sa.Column('id_card_hash', sa.String(length=64), nullable=False),
        sa.Column('front_image', sa.String(length=255), nullable=True),
        sa.Column('back_image', sa.String(length=255), nullable=True),
        sa.Column('hold_image', sa.String(length=255), nullable=True),
        sa.Column('verification_status', sa.String(length=20), nullable=False, default='pending'),
        sa.Column('review_remark', sa.String(length=500), nullable=True),
        sa.Column('reviewer_id', UUID(as_uuid=True), nullable=True),
        sa.Column('reviewed_at', sa.Integer(), nullable=True),
        sa.Column('submitted_at', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index(op.f('ix_real_name_verifications_id'), 'real_name_verifications', ['id'], unique=False)
    op.create_index(op.f('ix_real_name_verifications_user_id'), 'real_name_verifications', ['user_id'], unique=False)
    op.create_index(op.f('ix_real_name_verifications_id_card_hash'), 'real_name_verifications', ['id_card_hash'], unique=False)
    op.create_index(op.f('ix_real_name_verifications_verification_status'), 'real_name_verifications', ['verification_status'], unique=False)
    op.create_index('idx_real_name_user_status', 'real_name_verifications', ['user_id', 'verification_status'])

    # Idea Submissions table
    op.create_table(
        'idea_submissions',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('cover_image', sa.String(length=255), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('tags', sa.Text(), nullable=True),
        sa.Column('contact_info', sa.String(length=200), nullable=True),
        sa.Column('vote_count', sa.Integer(), nullable=False, default=0),
        sa.Column('view_count', sa.Integer(), nullable=False, default=0),
        sa.Column('status', sa.String(length=20), nullable=False, default='pending'),
        sa.Column('admin_remark', sa.String(length=500), nullable=True),
        sa.Column('admin_id', UUID(as_uuid=True), nullable=True),
        sa.Column('reviewed_at', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['admin_id'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index(op.f('ix_idea_submissions_id'), 'idea_submissions', ['id'], unique=False)
    op.create_index(op.f('ix_idea_submissions_user_id'), 'idea_submissions', ['user_id'], unique=False)
    op.create_index(op.f('ix_idea_submissions_category'), 'idea_submissions', ['category'], unique=False)
    op.create_index(op.f('ix_idea_submissions_status'), 'idea_submissions', ['status'], unique=False)
    op.create_index('idx_idea_category_status', 'idea_submissions', ['category', 'status'])

    # Idea Votes table
    op.create_table(
        'idea_votes',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('idea_id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('vote_type', sa.String(length=10), nullable=False, default='up'),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['idea_id'], ['idea_submissions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('idea_id', 'user_id', name='uq_idea_user_vote'),
    )
    op.create_index(op.f('ix_idea_votes_id'), 'idea_votes', ['id'], unique=False)
    op.create_index(op.f('ix_idea_votes_idea_id'), 'idea_votes', ['idea_id'], unique=False)
    op.create_index(op.f('ix_idea_votes_user_id'), 'idea_votes', ['user_id'], unique=False)
    op.create_index('idx_idea_vote_type', 'idea_votes', ['idea_id', 'vote_type'])

    # Admin Audit Logs table
    op.create_table(
        'admin_audit_logs',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('admin_id', UUID(as_uuid=True), nullable=True),
        sa.Column('action_type', sa.String(length=50), nullable=False),
        sa.Column('target_type', sa.String(length=50), nullable=True),
        sa.Column('target_id', sa.String(length=100), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('request_data', JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('response_data', JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False, default=True),
        sa.Column('error_message', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['admin_id'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index(op.f('ix_admin_audit_logs_id'), 'admin_audit_logs', ['id'], unique=False)
    op.create_index(op.f('ix_admin_audit_logs_admin_id'), 'admin_audit_logs', ['admin_id'], unique=False)
    op.create_index(op.f('ix_admin_audit_logs_action_type'), 'admin_audit_logs', ['action_type'], unique=False)
    op.create_index(op.f('ix_admin_audit_logs_target_type'), 'admin_audit_logs', ['target_type'], unique=False)
    op.create_index(op.f('ix_admin_audit_logs_target_id'), 'admin_audit_logs', ['target_id'], unique=False)
    op.create_index(op.f('ix_admin_audit_logs_success'), 'admin_audit_logs', ['success'], unique=False)
    op.create_index('idx_audit_admin_action', 'admin_audit_logs', ['admin_id', 'action_type'])
    op.create_index('idx_audit_target', 'admin_audit_logs', ['target_type', 'target_id'])
    op.create_index('idx_audit_created_at', 'admin_audit_logs', ['created_at'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index('idx_audit_created_at', table_name='admin_audit_logs')
    op.drop_index('idx_audit_target', table_name='admin_audit_logs')
    op.drop_index('idx_audit_admin_action', table_name='admin_audit_logs')
    op.drop_index(op.f('ix_admin_audit_logs_success'), table_name='admin_audit_logs')
    op.drop_index(op.f('ix_admin_audit_logs_target_id'), table_name='admin_audit_logs')
    op.drop_index(op.f('ix_admin_audit_logs_target_type'), table_name='admin_audit_logs')
    op.drop_index(op.f('ix_admin_audit_logs_action_type'), table_name='admin_audit_logs')
    op.drop_index(op.f('ix_admin_audit_logs_admin_id'), table_name='admin_audit_logs')
    op.drop_index(op.f('ix_admin_audit_logs_id'), table_name='admin_audit_logs')
    op.drop_table('admin_audit_logs')

    op.drop_index('idx_idea_vote_type', table_name='idea_votes')
    op.drop_index(op.f('ix_idea_votes_user_id'), table_name='idea_votes')
    op.drop_index(op.f('ix_idea_votes_idea_id'), table_name='idea_votes')
    op.drop_index(op.f('ix_idea_votes_id'), table_name='idea_votes')
    op.drop_table('idea_votes')

    op.drop_index('idx_idea_category_status', table_name='idea_submissions')
    op.drop_index(op.f('ix_idea_submissions_status'), table_name='idea_submissions')
    op.drop_index(op.f('ix_idea_submissions_category'), table_name='idea_submissions')
    op.drop_index(op.f('ix_idea_submissions_user_id'), table_name='idea_submissions')
    op.drop_index(op.f('ix_idea_submissions_id'), table_name='idea_submissions')
    op.drop_table('idea_submissions')

    op.drop_index('idx_real_name_user_status', table_name='real_name_verifications')
    op.drop_index(op.f('ix_real_name_verifications_verification_status'), table_name='real_name_verifications')
    op.drop_index(op.f('ix_real_name_verifications_id_card_hash'), table_name='real_name_verifications')
    op.drop_index(op.f('ix_real_name_verifications_user_id'), table_name='real_name_verifications')
    op.drop_index(op.f('ix_real_name_verifications_id'), table_name='real_name_verifications')
    op.drop_table('real_name_verifications')
