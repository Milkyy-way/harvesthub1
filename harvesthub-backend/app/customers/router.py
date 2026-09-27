from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.customers import service
from app.customers.schemas import CustomerProfileOut
from app.orders import service as orders_service
from app.orders.schemas import DashboardSummaryOut

router = APIRouter(prefix="/customers", tags=["customers"])

@router.get("/me", response_model=CustomerProfileOut)
def read_my_profile(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return service.get_or_geocode_profile(db, user["id"])

@router.get("/me/dashboard-summary", response_model=DashboardSummaryOut)
def read_my_dashboard_summary(
    range: str | None = Query(None, description="week | month | 3m | 6m | all"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return orders_service.get_dashboard_summary(db, user["id"], range)
