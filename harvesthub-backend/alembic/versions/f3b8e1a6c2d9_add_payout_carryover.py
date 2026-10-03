"""add payout carry-over columns

Revision ID: f3b8e1a6c2d9
Revises: e9a2d5c71f04
Create Date: 2026-10-03 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3b8e1a6c2d9'
down_revision: Union[str, Sequence[str], None] = 'e9a2d5c71f04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Mirror the two columns added by 0026_payout_carryover.sql. Same raw
    IF NOT EXISTS discipline as every prior revision — the status constraint,
    FK, and replaced sweep function live only in the Supabase SQL migration."""
    op.execute(
        "ALTER TABLE farmer_payouts ADD COLUMN IF NOT EXISTS carried_in_total numeric(10, 2) NOT NULL DEFAULT 0"
    )
    op.execute("ALTER TABLE farmer_payouts ADD COLUMN IF NOT EXISTS carried_into_payout_id uuid")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE farmer_payouts DROP COLUMN IF EXISTS carried_into_payout_id")
    op.execute("ALTER TABLE farmer_payouts DROP COLUMN IF EXISTS carried_in_total")
