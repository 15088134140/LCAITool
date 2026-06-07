"""add pricing_schema to tools

Revision ID: 016_add_pricing_schema_to_tools
Revises: 015_add_executor_key_to_tools
Create Date: 2026-06-07

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "016_add_pricing_schema_to_tools"
down_revision: Union[str, None] = "015_add_executor_key_to_tools"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tools", sa.Column("pricing_schema", sa.JSON, nullable=True, comment="工具计价规则配置"))


def downgrade() -> None:
    op.drop_column("tools", "pricing_schema")
