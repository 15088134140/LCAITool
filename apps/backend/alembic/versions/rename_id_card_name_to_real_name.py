"""Rename id_card_name to real_name in users and real_name_verifications

Revision ID: rename_id_card_name_to_real_name
Revises: a1513fffa107
Create Date: 2026-05-25

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'rename_id_card_name_to_real_name'
down_revision = 'a1513fffa107'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users 表
    op.alter_column('users', 'id_card_name', new_column_name='real_name')
    # real_name_verifications 表
    op.alter_column('real_name_verifications', 'id_card_name', new_column_name='real_name')


def downgrade() -> None:
    # real_name_verifications 表
    op.alter_column('real_name_verifications', 'real_name', new_column_name='id_card_name')
    # users 表
    op.alter_column('users', 'real_name', new_column_name='id_card_name')
