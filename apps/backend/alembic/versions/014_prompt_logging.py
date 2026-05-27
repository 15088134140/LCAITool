"""add is_prompt_logging_enabled to tools

Revision ID: 014_prompt_logging
Revises: 013_add_work_soft_delete
Create Date: 2026-05-27

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '014_prompt_logging'
down_revision: Union[str, None] = '013_add_work_soft_delete'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tools', sa.Column('is_prompt_logging_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false'), comment='是否记录提示词'))
    op.alter_column('tools', 'is_prompt_logging_enabled', server_default=None)


def downgrade() -> None:
    op.drop_column('tools', 'is_prompt_logging_enabled')
