"""add categories products farmer geo photo

Revision ID: 14e2f8ac5990
Revises: 3be435d216d9
Create Date: 2026-08-29 17:15:58.503441

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '14e2f8ac5990'
down_revision: Union[str, Sequence[str], None] = '3be435d216d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Written as raw ``IF NOT EXISTS`` SQL, not op.add_column/op.create_table,
    so this is safe to run whether or not the equivalent Supabase SQL
    migrations (0008/0009 in harvesthub/supabase/migrations/) have already
    been applied to this same database — those are the real schema source
    of truth; this migration exists only for Alembic's own bookkeeping and
    to give FastAPI's SQLAlchemy models a narrower, intentionally partial
    view of the tables (see app/farmers/models.py, app/products/models.py,
    app/categories/models.py — same "don't mirror every column" discipline
    as CustomerProfile).
    """
    op.execute(
        """
        ALTER TABLE farmer_profiles
          ADD COLUMN IF NOT EXISTS latitude double precision,
          ADD COLUMN IF NOT EXISTS longitude double precision,
          ADD COLUMN IF NOT EXISTS geocoded_at timestamptz,
          ADD COLUMN IF NOT EXISTS photo_url text
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS categories (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          slug text NOT NULL UNIQUE,
          name text NOT NULL,
          sort_order integer NOT NULL DEFAULT 0,
          icon_name text
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS products (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          farmer_id uuid NOT NULL,
          category_id uuid NOT NULL,
          name text NOT NULL,
          is_active boolean NOT NULL DEFAULT true
        )
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS products")
    op.execute("DROP TABLE IF EXISTS categories")
    op.execute(
        """
        ALTER TABLE farmer_profiles
          DROP COLUMN IF EXISTS photo_url,
          DROP COLUMN IF EXISTS geocoded_at,
          DROP COLUMN IF EXISTS longitude,
          DROP COLUMN IF EXISTS latitude
        """
    )
