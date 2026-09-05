import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True)  # == profiles.id == auth.users.id
    address_street = Column(String, nullable=False)
    address_city = Column(String, nullable=False)
    address_state = Column(String, nullable=False)
    address_zip = Column(String, nullable=False)
    latitude = Column(Float, nullable=True)     # new — added via migration below
    longitude = Column(Float, nullable=True)    # new
    geocoded_at = Column(TIMESTAMP, nullable=True)  # new
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)