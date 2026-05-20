"""Add task tables - tasks, task_logs, works, work_files, work_shares

Revision ID: 003
Revises: 002
Create Date: 2026-05-20 00:00:00.000000

"""
import time
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Tasks table
    op.create_table(
        'tasks',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('tool_id', UUID(as_uuid=True), nullable=True),
        sa.Column('task_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, default='pending'),
        sa.Column('progress', sa.Integer(), nullable=False, default=0),
        sa.Column('progress_message', sa.String(length=255), nullable=True),
        sa.Column('snapshot_data', JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('input_params', JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('result_preview', sa.Text(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('estimated_cost', sa.Integer(), nullable=True),
        sa.Column('actual_cost', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.Integer(), nullable=True),
        sa.Column('completed_at', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_tasks_id'), 'tasks', ['id'], unique=False)
    op.create_index(op.f('ix_tasks_user_id'), 'tasks', ['user_id'], unique=False)
    op.create_index(op.f('ix_tasks_status'), 'tasks', ['status'], unique=False)

    # Task Logs table
    op.create_table(
        'task_logs',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('task_id', UUID(as_uuid=True), nullable=False),
        sa.Column('level', sa.String(length=20), nullable=False, default='info'),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('details', JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('timestamp', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_task_logs_id'), 'task_logs', ['id'], unique=False)
    op.create_index(op.f('ix_task_logs_task_id'), 'task_logs', ['task_id'], unique=False)

    # Works table
    op.create_table(
        'works',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('task_id', UUID(as_uuid=True), nullable=False),
        sa.Column('parent_id', UUID(as_uuid=True), nullable=True),
        sa.Column('tool_id', UUID(as_uuid=True), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False, default=1),
        sa.Column('cover_image', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, default='draft'),
        sa.Column('is_public', sa.Boolean(), nullable=False, default=False),
        sa.Column('view_count', sa.Integer(), nullable=False, default=0),
        sa.Column('like_count', sa.Integer(), nullable=False, default=0),
        sa.Column('share_count', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_id'], ['works.id'], ondelete='SET NULL'),
    )
    op.create_index(op.f('ix_works_id'), 'works', ['id'], unique=False)
    op.create_index(op.f('ix_works_user_id'), 'works', ['user_id'], unique=False)
    op.create_index(op.f('ix_works_task_id'), 'works', ['task_id'], unique=False)
    op.create_index(op.f('ix_works_parent_id'), 'works', ['parent_id'], unique=False)

    # Work Files table
    op.create_table(
        'work_files',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('work_id', UUID(as_uuid=True), nullable=False),
        sa.Column('file_type', sa.String(length=20), nullable=False, default='other'),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_url', sa.String(length=255), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('page_number', sa.Integer(), nullable=True),
        sa.Column('mime_type', sa.String(length=100), nullable=True),
        sa.Column('duration', sa.Integer(), nullable=True),
        sa.Column('is_preview', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['work_id'], ['works.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_work_files_id'), 'work_files', ['id'], unique=False)
    op.create_index(op.f('ix_work_files_work_id'), 'work_files', ['work_id'], unique=False)

    # Work Shares table
    op.create_table(
        'work_shares',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('work_id', UUID(as_uuid=True), nullable=False),
        sa.Column('share_type', sa.String(length=20), nullable=False, default='link'),
        sa.Column('share_url', sa.String(length=255), nullable=True),
        sa.Column('password', sa.String(length=50), nullable=True),
        sa.Column('expire_at', sa.Integer(), nullable=True),
        sa.Column('view_count', sa.Integer(), nullable=False, default=0),
        sa.Column('like_count', sa.Integer(), nullable=False, default=0),
        sa.Column('comment_count', sa.Integer(), nullable=False, default=0),
        sa.Column('status', sa.String(length=20), nullable=False, default='pending'),
        sa.Column('reviewed_by', UUID(as_uuid=True), nullable=True),
        sa.Column('reviewed_at', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['work_id'], ['works.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_work_shares_id'), 'work_shares', ['id'], unique=False)
    op.create_index(op.f('ix_work_shares_work_id'), 'work_shares', ['work_id'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index(op.f('ix_work_shares_work_id'), table_name='work_shares')
    op.drop_index(op.f('ix_work_shares_id'), table_name='work_shares')
    op.drop_table('work_shares')

    op.drop_index(op.f('ix_work_files_work_id'), table_name='work_files')
    op.drop_index(op.f('ix_work_files_id'), table_name='work_files')
    op.drop_table('work_files')

    op.drop_index(op.f('ix_works_parent_id'), table_name='works')
    op.drop_index(op.f('ix_works_task_id'), table_name='works')
    op.drop_index(op.f('ix_works_user_id'), table_name='works')
    op.drop_index(op.f('ix_works_id'), table_name='works')
    op.drop_table('works')

    op.drop_index(op.f('ix_task_logs_task_id'), table_name='task_logs')
    op.drop_index(op.f('ix_task_logs_id'), table_name='task_logs')
    op.drop_table('task_logs')

    op.drop_index(op.f('ix_tasks_status'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_user_id'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_id'), table_name='tasks')
    op.drop_table('tasks')
