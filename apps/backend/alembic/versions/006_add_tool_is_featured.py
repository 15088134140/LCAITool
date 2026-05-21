"""Add is_featured column to tools table

Revision ID: 006
Revises: cb73fdd10709
Create Date: 2026-05-21 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006'
down_revision = 'cb73fdd10709'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tools',
        sa.Column('is_featured', sa.Boolean(), nullable=False,
                  server_default=sa.text('false'),
                  comment='是否推荐展示在首页精品工具')
    )


def downgrade() -> None:
    op.drop_column('tools', 'is_featured')
