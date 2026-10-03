"""add store order release timestamp and ledger cancellation fees

Revision ID: e9a2d5c71f04
Revises: b7e41c0d92a5
Create Date: 2026-10-03 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e9a2d5c71f04'
down_revision: Union[str, Sequence[str], None] = 'b7e41c0d92a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Mirror the three columns added by 0025_farmer_order_fulfillment.sql.
    Same raw IF NOT EXISTS discipline as every prior revision — the status
    constraint, entry_type constraint, indexes, backfill, and replaced sweep
    function live only in the Supabase SQL migration. (0024_farmer_products.sql
    only drops an RLS policy, so it has no mirror.) profiles.full_name/phone
    have existed since 0001 — mirrored here only because the Profile model
    now maps them, same bookkeeping purpose as c8d31f6a9e02."""
    op.execute("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name text")
    op.execute("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text")
    op.execute("ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS released_to_farmer_at timestamptz")
    op.execute(
        "ALTER TABLE farmer_ledger_entries ADD COLUMN IF NOT EXISTS fee_amount numeric(10, 2) NOT NULL DEFAULT 0"
    )
    op.execute("ALTER TABLE farmer_payouts ADD COLUMN IF NOT EXISTS fee_total numeric(10, 2) NOT NULL DEFAULT 0")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE farmer_payouts DROP COLUMN IF EXISTS fee_total")
    op.execute("ALTER TABLE farmer_ledger_entries DROP COLUMN IF EXISTS fee_amount")
    op.execute("ALTER TABLE store_orders DROP COLUMN IF EXISTS released_to_farmer_at")
