"""add user_uploads table

Revision ID: 017_add_user_uploads
Revises: 016_add_pricing_schema_to_tools
Create Date: 2026-06-07

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = "017_add_user_uploads"
down_revision: Union[str, None] = "016_add_pricing_schema_to_tools"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_uploads",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tool_id", UUID(as_uuid=True), nullable=True),
        sa.Column("field_key", sa.String(100), nullable=True),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("file_path", sa.Text, nullable=False),
        sa.Column("file_size", sa.Integer, nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("created_at", sa.Integer, nullable=True),
        sa.Column("updated_at", sa.Integer, nullable=True),
    )
    op.create_index("ix_user_uploads_id", "user_uploads", ["id"])
    op.create_index("idx_upload_user_id", "user_uploads", ["user_id"])
    op.create_index("idx_upload_tool_id", "user_uploads", ["tool_id"])


def downgrade() -> None:
    op.drop_table("user_uploads")
