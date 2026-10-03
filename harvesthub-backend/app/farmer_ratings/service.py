import uuid
from collections import defaultdict
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.orders.models import Order, StoreOrder, StoreOrderItem
from app.ratings.models import FarmerRating
from app.ratings import service as ratings_service

_RECENT_LIMIT = 50


def _items_summary(names: list[str]) -> str:
    if not names:
        return "Order"
    if len(names) <= 2:
        return ", ".join(names)
    return f"{names[0]}, {names[1]} +{len(names) - 2} more"


def get_farmer_ratings(db: Session, farmer_id) -> dict:
    """The farmer's own ratings (Farmer F7): the same average/count customers
    see on the farm page, a 1–5 star distribution, and recent ratings with
    order context — never the customer's identity (see schemas)."""
    # get_rating_summaries keys its result by the UUID objects the DB returns,
    # so a str id would silently miss — normalize first.
    farmer_id = farmer_id if isinstance(farmer_id, uuid.UUID) else uuid.UUID(str(farmer_id))
    average, count = ratings_service.get_farmer_rating_summary(db, farmer_id)

    distribution = [0, 0, 0, 0, 0]
    for stars, n in (
        db.query(FarmerRating.rating, func.count(FarmerRating.id))
        .filter(FarmerRating.farmer_id == farmer_id)
        .group_by(FarmerRating.rating)
        .all()
    ):
        if 1 <= stars <= 5:
            distribution[stars - 1] = n

    rows = (
        db.query(FarmerRating, Order.placed_at)
        .join(StoreOrder, StoreOrder.id == FarmerRating.store_order_id)
        .join(Order, Order.id == StoreOrder.order_id)
        .filter(FarmerRating.farmer_id == farmer_id)
        .order_by(FarmerRating.created_at.desc())
        .limit(_RECENT_LIMIT)
        .all()
    )
    names_by_store_order: dict = defaultdict(list)
    store_order_ids = [r.store_order_id for r, _ in rows]
    if store_order_ids:
        for so_id, name in (
            db.query(StoreOrderItem.store_order_id, StoreOrderItem.product_name)
            .filter(StoreOrderItem.store_order_id.in_(store_order_ids))
            .order_by(StoreOrderItem.product_name)
            .all()
        ):
            names_by_store_order[so_id].append(name)

    return {
        "average": average,
        "count": count,
        "distribution": distribution,
        "recent": [
            {
                "rating": r.rating,
                "comment": r.comment,
                "created_at": r.created_at.isoformat(),
                "order_placed_at": placed_at.isoformat() if placed_at else None,
                "items_summary": _items_summary(names_by_store_order.get(r.store_order_id, [])),
            }
            for r, placed_at in rows
        ],
    }
