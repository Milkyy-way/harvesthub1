from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.customers import service
from app.customers.schemas import CustomerProfileOut

router = APIRouter(prefix="/customers", tags=["customers"])

@router.get("/me", response_model=CustomerProfileOut)
def read_my_profile(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return service.get_or_geocode_profile(db, user["id"])