from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.categories import service
from app.categories.schemas import CategoryOut

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("", response_model=list[CategoryOut])
def read_categories(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return service.list_categories(db)
