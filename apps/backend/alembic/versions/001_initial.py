"""Initial migration - create users, roles, point_transactions tables

Revision ID: 001
Revises:
Create Date: 2026-01-01 00:00:00.000000

"""
import time
import uuid
from alembic import op
import sqlalchemy as sa
import bcrypt


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def get_password_hash(password: str) -> str:
    """生成bcrypt密码哈希"""
    truncated_password = password[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(truncated_password.encode('utf-8'), salt).decode('utf-8')


def upgrade() -> None:
    now = int(time.time())
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('openid', sa.String(length=100), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('email', sa.String(length=100), nullable=True),
        sa.Column('nickname', sa.String(length=50), nullable=True),
        sa.Column('avatar', sa.String(length=255), nullable=True),
        sa.Column('password_hash', sa.String(length=255), nullable=True),
        sa.Column('id_card_name', sa.String(length=50), nullable=True),
        sa.Column('id_card_number_encrypted', sa.String(length=255), nullable=True),
        sa.Column('id_card_verified', sa.Boolean(), nullable=False, default=False),
        sa.Column('balance', sa.Integer(), nullable=False, default=0),
        sa.Column('frozen_balance', sa.Integer(), nullable=False, default=0),
        sa.Column('status', sa.Integer(), nullable=False, default=1),
        sa.Column('version', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('openid'),
        sa.UniqueConstraint('phone'),
        sa.UniqueConstraint('email'),
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_openid'), 'users', ['openid'], unique=True)
    op.create_index(op.f('ix_users_phone'), 'users', ['phone'], unique=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Roles table
    op.create_table(
        'roles',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('permissions', sa.Text(), nullable=True),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index(op.f('ix_roles_id'), 'roles', ['id'], unique=False)
    op.create_index(op.f('ix_roles_name'), 'roles', ['name'], unique=True)

    # User roles association table
    op.create_table(
        'user_roles',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('role_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'role_id'),
    )

    # Point transactions table
    op.create_table(
        'point_transactions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.Column('related_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_point_transactions_id'), 'point_transactions', ['id'], unique=False)
    op.create_index(op.f('ix_point_transactions_user_id'), 'point_transactions', ['user_id'], unique=False)

    # Get table references for bulk inserts
    roles_table = sa.table(
        'roles',
        sa.column('id', sa.UUID()),
        sa.column('name', sa.String()),
        sa.column('description', sa.String()),
        sa.column('created_at', sa.Integer()),
        sa.column('updated_at', sa.Integer()),
    )

    users_table = sa.table(
        'users',
        sa.column('id', sa.UUID()),
        sa.column('nickname', sa.String()),
        sa.column('email', sa.String()),
        sa.column('password_hash', sa.String()),
        sa.column('balance', sa.Integer()),
        sa.column('status', sa.Integer()),
        sa.column('created_at', sa.Integer()),
        sa.column('updated_at', sa.Integer()),
    )

    user_roles_table = sa.table(
        'user_roles',
        sa.column('user_id', sa.UUID()),
        sa.column('role_id', sa.UUID()),
    )

    # Insert default admin role
    op.bulk_insert(
        roles_table,
        [
            {
                'id': '00000000-0000-0000-0000-000000000001',
                'name': 'admin',
                'description': '系统管理员',
                'created_at': now,
                'updated_at': now,
            }
        ]
    )

    # Insert default admin user
    admin_password_hash = get_password_hash("admin123")
    admin_user_id = str(uuid.uuid4())
    op.bulk_insert(
        users_table,
        [
            {
                'id': admin_user_id,
                'nickname': 'admin',
                'email': 'admin@lcaitool.com',
                'password_hash': admin_password_hash,
                'balance': 1000,
                'status': 1,
                'created_at': now,
                'updated_at': now,
            }
        ]
    )

    # Assign admin role to admin user
    op.bulk_insert(
        user_roles_table,
        [
            {
                'user_id': admin_user_id,
                'role_id': '00000000-0000-0000-0000-000000000001',
            }
        ]
    )

    # Insert test user
    test_password_hash = get_password_hash("test123")
    test_user_id = str(uuid.uuid4())
    op.bulk_insert(
        users_table,
        [
            {
                'id': test_user_id,
                'nickname': 'testuser',
                'email': 'test@lcaitool.com',
                'password_hash': test_password_hash,
                'balance': 100,
                'status': 1,
                'created_at': now,
                'updated_at': now,
            }
        ]
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_point_transactions_user_id'), table_name='point_transactions')
    op.drop_index(op.f('ix_point_transactions_id'), table_name='point_transactions')
    op.drop_table('point_transactions')
    op.drop_table('user_roles')
    op.drop_index(op.f('ix_roles_name'), table_name='roles')
    op.drop_index(op.f('ix_roles_id'), table_name='roles')
    op.drop_table('roles')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_phone'), table_name='users')
    op.drop_index(op.f('ix_users_openid'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')
