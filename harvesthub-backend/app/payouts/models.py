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
    cash_collected_total = Column(Numeric(10, 2), nullable=False, default=0)
    fee_total = Column(Numeric(10, 2), nullable=False, default=0)
    # Earlier negative (owed) weeks folded into this payout — see 0026.
    carried_in_total = Column(Numeric(10, 2), nullable=False, default=0)
    # gross - commission - cash_collected - fee + carried_in; negative = farmer owes
    net_total = Column(Numeric(10, 2), nullable=False, default=0)
    status = Column(String, nullable=False, default="pending_disbursement")  # 'pending_disbursement' | 'paid' | 'carried_forward'
    carried_into_payout_id = Column(UUID(as_uuid=True), nullable=True)  # set once this (negative) payout is carried forward
    disbursed_at = Column(TIMESTAMP, nullable=True)
    disbursed_note = Column(String, nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)


class LedgerEntry(Base):
    __tablename__ = "farmer_ledger_entries"

    id = Column(UUID(as_uuid=True), primary_key=True)
    farmer_id = Column(UUID(as_uuid=True), nullable=False)
    store_order_id = Column(UUID(as_uuid=True), nullable=False)
    entry_type = Column(String, nullable=False, default="order")  # 'order' | 'refund_adjustment' | 'cancellation_fee'
    gross_amount = Column(Numeric(10, 2), nullable=False)
    commission_rate = Column(Numeric(5, 4), nullable=False)
    commission_amount = Column(Numeric(10, 2), nullable=False)
    # Cash the farmer took in hand at pickup (a cash_on_pickup order's full
    # total; 0 for card) — see 0021_cash_on_pickup_ledger.sql.
    cash_collected = Column(Numeric(10, 2), nullable=False, default=0)
    # Charged to the farmer — today only the service fee when they cancel a
    # paid order (see 0025_farmer_order_fulfillment.sql).
    fee_amount = Column(Numeric(10, 2), nullable=False, default=0)
    net_amount = Column(Numeric(10, 2), nullable=False)  # gross - commission - cash_collected - fee
    pay_period_start = Column(Date, nullable=False)
    pay_period_end = Column(Date, nullable=False)
    status = Column(String, nullable=False, default="open")  # 'open' | 'closed' — 'closed' once swept, see the pg_cron function
    payout_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
