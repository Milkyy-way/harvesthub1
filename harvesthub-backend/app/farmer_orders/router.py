from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.farmers.service import get_current_farmer
from app.farmer_orders import service
from app.farmer_orders.schemas import FarmerCancelRequest, FarmerOrderOut, FarmerOrdersResponse, FarmerOrderView
from app.orders import service as orders_service

# The farmer app's Orders tab (Farmer F3). Only orders released to the
# farmer (paid by card, or placed as cash) are ever visible or actionable.
router = APIRouter(prefix="/farmers/me/orders", tags=["farmer orders"])


@router.get("", response_model=FarmerOrdersResponse)
def read_my_orders(
    view: FarmerOrderView = Query("to_prepare"),
    db: Session = Depends(get_db),
    farmer=Depends(get_current_farmer),
):
    return service.list_farmer_orders(db, farmer.id, view)


@router.post("/{store_order_id}/ready", response_model=FarmerOrderOut)
def mark_ready(store_order_id: str, db: Session = Depends(get_db), farmer=Depends(get_current_farmer)):
    store_order = orders_service.mark_store_order_ready_for_pickup(db, farmer.id, store_order_id)
    return service.get_farmer_order(db, farmer.id, store_order.id)


@router.post("/{store_order_id}/cancel", response_model=FarmerOrderOut)
def cancel(
    store_order_id: str,
    payload: FarmerCancelRequest,
    db: Session = Depends(get_db),
    farmer=Depends(get_current_farmer),
):
    store_order = orders_service.farmer_cancel_store_order(db, farmer.id, store_order_id, payload.reason.strip())
    return service.get_farmer_order(db, farmer.id, store_order.id)
