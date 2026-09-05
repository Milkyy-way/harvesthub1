"""add geocode fields to customer_profiles

Revision ID: 3be435d216d9
Revises: 
Create Date: 2026-08-29 12:21:16.634083

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3be435d216d9'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
def upgrade():
    op.add_column('customer_profiles', sa.Column('latitude', sa.Float(), nullable=True))
    op.add_column('customer_profiles', sa.Column('longitude', sa.Float(), nullable=True))
    op.add_column('customer_profiles', sa.Column('geocoded_at', sa.TIMESTAMP(), nullable=True))

def downgrade():
    op.drop_column('customer_profiles', 'geocoded_at')
    op.drop_column('customer_profiles', 'longitude')
    op.drop_column('customer_profiles', 'latitude')