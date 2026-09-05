from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.customers.service import get_current_customer
from app.checkout import service
from app.checkout.schemas import CheckoutPreviewRequest, CheckoutPreviewResponse

router = APIRouter(prefix="/checkout", tags=["checkout"])

@router.post("/preview", response_model=CheckoutPreviewResponse)
def preview_checkout(
    payload: CheckoutPreviewRequest,
    db: Session = Depends(get_db),
    customer=Depends(get_current_customer),
):
    return service.build_checkout_preview(db, str(customer.id), payload.groups)
