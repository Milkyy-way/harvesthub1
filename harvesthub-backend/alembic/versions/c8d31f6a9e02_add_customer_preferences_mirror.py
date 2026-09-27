"""mirror customer_profiles preference columns for the dashboard/account tabs

Revision ID: c8d31f6a9e02
Revises: 9a4b6e2c7f31
Create Date: 2026-09-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8d31f6a9e02'
down_revision: Union[str, Sequence[str], None] = '9a4b6e2c7f31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """These columns have existed since 0003_customer_profiles.sql — this
    is a pure Alembic-bookkeeping mirror (same as 7c2a91f5e8b4's farm_types/
    years_in_operation), not a real schema change. FastAPI's CustomerProfile
    model just never mapped them until the Account tab needed to display
    them. Safe no-op against a database where they already exist."""
    op.execute(
        """
        ALTER TABLE customer_profiles
          ADD COLUMN IF NOT EXISTS dietary_preferences text[],
          ADD COLUMN IF NOT EXISTS produce_interests text[]
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        """
        ALTER TABLE customer_profiles
          DROP COLUMN IF EXISTS produce_interests,
          DROP COLUMN IF EXISTS dietary_preferences
        """
    )
