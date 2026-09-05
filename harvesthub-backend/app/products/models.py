from sqlalchemy import Column, String, Boolean, Numeric, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True)
    farmer_id = Column(UUID(as_uuid=True), nullable=False)
    category_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    unit = Column(String, nullable=False)
    quantity_available = Column(Integer, nullable=False, default=0)
    image_url = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
