"""add celery_task_id field to tasks table

Revision ID: 010_add_task_celery_task_id
Revises: 009_add_tool_is_mock_enabled
Create Date: 2026-05-25 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '010_add_task_celery_task_id'
down_revision: Union[str, None] = '009_add_tool_is_mock_enabled'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('celery_task_id', sa.String(255), nullable=True, index=True, comment='Celery任务ID，用于取消/终止'))


def downgrade() -> None:
    op.drop_column('tasks', 'celery_task_id')
