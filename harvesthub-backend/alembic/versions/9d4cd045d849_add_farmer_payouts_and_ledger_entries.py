"""add farmer payouts and ledger entries

Revision ID: 9d4cd045d849
Revises: d8063aca63de
Create Date: 2026-09-12 17:42:28.500392

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d4cd045d849'
down_revision: Union[str, Sequence[str], None] = 'd8063aca63de'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Mirror farmer_payouts / farmer_ledger_entries, added by
    0015_farmer_payouts.sql. Same raw CREATE TABLE IF NOT EXISTS discipline
    as every prior revision — safe whether or not that Supabase SQL
    migration already ran. Constraints/indexes/RLS/triggers/the pg_cron
    sweep function are NOT mirrored here (same "narrow column view only"
    rule as every other revision) — that logic lives only in the Supabase
    SQL migration."""
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS farmer_payouts (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          farmer_id uuid NOT NULL,
          pay_period_start date NOT NULL,
          pay_period_end date NOT NULL,
          gross_total numeric(10, 2) NOT NULL DEFAULT 0,
          commission_total numeric(10, 2) NOT NULL DEFAULT 0,
          net_total numeric(10, 2) NOT NULL DEFAULT 0,
          status text NOT NULL DEFAULT 'pending_disbursement',
          disbursed_at timestamptz,
          disbursed_note text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS farmer_ledger_entries (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          farmer_id uuid NOT NULL,
          store_order_id uuid NOT NULL,
          entry_type text NOT NULL DEFAULT 'order',
          gross_amount numeric(10, 2) NOT NULL,
          commission_rate numeric(5, 4) NOT NULL,
          commission_amount numeric(10, 2) NOT NULL,
          net_amount numeric(10, 2) NOT NULL,
          pay_period_start date NOT NULL,
          pay_period_end date NOT NULL,
          status text NOT NULL DEFAULT 'open',
          payout_id uuid,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS farmer_ledger_entries")
    op.execute("DROP TABLE IF EXISTS farmer_payouts")
