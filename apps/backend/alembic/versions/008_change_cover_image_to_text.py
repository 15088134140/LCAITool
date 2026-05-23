"""change cover_image from String(255) to Text

Revision ID: 008_change_cover_image_to_text
Revises: 007_add_tool_usage_modes
Create Date: 2026-05-23 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision = '008_change_cover_image_to_text'
down_revision = '007_add_tool_usage_modes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('tools', 'cover_image',
                    existing_type=sa.String(255),
                    type_=sa.Text,
                    existing_nullable=True,
                    existing_comment='封面图片URL',
                    postgresql_using='cover_image::text')


def downgrade() -> None:
    op.alter_column('tools', 'cover_image',
                    existing_type=sa.Text,
                    type_=sa.String(255),
                    existing_nullable=True,
                    existing_comment='封面图片URL，多张图片以 | 分隔')
