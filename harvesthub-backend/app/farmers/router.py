from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.customers.service import get_current_customer
from app.farmers import service
from app.farmers.schemas import FarmerFeedResponse, FarmerDetailOut, FarmerSpotlightResponse

router = APIRouter(prefix="/farmers", tags=["farmers"])

@router.get("/feed", response_model=FarmerFeedResponse)
def read_farmer_feed(
    category: str | None = None,
    search: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    customer=Depends(get_current_customer),
):
    if customer.latitude is None or customer.longitude is None:
        raise HTTPException(status_code=422, detail="Your delivery address couldn't be located yet")

    items, total = service.list_farmer_feed(
        db, customer.latitude, customer.longitude, category, search, limit, offset
    )
    return {"items": items, "limit": limit, "offset": offset, "total": total}


# Registered before /{farmer_id} for the same shadowing reason as /feed.
@router.get("/spotlight", response_model=FarmerSpotlightResponse)
def read_farmer_spotlight(
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_db),
    customer=Depends(get_current_customer),
):
    if customer.latitude is None or customer.longitude is None:
        raise HTTPException(status_code=422, detail="Your delivery address couldn't be located yet")

    items = service.get_spotlight_farmers(db, customer.latitude, customer.longitude, limit)
    return {"items": items}


# Registered after /feed — a path-param route declared first would shadow
# the literal "/feed" segment (matched as farmer_id="feed").
@router.get("/{farmer_id}", response_model=FarmerDetailOut)
def read_farmer_detail(
    farmer_id: str,
    db: Session = Depends(get_db),
    customer=Depends(get_current_customer),
):
    detail = service.get_farmer_detail(db, farmer_id, customer.latitude, customer.longitude)
    if detail is None:
        raise HTTPException(status_code=404, detail="Farm not found")
    return detail
