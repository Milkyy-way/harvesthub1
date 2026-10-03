from pydantic import BaseModel
from typing import Literal, Optional


# One set of money lines, used for an open week and for a payout:
#   earnings = gross - commission            (what the farmer made)
#   net      = earnings - cash_collected - fees + carried_in
#            (what HarvestHub transfers; negative = the farmer owes)
class EarningsBreakdown(BaseModel):
    gross: float  # sales, after the farmer's own promo discounts
    commission: float
    earnings: float
    cash_collected: float  # cash the farmer already took in hand at pickup
    fees: float  # farmer-cancellation fees
    carried_in: float  # owed amounts folded in from earlier weeks (<= 0); payouts only
    net: float


class LedgerActivityOut(BaseModel):
    id: str
    entry_type: Literal["order", "refund_adjustment", "cancellation_fee"]
    created_at: str
    customer_name: Optional[str]
    order_placed_at: Optional[str]
    item_count: int
    payment_method: Optional[Literal["card", "cash_on_pickup"]]
    gross: float
    commission: float
    cash_collected: float
    fee: float
    net: float


class OpenPeriodOut(BaseModel):
    period_start: str
    period_end: str
    is_current_week: bool
    # The Friday the weekly job turns this week into a payout: the first
    # Friday run AFTER the week has fully ended, i.e. period_end + 7 days.
    payout_prepared_on: str
    breakdown: EarningsBreakdown
    entries: list[LedgerActivityOut]


class InProgressOut(BaseModel):
    order_count: int  # released orders not picked up yet — not on the ledger until completed
    estimated_earnings: float


class PayoutOut(BaseModel):
    id: str
    period_start: str
    period_end: str
    breakdown: EarningsBreakdown
    status: Literal["pending_disbursement", "paid", "carried_forward"]
    disbursed_at: Optional[str]
    carried_into_period_end: Optional[str]  # when carried_forward: which later payout absorbed it


class FarmerEarningsOut(BaseModel):
    commission_rate: float
    open_periods: list[OpenPeriodOut]  # newest first; always includes the current week
    in_progress: InProgressOut
    awaiting_payout: float  # prepared payouts not yet sent (positive)
    owed_carrying: float  # owed amounts waiting to come off the next payout (<= 0)
    lifetime_earnings: float
    lifetime_paid_out: float
    payouts: list[PayoutOut]  # newest first
