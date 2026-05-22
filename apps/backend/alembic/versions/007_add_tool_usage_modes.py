"""add usage_modes to tools

Revision ID: 007_add_tool_usage_modes
Revises: 006
Create Date: 2026-05-22 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision = '007_add_tool_usage_modes'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tools', sa.Column('usage_modes', JSON, nullable=True,
                                     comment='使用模式，JSON数组：["form", "dialog"]'))


def downgrade() -> None:
    op.drop_column('tools', 'usage_modes')
