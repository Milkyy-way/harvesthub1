"""add promo_codes

Revision ID: e3f7a1c9d2b6
Revises: 7c2a91f5e8b4
Create Date: 2026-09-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3f7a1c9d2b6'
down_revision: Union[str, Sequence[str], None] = '7c2a91f5e8b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema. Same raw IF NOT EXISTS discipline as prior
    revisions — safe whether or not 0012_promo_codes.sql already ran."""
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS promo_codes (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          farmer_id uuid NOT NULL,
          code text NOT NULL,
          discount_type text NOT NULL,
          discount_value numeric(10, 2) NOT NULL,
          min_order_amount numeric(10, 2),
          max_discount_amount numeric(10, 2),
          usage_limit integer,
          times_used integer NOT NULL DEFAULT 0,
          is_active boolean NOT NULL DEFAULT true,
          starts_at timestamptz,
          expires_at timestamptz
        )
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS promo_codes")
