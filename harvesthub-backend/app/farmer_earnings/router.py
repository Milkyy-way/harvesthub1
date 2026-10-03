from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.farmers.service import get_current_farmer
from app.farmer_earnings import service
from app.farmer_earnings.schemas import FarmerEarningsOut

# The farmer app's Earnings screen (Farmer F4) — read-only, on top of the
# payout ledger (farmer_ledger_entries / farmer_payouts).
router = APIRouter(prefix="/farmers/me/earnings", tags=["farmer earnings"])


@router.get("", response_model=FarmerEarningsOut)
def read_my_earnings(db: Session = Depends(get_db), farmer=Depends(get_current_farmer)):
    return service.get_farmer_earnings(db, farmer.id)
