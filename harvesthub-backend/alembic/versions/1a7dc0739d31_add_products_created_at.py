"""add products created_at

Revision ID: 1a7dc0739d31
Revises: 13b5a09ea030
Create Date: 2026-09-14 06:22:02.978572

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1a7dc0739d31'
down_revision: Union[str, Sequence[str], None] = '13b5a09ea030'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Mirror products.created_at, added by
    0017_product_created_at_and_harvest.sql."""
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE products DROP COLUMN IF EXISTS created_at")
