from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.customers.service import get_current_customer
from app.cart import service
from app.cart.schemas import CartSummary, CartActionResponse

router = APIRouter(prefix="/cart", tags=["cart"])

@router.get("", response_model=CartSummary)
def read_cart(db: Session = Depends(get_db), customer=Depends(get_current_customer)):
    return service.get_cart(db, str(customer.id))

@router.post("/items/{product_id}/increment", response_model=CartActionResponse)
def increment_cart_item(
    product_id: str,
    db: Session = Depends(get_db),
    customer=Depends(get_current_customer),
):
    return service.increment_item(db, str(customer.id), product_id)

@router.post("/items/{product_id}/decrement", response_model=CartActionResponse)
def decrement_cart_item(
    product_id: str,
    db: Session = Depends(get_db),
    customer=Depends(get_current_customer),
):
    return service.decrement_item(db, str(customer.id), product_id)

@router.delete("/items/{product_id}", response_model=CartActionResponse)
def remove_cart_item(
    product_id: str,
    db: Session = Depends(get_db),
    customer=Depends(get_current_customer),
):
    return service.remove_item(db, str(customer.id), product_id)
