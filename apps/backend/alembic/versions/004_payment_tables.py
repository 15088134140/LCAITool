"""Add payment tables - orders, recharge_packages, updated point_transactions

Revision ID: 004
Revises: 003
Create Date: 2026-05-20 00:00:00.000000

"""
import time
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID


# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # First, drop the old point_transactions table
    op.drop_table('point_transactions')

    # Create recharge_packages table
    op.create_table(
        'recharge_packages',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('original_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('sale_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('base_points', sa.Integer(), nullable=False),
        sa.Column('bonus_points', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('bonus_percentage', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_popular', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_recharge_packages_id'), 'recharge_packages', ['id'], unique=False)
    op.create_index(op.f('ix_recharge_packages_sort_order'), 'recharge_packages', ['sort_order'], unique=False)
    op.create_index(op.f('ix_recharge_packages_is_active'), 'recharge_packages', ['is_active'], unique=False)

    # Create orders table
    op.create_table(
        'orders',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('order_no', sa.String(length=64), nullable=False),
        sa.Column('third_party_order_no', sa.String(length=128), nullable=True),
        sa.Column('pay_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('base_points', sa.Integer(), nullable=False),
        sa.Column('bonus_points', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_points', sa.Integer(), nullable=False),
        sa.Column('payment_provider', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('paid_at', sa.Integer(), nullable=True),
        sa.Column('expired_at', sa.Integer(), nullable=True),
        sa.Column('client_ip', sa.String(length=50), nullable=True),
        sa.Column('device_info', sa.String(length=255), nullable=True),
        sa.Column('callback_raw', JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('reconciliation_status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('reconciled_at', sa.Integer(), nullable=True),
        sa.Column('remark', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('order_no'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_orders_id'), 'orders', ['id'], unique=False)
    op.create_index(op.f('ix_orders_user_id'), 'orders', ['user_id'], unique=False)
    op.create_index(op.f('ix_orders_order_no'), 'orders', ['order_no'], unique=True)
    op.create_index(op.f('ix_orders_status'), 'orders', ['status'], unique=False)
    op.create_index(op.f('ix_orders_created_at'), 'orders', ['created_at'], unique=False)
    op.create_index(op.f('ix_orders_third_party_order_no'), 'orders', ['third_party_order_no'], unique=False)

    # Create new point_transactions table
    op.create_table(
        'point_transactions',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.Column('related_id', sa.String(length=100), nullable=True),
        sa.Column('related_type', sa.String(length=50), nullable=True),
        sa.Column('idempotency_key', sa.String(length=128), nullable=True),
        sa.Column('balance_before', sa.Integer(), nullable=False),
        sa.Column('balance_after', sa.Integer(), nullable=False),
        sa.Column('operator', sa.String(length=100), nullable=True),
        sa.Column('remark', sa.String(length=500), nullable=True),
        sa.Column('order_id', UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('idempotency_key'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='SET NULL'),
    )
    op.create_index(op.f('ix_point_transactions_id'), 'point_transactions', ['id'], unique=False)
    op.create_index(op.f('ix_point_transactions_user_id'), 'point_transactions', ['user_id'], unique=False)
    op.create_index(op.f('ix_point_transactions_type'), 'point_transactions', ['type'], unique=False)
    op.create_index(op.f('ix_point_transactions_idempotency_key'), 'point_transactions', ['idempotency_key'], unique=True)
    op.create_index(op.f('ix_point_transactions_created_at'), 'point_transactions', ['created_at'], unique=False)
    op.create_index(op.f('ix_point_transactions_related'), 'point_transactions', ['related_id', 'related_type'], unique=False)
    op.create_index(op.f('ix_point_transactions_order_id'), 'point_transactions', ['order_id'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index(op.f('ix_point_transactions_order_id'), table_name='point_transactions')
    op.drop_index(op.f('ix_point_transactions_related'), table_name='point_transactions')
    op.drop_index(op.f('ix_point_transactions_created_at'), table_name='point_transactions')
    op.drop_index(op.f('ix_point_transactions_idempotency_key'), table_name='point_transactions')
    op.drop_index(op.f('ix_point_transactions_type'), table_name='point_transactions')
    op.drop_index(op.f('ix_point_transactions_user_id'), table_name='point_transactions')
    op.drop_index(op.f('ix_point_transactions_id'), table_name='point_transactions')
    op.drop_table('point_transactions')

    op.drop_index(op.f('ix_orders_third_party_order_no'), table_name='orders')
    op.drop_index(op.f('ix_orders_created_at'), table_name='orders')
    op.drop_index(op.f('ix_orders_status'), table_name='orders')
    op.drop_index(op.f('ix_orders_order_no'), table_name='orders')
    op.drop_index(op.f('ix_orders_user_id'), table_name='orders')
    op.drop_index(op.f('ix_orders_id'), table_name='orders')
    op.drop_table('orders')

    op.drop_index(op.f('ix_recharge_packages_is_active'), table_name='recharge_packages')
    op.drop_index(op.f('ix_recharge_packages_sort_order'), table_name='recharge_packages')
    op.drop_index(op.f('ix_recharge_packages_id'), table_name='recharge_packages')
    op.drop_table('recharge_packages')

    # Recreate old point_transactions table
    op.create_table(
        'point_transactions',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.Column('related_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_point_transactions_id'), 'point_transactions', ['id'], unique=False)
