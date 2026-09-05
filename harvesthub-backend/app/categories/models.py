from sqlalchemy import Column, String, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True)
    slug = Column(String, nullable=False, unique=True)
    name = Column(String, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    icon_name = Column(String, nullable=True)
