"""add product tax category

Revision ID: d8063aca63de
Revises: c8d31f6a9e02
Create Date: 2026-09-12 17:42:08.213269

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8063aca63de'
down_revision: Union[str, Sequence[str], None] = 'c8d31f6a9e02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Mirror the new products.tax_category column (raw/prepared) added by
    0014_product_tax_category.sql — same raw IF NOT EXISTS discipline as
    every prior revision. The check constraint lives only in the Supabase
    SQL migration, not mirrored here (same "narrow column view only" rule
    as every other revision — Alembic's job is just giving FastAPI's
    SQLAlchemy models a correct view of the columns they map)."""
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_category text NOT NULL DEFAULT 'raw'")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE products DROP COLUMN IF EXISTS tax_category")
