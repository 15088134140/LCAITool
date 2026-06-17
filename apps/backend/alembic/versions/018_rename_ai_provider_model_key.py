"""rename ai_providers.config.model -> text_model

Revision ID: 018_rename_ai_provider_model_key
Revises: 017_add_user_uploads
Create Date: 2026-06-17

"""
from typing import Sequence, Union
from alembic import op


revision: str = "018_rename_ai_provider_model_key"
down_revision: Union[str, None] = "017_add_user_uploads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """JSON 内 key 重命名 model -> text_model（仅当 model 存在时）"""
    op.execute(
        """
        UPDATE ai_providers
        SET config = jsonb_set(config::jsonb, '{text_model}', config::jsonb->'model') - 'model'
        WHERE config IS NOT NULL AND config::jsonb ? 'model';
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE ai_providers
        SET config = jsonb_set(config::jsonb, '{model}', config::jsonb->'text_model') - 'text_model'
        WHERE config IS NOT NULL AND config::jsonb ? 'text_model';
        """
    )
