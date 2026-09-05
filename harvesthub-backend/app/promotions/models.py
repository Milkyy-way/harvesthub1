from sqlalchemy import Column, String, Numeric, Integer, Boolean, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

# Always farmer-scoped (no platform-wide codes yet) — a promo only ever
# discounts that one farmer's subsection of a checkout, never the whole
# cart. See app/checkout/service.py for where it's applied.
class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(UUID(as_uuid=True), primary_key=True)
    farmer_id = Column(UUID(as_uuid=True), nullable=False)
    code = Column(String, nullable=False)
    discount_type = Column(String, nullable=False)  # 'percentage' | 'fixed'
    discount_value = Column(Numeric(10, 2), nullable=False)
    min_order_amount = Column(Numeric(10, 2), nullable=True)
    max_discount_amount = Column(Numeric(10, 2), nullable=True)  # caps a percentage discount
    usage_limit = Column(Integer, nullable=True)
    times_used = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    starts_at = Column(TIMESTAMP, nullable=True)
    expires_at = Column(TIMESTAMP, nullable=True)
