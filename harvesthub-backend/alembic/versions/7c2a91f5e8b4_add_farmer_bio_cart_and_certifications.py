"""add farmer bio, cart_items, and mirror farm_types/certifications

Revision ID: 7c2a91f5e8b4
Revises: 14e2f8ac5990
Create Date: 2026-09-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c2a91f5e8b4'
down_revision: Union[str, Sequence[str], None] = '14e2f8ac5990'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Same "raw IF NOT EXISTS SQL, safe whether or not the Supabase SQL
    migrations already ran" discipline as 14e2f8ac5990 — farm_types/
    years_in_operation/products' price+unit+etc already exist in a real
    Supabase project (0004/0008), this just gives FastAPI's SQLAlchemy
    models the columns they now map (see app/farmers/models.py,
    app/products/models.py) and creates the two tables that don't exist
    anywhere else yet: farmer_certifications, cart_items.
    """
    op.execute(
        """
        ALTER TABLE farmer_profiles
          ADD COLUMN IF NOT EXISTS farm_types text[],
          ADD COLUMN IF NOT EXISTS years_in_operation integer,
          ADD COLUMN IF NOT EXISTS bio text
        """
    )
    op.execute(
        """
        ALTER TABLE products
          ADD COLUMN IF NOT EXISTS description text,
          ADD COLUMN IF NOT EXISTS price numeric(10, 2) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'each',
          ADD COLUMN IF NOT EXISTS quantity_available integer NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS image_url text
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS farmer_certifications (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          farmer_id uuid NOT NULL,
          cert_type text NOT NULL,
          cert_name text NOT NULL
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS cart_items (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          customer_id uuid NOT NULL,
          product_id uuid NOT NULL,
          quantity integer NOT NULL DEFAULT 1
        )
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS cart_items")
    op.execute("DROP TABLE IF EXISTS farmer_certifications")
    op.execute(
        """
        ALTER TABLE products
          DROP COLUMN IF EXISTS image_url,
          DROP COLUMN IF EXISTS quantity_available,
          DROP COLUMN IF EXISTS unit,
          DROP COLUMN IF EXISTS price,
          DROP COLUMN IF EXISTS description
        """
    )
    op.execute(
        """
        ALTER TABLE farmer_profiles
          DROP COLUMN IF EXISTS bio,
          DROP COLUMN IF EXISTS years_in_operation,
          DROP COLUMN IF EXISTS farm_types
        """
    )
