from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.farmers.service import get_current_farmer
from app.farmer_ratings import service
from app.farmer_ratings.schemas import FarmerRatingsOut

# The farmer app's Ratings screen (Farmer F7) — read-only; farmers don't
# reply to ratings in v1.
router = APIRouter(prefix="/farmers/me/ratings", tags=["farmer ratings"])


@router.get("", response_model=FarmerRatingsOut)
def read_my_ratings(db: Session = Depends(get_db), farmer=Depends(get_current_farmer)):
    return service.get_farmer_ratings(db, farmer.id)
