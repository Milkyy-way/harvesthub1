"""profiles role nullable for oauth pending role selection

Revision ID: 31fe19279035
Revises: 1a7dc0739d31
Create Date: 2026-09-21 07:28:46.090727

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '31fe19279035'
down_revision: Union[str, Sequence[str], None] = '1a7dc0739d31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Mirror profiles.role becoming nullable, added by
    0018_oauth_role_selection.sql — a role-less 'pending_role_selection'
    profile (created for an OAuth signup, before it picks customer/farmer)
    needs role to actually allow NULL."""
    op.execute("ALTER TABLE profiles ALTER COLUMN role DROP NOT NULL")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE profiles ALTER COLUMN role SET NOT NULL")
