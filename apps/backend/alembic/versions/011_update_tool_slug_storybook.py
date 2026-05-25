"""update tool slug from ai-storybook to storybook-generator

Revision ID: 011_update_tool_slug_storybook
Revises: 010_add_task_celery_task_id
Create Date: 2026-05-25 13:30:00.000000

"""
from typing import Sequence, Union
from alembic import op


# revision identifiers, used by Alembic.
revision: str = '011_update_tool_slug_storybook'
down_revision: Union[str, None] = '010_add_task_celery_task_id'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "UPDATE tools SET slug = 'storybook-generator' "
        "WHERE slug = 'ai-storybook'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE tools SET slug = 'ai-storybook' "
        "WHERE slug = 'storybook-generator'"
    )
