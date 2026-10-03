from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.farmers.service import get_current_farmer
from app.farmer_products import service
from app.farmer_products.schemas import FarmerProductCreate, FarmerProductUpdate, FarmerProductOut

# The farmer app's Products tab (Farmer F2). Every route is scoped to the
# authenticated, approved farmer — a product id belonging to anyone else 404s.
router = APIRouter(prefix="/farmers/me/products", tags=["farmer products"])


@router.get("", response_model=list[FarmerProductOut])
def read_my_products(db: Session = Depends(get_db), farmer=Depends(get_current_farmer)):
    return service.list_products(db, farmer.id)


@router.post("", response_model=FarmerProductOut, status_code=201)
def create_my_product(payload: FarmerProductCreate, db: Session = Depends(get_db), farmer=Depends(get_current_farmer)):
    return service.create_product(db, farmer.id, payload)


@router.get("/{product_id}", response_model=FarmerProductOut)
def read_my_product(product_id: str, db: Session = Depends(get_db), farmer=Depends(get_current_farmer)):
    return service.get_product(db, farmer.id, product_id)


@router.patch("/{product_id}", response_model=FarmerProductOut)
def update_my_product(
    product_id: str,
    payload: FarmerProductUpdate,
    db: Session = Depends(get_db),
    farmer=Depends(get_current_farmer),
):
    return service.update_product(db, farmer.id, product_id, payload)
