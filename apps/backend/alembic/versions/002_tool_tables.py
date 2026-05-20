"""Add tool tables - tool_categories, tools, tool_favorites, tool_ratings, tool_demos

Revision ID: 002
Revises: 001
Create Date: 2026-05-20 00:00:00.000000

"""
import time
import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    now = int(time.time())

    # Tool Categories table
    op.create_table(
        'tool_categories',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('icon', sa.String(length=255), nullable=True),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, default=0),
        sa.Column('tool_count', sa.Integer(), nullable=False, default=0),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_featured', sa.Boolean(), nullable=False, default=False),
        sa.Column('parent_id', UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
        sa.UniqueConstraint('name'),
        sa.ForeignKeyConstraint(['parent_id'], ['tool_categories.id'], ondelete='SET NULL'),
    )
    op.create_index(op.f('ix_tool_categories_id'), 'tool_categories', ['id'], unique=False)
    op.create_index(op.f('ix_tool_categories_slug'), 'tool_categories', ['slug'], unique=True)
    op.create_index(op.f('ix_tool_categories_name'), 'tool_categories', ['name'], unique=True)
    op.create_index(op.f('ix_tool_categories_parent_id'), 'tool_categories', ['parent_id'], unique=False)

    # Tools table
    op.create_table(
        'tools',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('short_desc', sa.String(length=255), nullable=True),
        sa.Column('cover_image', sa.String(length=255), nullable=True),
        sa.Column('category_id', UUID(as_uuid=True), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('tags', sa.Text(), nullable=True),
        sa.Column('base_fee', sa.Integer(), nullable=False, default=0),
        sa.Column('image_fee', sa.Integer(), nullable=False, default=0),
        sa.Column('audio_fee', sa.Integer(), nullable=False, default=0),
        sa.Column('token_fee', sa.Integer(), nullable=False, default=0),
        sa.Column('config', JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.Integer(), nullable=False, default=1),
        sa.Column('use_count', sa.Integer(), nullable=False, default=0),
        sa.Column('favorite_count', sa.Integer(), nullable=False, default=0),
        sa.Column('rating_count', sa.Integer(), nullable=False, default=0),
        sa.Column('rating_avg', sa.Numeric(precision=2, scale=1), nullable=False, default=0.0),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
        sa.ForeignKeyConstraint(['category_id'], ['tool_categories.id'], ondelete='SET NULL'),
    )
    op.create_index(op.f('ix_tools_id'), 'tools', ['id'], unique=False)
    op.create_index(op.f('ix_tools_slug'), 'tools', ['slug'], unique=True)
    op.create_index(op.f('ix_tools_category_id'), 'tools', ['category_id'], unique=False)
    op.create_index(op.f('ix_tools_status'), 'tools', ['status'], unique=False)

    # Tool Favorites table
    op.create_table(
        'tool_favorites',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('tool_id', UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tool_id'], ['tools.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_tool_favorites_id'), 'tool_favorites', ['id'], unique=False)
    op.create_index(op.f('ix_tool_favorites_user_id'), 'tool_favorites', ['user_id'], unique=False)
    op.create_index(op.f('ix_tool_favorites_tool_id'), 'tool_favorites', ['tool_id'], unique=False)
    op.create_index('idx_favorite_user_tool', 'tool_favorites', ['user_id', 'tool_id'], unique=True)

    # Tool Ratings table
    op.create_table(
        'tool_ratings',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('tool_id', UUID(as_uuid=True), nullable=False),
        sa.Column('task_id', UUID(as_uuid=True), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('images', sa.Text(), nullable=True),
        sa.Column('is_useful_count', sa.Integer(), nullable=False, default=0),
        sa.Column('status', sa.Integer(), nullable=False, default=1),
        sa.Column('admin_reply', sa.Text(), nullable=True),
        sa.Column('replied_at', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tool_id'], ['tools.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_tool_ratings_id'), 'tool_ratings', ['id'], unique=False)
    op.create_index(op.f('ix_tool_ratings_user_id'), 'tool_ratings', ['user_id'], unique=False)
    op.create_index(op.f('ix_tool_ratings_tool_id'), 'tool_ratings', ['tool_id'], unique=False)
    op.create_index(op.f('ix_tool_ratings_task_id'), 'tool_ratings', ['task_id'], unique=True)

    # Tool Demos table
    op.create_table(
        'tool_demos',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('tool_id', UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('cover_image', sa.String(length=255), nullable=True),
        sa.Column('demo_type', sa.String(length=50), nullable=False, default='image'),
        sa.Column('demo_images', sa.Text(), nullable=True),
        sa.Column('input_params', JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('result_sample', JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, default=0),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_by', UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tool_id'], ['tools.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_tool_demos_id'), 'tool_demos', ['id'], unique=False)
    op.create_index(op.f('ix_tool_demos_tool_id'), 'tool_demos', ['tool_id'], unique=False)
    op.create_index(op.f('ix_tool_demos_sort_order'), 'tool_demos', ['sort_order'], unique=False)

    # Insert default tool categories
    tool_categories_table = sa.table(
        'tool_categories',
        sa.column('id', UUID(as_uuid=True)),
        sa.column('slug', sa.String()),
        sa.column('name', sa.String()),
        sa.column('description', sa.String()),
        sa.column('sort_order', sa.Integer()),
        sa.column('tool_count', sa.Integer()),
        sa.column('is_active', sa.Boolean()),
        sa.column('is_featured', sa.Boolean()),
        sa.column('created_at', sa.Integer()),
        sa.column('updated_at', sa.Integer()),
    )

    default_categories = [
        {
            'id': '00000000-0000-0000-0000-000000000101',
            'slug': 'content-creation',
            'name': '内容创作',
            'description': 'AI 内容创作相关工具',
            'sort_order': 1,
            'tool_count': 0,
            'is_active': True,
            'is_featured': True,
            'created_at': now,
            'updated_at': now,
        },
        {
            'id': '00000000-0000-0000-0000-000000000102',
            'slug': 'image-generation',
            'name': '图像生成',
            'description': 'AI 图像生成相关工具',
            'sort_order': 2,
            'tool_count': 0,
            'is_active': True,
            'is_featured': True,
            'created_at': now,
            'updated_at': now,
        },
        {
            'id': '00000000-0000-0000-0000-000000000103',
            'slug': 'audio-video',
            'name': '音视频处理',
            'description': 'AI 音视频处理相关工具',
            'sort_order': 3,
            'tool_count': 0,
            'is_active': True,
            'is_featured': False,
            'created_at': now,
            'updated_at': now,
        },
    ]

    op.bulk_insert(tool_categories_table, default_categories)

    # Insert default tools
    tools_table = sa.table(
        'tools',
        sa.column('id', UUID(as_uuid=True)),
        sa.column('slug', sa.String()),
        sa.column('name', sa.String()),
        sa.column('short_desc', sa.String()),
        sa.column('description', sa.Text()),
        sa.column('category_id', UUID(as_uuid=True)),
        sa.column('category', sa.String()),
        sa.column('base_fee', sa.Integer()),
        sa.column('image_fee', sa.Integer()),
        sa.column('audio_fee', sa.Integer()),
        sa.column('status', sa.Integer()),
        sa.column('created_at', sa.Integer()),
        sa.column('updated_at', sa.Integer()),
    )

    default_tools = [
        {
            'id': '00000000-0000-0000-0000-000000000201',
            'slug': 'storybook-generator',
            'name': '有声绘本生成',
            'short_desc': '一键生成精美有声绘本',
            'description': '基于 AI 的智能绘本生成工具，支持自定义主题、角色、风格等，生成图文并茂的有声绘本',
            'category_id': '00000000-0000-0000-0000-000000000101',
            'category': '内容创作',
            'base_fee': 10,
            'image_fee': 2,
            'audio_fee': 1,
            'status': 1,
            'created_at': now,
            'updated_at': now,
        },
    ]

    op.bulk_insert(tools_table, default_tools)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index(op.f('ix_tool_demos_sort_order'), table_name='tool_demos')
    op.drop_index(op.f('ix_tool_demos_tool_id'), table_name='tool_demos')
    op.drop_index(op.f('ix_tool_demos_id'), table_name='tool_demos')
    op.drop_table('tool_demos')

    op.drop_index(op.f('ix_tool_ratings_task_id'), table_name='tool_ratings')
    op.drop_index(op.f('ix_tool_ratings_tool_id'), table_name='tool_ratings')
    op.drop_index(op.f('ix_tool_ratings_user_id'), table_name='tool_ratings')
    op.drop_index(op.f('ix_tool_ratings_id'), table_name='tool_ratings')
    op.drop_table('tool_ratings')

    op.drop_index('idx_favorite_user_tool', table_name='tool_favorites')
    op.drop_index(op.f('ix_tool_favorites_tool_id'), table_name='tool_favorites')
    op.drop_index(op.f('ix_tool_favorites_user_id'), table_name='tool_favorites')
    op.drop_index(op.f('ix_tool_favorites_id'), table_name='tool_favorites')
    op.drop_table('tool_favorites')

    op.drop_index(op.f('ix_tools_status'), table_name='tools')
    op.drop_index(op.f('ix_tools_category_id'), table_name='tools')
    op.drop_index(op.f('ix_tools_slug'), table_name='tools')
    op.drop_index(op.f('ix_tools_id'), table_name='tools')
    op.drop_table('tools')

    op.drop_index(op.f('ix_tool_categories_parent_id'), table_name='tool_categories')
    op.drop_index(op.f('ix_tool_categories_name'), table_name='tool_categories')
    op.drop_index(op.f('ix_tool_categories_slug'), table_name='tool_categories')
    op.drop_index(op.f('ix_tool_categories_id'), table_name='tool_categories')
    op.drop_table('tool_categories')
