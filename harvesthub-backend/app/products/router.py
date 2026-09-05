from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.customers.service import get_current_customer
from app.products import service
from app.products.schemas import ProductOut

router = APIRouter(prefix="/products", tags=["products"])

@router.get("", response_model=list[ProductOut])
def read_products(
    farmer_id: str,
    category: str | None = None,
    db: Session = Depends(get_db),
    customer=Depends(get_current_customer),
):
    return service.list_products_for_farmer(db, farmer_id, category, str(customer.id))
