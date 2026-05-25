"""add is_mock_enabled field to tools table

Revision ID: 009_add_tool_is_mock_enabled
Revises: rename_id_card_name_to_real_name
Create Date: 2026-05-25 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '009_add_tool_is_mock_enabled'
down_revision: Union[str, None] = 'rename_id_card_name_to_real_name'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tools', sa.Column('is_mock_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false'), comment='是否启用Mock执行模式'))
    op.alter_column('tools', 'is_mock_enabled', server_default=None)


def downgrade() -> None:
    op.drop_column('tools', 'is_mock_enabled')
