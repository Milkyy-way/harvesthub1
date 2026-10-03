from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(UUID(as_uuid=True), primary_key=True)  # == auth.users.id
    # Nullable: an OAuth signup lands with role=None (status='pending_role_selection')
    # until it picks customer/farmer — see 0018_oauth_role_selection.sql.
    role = Column(String, nullable=True)
    status = Column(String, nullable=False)
    # Mapped for the farmer's order view (Farmer F3) — a customer's name and
    # phone are shown to a farmer only on orders released to them.
    full_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
