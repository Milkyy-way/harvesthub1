from datetime import datetime
from sqlalchemy import Column, String, Numeric, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True)
    order_id = Column(UUID(as_uuid=True), nullable=False)
    customer_id = Column(UUID(as_uuid=True), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String, nullable=False, default="usd")
    payment_method = Column(String, nullable=False)  # 'card' | 'wallet' | 'cash_on_pickup'
    provider = Column(String, nullable=False, default="stripe")
    stripe_payment_intent_id = Column(String, nullable=True, unique=True)
    stripe_charge_id = Column(String, nullable=True)
    status = Column(String, nullable=False, default="requires_payment_method")
    failure_reason = Column(String, nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)


class Refund(Base):
    __tablename__ = "refunds"

    id = Column(UUID(as_uuid=True), primary_key=True)
    payment_id = Column(UUID(as_uuid=True), nullable=False)
    store_order_id = Column(UUID(as_uuid=True), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    reason = Column(String, nullable=True)
    stripe_refund_id = Column(String, nullable=True, unique=True)
    status = Column(String, nullable=False, default="pending")
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)


class PaymentCancellation(Base):
    __tablename__ = "payment_cancellations"

    id = Column(UUID(as_uuid=True), primary_key=True)
    payment_id = Column(UUID(as_uuid=True), nullable=False)
    reason = Column(String, nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
