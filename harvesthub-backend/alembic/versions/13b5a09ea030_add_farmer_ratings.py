"""add farmer ratings

Revision ID: 13b5a09ea030
Revises: 9d4cd045d849
Create Date: 2026-09-14 05:48:51.486283

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '13b5a09ea030'
down_revision: Union[str, Sequence[str], None] = '9d4cd045d849'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Mirror farmer_ratings, added by 0016_farmer_ratings.sql. Same raw
    CREATE TABLE IF NOT EXISTS discipline as every prior revision —
    constraints/RLS/triggers live only in the Supabase SQL migration."""
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS farmer_ratings (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          customer_id uuid NOT NULL,
          farmer_id uuid NOT NULL,
          store_order_id uuid NOT NULL,
          rating integer NOT NULL,
          comment text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS farmer_ratings")
