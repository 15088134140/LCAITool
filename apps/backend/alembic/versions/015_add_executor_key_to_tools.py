"""add executor_key to tools

Revision ID: 015_add_executor_key_to_tools
Revises: 014_prompt_logging
Create Date: 2026-06-07

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "015_add_executor_key_to_tools"
down_revision: Union[str, None] = "014_prompt_logging"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tools", sa.Column("executor_key", sa.String(100), nullable=True, comment="执行器Key，为空时回退slug/task_type"))
    op.create_index(op.f("ix_tools_executor_key"), "tools", ["executor_key"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_tools_executor_key"), table_name="tools")
    op.drop_column("tools", "executor_key")
