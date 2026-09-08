"""add orders, store_orders, store_order_items, payments, refunds, cancellations

Revision ID: 9a4b6e2c7f31
Revises: e3f7a1c9d2b6
Create Date: 2026-09-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a4b6e2c7f31'
down_revision: Union[str, Sequence[str], None] = 'e3f7a1c9d2b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema. Same raw IF NOT EXISTS discipline as prior
    revisions — safe whether or not 0013_orders_and_payments.sql already
    ran. Triggers/RLS policies are NOT mirrored here (Alembic's job in
    this project is just giving FastAPI's SQLAlchemy models a narrow,
    correct view of the columns — see every prior revision's docstring);
    the real trigger logic (order status aggregation) lives only in the
    Supabase SQL migration."""
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS orders (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          customer_id uuid NOT NULL,
          status text NOT NULL DEFAULT 'active',
          placed_at timestamptz NOT NULL DEFAULT now(),
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS store_orders (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id uuid NOT NULL,
          farmer_id uuid NOT NULL,
          farm_name text NOT NULL,
          fulfillment_method text NOT NULL,
          pickup_address_street text,
          pickup_address_city text,
          pickup_address_state text,
          pickup_address_zip text,
          delivery_address_street text,
          delivery_address_city text,
          delivery_address_state text,
          delivery_address_zip text,
          subtotal numeric(10, 2) NOT NULL,
          promo_code text,
          promo_discount numeric(10, 2) NOT NULL DEFAULT 0,
          delivery_fee numeric(10, 2) NOT NULL DEFAULT 0,
          service_fee numeric(10, 2) NOT NULL DEFAULT 0,
          tax numeric(10, 2) NOT NULL DEFAULT 0,
          total numeric(10, 2) NOT NULL,
          status text NOT NULL DEFAULT 'pending_payment',
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS store_order_items (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          store_order_id uuid NOT NULL,
          product_id uuid,
          product_name text NOT NULL,
          unit text NOT NULL,
          unit_price numeric(10, 2) NOT NULL,
          quantity integer NOT NULL,
          line_total numeric(10, 2) NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS order_cancellations (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id uuid NOT NULL,
          store_order_id uuid NOT NULL,
          cancelled_by uuid NOT NULL,
          cancelled_by_role text NOT NULL,
          reason text,
          created_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS payments (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id uuid NOT NULL,
          customer_id uuid NOT NULL,
          amount numeric(10, 2) NOT NULL,
          currency text NOT NULL DEFAULT 'usd',
          payment_method text NOT NULL,
          provider text NOT NULL DEFAULT 'stripe',
          stripe_payment_intent_id text,
          stripe_charge_id text,
          status text NOT NULL DEFAULT 'requires_payment_method',
          failure_reason text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS refunds (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          payment_id uuid NOT NULL,
          store_order_id uuid NOT NULL,
          amount numeric(10, 2) NOT NULL,
          reason text,
          stripe_refund_id text,
          status text NOT NULL DEFAULT 'pending',
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS payment_cancellations (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          payment_id uuid NOT NULL,
          reason text,
          created_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS payment_cancellations")
    op.execute("DROP TABLE IF EXISTS refunds")
    op.execute("DROP TABLE IF EXISTS payments")
    op.execute("DROP TABLE IF EXISTS order_cancellations")
    op.execute("DROP TABLE IF EXISTS store_order_items")
    op.execute("DROP TABLE IF EXISTS store_orders")
    op.execute("DROP TABLE IF EXISTS orders")
