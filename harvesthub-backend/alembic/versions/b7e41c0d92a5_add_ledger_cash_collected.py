"""add ledger cash_collected for cash-on-pickup orders

Revision ID: b7e41c0d92a5
Revises: 31fe19279035
Create Date: 2026-10-03 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e41c0d92a5'
down_revision: Union[str, Sequence[str], None] = '31fe19279035'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Mirror the two columns added by 0021_cash_on_pickup_ledger.sql.
    Same raw IF NOT EXISTS discipline as every prior revision — the
    replaced sweep function lives only in the Supabase SQL migration.
    (0020_restrict_public_reads.sql is RLS-only, so it has no mirror.)"""
    op.execute(
        "ALTER TABLE farmer_ledger_entries ADD COLUMN IF NOT EXISTS cash_collected numeric(10, 2) NOT NULL DEFAULT 0"
    )
    op.execute(
        "ALTER TABLE farmer_payouts ADD COLUMN IF NOT EXISTS cash_collected_total numeric(10, 2) NOT NULL DEFAULT 0"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE farmer_payouts DROP COLUMN IF EXISTS cash_collected_total")
    op.execute("ALTER TABLE farmer_ledger_entries DROP COLUMN IF EXISTS cash_collected")
