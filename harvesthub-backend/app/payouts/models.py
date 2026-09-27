from datetime import datetime
from sqlalchemy import Column, String, Numeric, Date, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Payout(Base):
    __tablename__ = "farmer_payouts"

    id = Column(UUID(as_uuid=True), primary_key=True)
    farmer_id = Column(UUID(as_uuid=True), nullable=False)
    pay_period_start = Column(Date, nullable=False)
    pay_period_end = Column(Date, nullable=False)
    gross_total = Column(Numeric(10, 2), nullable=False, default=0)
    commission_total = Column(Numeric(10, 2), nullable=False, default=0)
    net_total = Column(Numeric(10, 2), nullable=False, default=0)
    status = Column(String, nullable=False, default="pending_disbursement")  # 'pending_disbursement' | 'paid'
    disbursed_at = Column(TIMESTAMP, nullable=True)
    disbursed_note = Column(String, nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)


class LedgerEntry(Base):
    __tablename__ = "farmer_ledger_entries"

    id = Column(UUID(as_uuid=True), primary_key=True)
    farmer_id = Column(UUID(as_uuid=True), nullable=False)
    store_order_id = Column(UUID(as_uuid=True), nullable=False)
    entry_type = Column(String, nullable=False, default="order")  # 'order' | 'refund_adjustment'
    gross_amount = Column(Numeric(10, 2), nullable=False)
    commission_rate = Column(Numeric(5, 4), nullable=False)
    commission_amount = Column(Numeric(10, 2), nullable=False)
    net_amount = Column(Numeric(10, 2), nullable=False)
    pay_period_start = Column(Date, nullable=False)
    pay_period_end = Column(Date, nullable=False)
    status = Column(String, nullable=False, default="open")  # 'open' | 'closed' — 'closed' once swept, see the pg_cron function
    payout_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
