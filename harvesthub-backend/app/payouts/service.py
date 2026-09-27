import uuid
from datetime import date, timedelta
from sqlalchemy.orm import Session

from app.payouts.models import LedgerEntry
from app.orders.models import StoreOrder
from app.core.pricing import FARMER_COMMISSION_RATE


def pay_period_for(d: date) -> tuple[date, date]:
    """The Saturday-to-Friday week containing `d`."""
    days_since_saturday = (d.weekday() - 5) % 7  # Monday=0 .. Sunday=6; Saturday=5
    start = d - timedelta(days=days_since_saturday)
    end = start + timedelta(days=6)
    return start, end


def create_ledger_entry_for_completion(db: Session, store_order: StoreOrder) -> None:
    """Called once a store order is marked completed (see
    app/orders/service.py::mark_store_order_completed) — the "Order
    completed" trigger for farmer payout eligibility. Does NOT commit —
    the caller commits once, atomically with the status change."""
    gross = round(float(store_order.subtotal) - float(store_order.promo_discount), 2)
    commission = round(gross * FARMER_COMMISSION_RATE, 2)
    net = round(gross - commission, 2)
    period_start, period_end = pay_period_for(date.today())

    db.add(
        LedgerEntry(
            id=uuid.uuid4(),
            farmer_id=store_order.farmer_id,
            store_order_id=store_order.id,
            entry_type="order",
            gross_amount=gross,
            commission_rate=FARMER_COMMISSION_RATE,
            commission_amount=commission,
            net_amount=net,
            pay_period_start=period_start,
            pay_period_end=period_end,
            status="open",
        )
    )


def handle_refund_ledger_adjustment(db: Session, store_order: StoreOrder) -> None:
    """Called whenever a store order that may have a ledger entry gets
    refunded/cancelled. No-ops cleanly if no 'order' entry exists (e.g. the
    store order was only 'paid', never 'completed' — no ledger entry was
    ever created for it). Does NOT commit — must run inside the caller's
    existing transaction so the row lock below is held until that commit,
    which is what makes this safe against the weekly sweep running
    concurrently (see the pg_cron function's own locking UPDATE)."""
    entry = (
        db.query(LedgerEntry)
        .filter(LedgerEntry.store_order_id == store_order.id, LedgerEntry.entry_type == "order")
        .with_for_update()
        .first()
    )
    if entry is None:
        return

    if entry.status == "open":
        # Never swept into a payout — today's refunds are always the store
        # order's full total, so there's nothing partial to preserve.
        db.delete(entry)
        return

    # Already closed (swept, possibly already disbursed) — the historical
    # entry/payout stays untouched (immutable record); instead, a negative
    # adjustment rides into the farmer's NEXT weekly sweep and reduces
    # their next payout. No special-casing needed in the sweep itself.
    period_start, period_end = pay_period_for(date.today())
    db.add(
        LedgerEntry(
            id=uuid.uuid4(),
            farmer_id=entry.farmer_id,
            store_order_id=store_order.id,
            entry_type="refund_adjustment",
            gross_amount=-entry.gross_amount,
            commission_rate=entry.commission_rate,
            commission_amount=-entry.commission_amount,
            net_amount=-entry.net_amount,
            pay_period_start=period_start,
            pay_period_end=period_end,
            status="open",
        )
    )
