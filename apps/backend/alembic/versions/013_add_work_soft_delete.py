"""add is_deleted and deleted_at to works

Revision ID: 013_add_work_soft_delete
Revises: dd91312939e6
Create Date: 2026-05-27
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "013_add_work_soft_delete"
down_revision: Union[str, None] = "dd91312939e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("works", sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False, comment="软删除标记"))
    op.add_column("works", sa.Column("deleted_at", sa.Integer(), nullable=True, comment="删除时间戳"))
    op.create_index("ix_works_is_deleted", "works", ["is_deleted"])


def downgrade() -> None:
    op.drop_index("ix_works_is_deleted", table_name="works")
    op.drop_column("works", "deleted_at")
    op.drop_column("works", "is_deleted")
