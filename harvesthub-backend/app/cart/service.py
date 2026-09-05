import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.cart.models import CartItem
from app.products.models import Product
from app.farmers.models import FarmerProfile


def _get_active_product_or_404(db: Session, product_id: str) -> Product:
    product = db.query(Product).filter(Product.id == product_id, Product.is_active.is_(True)).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def _cart_totals(db: Session, customer_id: str) -> tuple[float, int]:
    rows = (
        db.query(CartItem.quantity, Product.price)
        .join(Product, Product.id == CartItem.product_id)
        .filter(CartItem.customer_id == customer_id)
        .all()
    )
    total = sum(float(price) * qty for qty, price in rows)
    count = sum(qty for qty, _ in rows)
    return round(total, 2), count


def get_cart(db: Session, customer_id: str) -> dict:
    """Grouped by farmer, not a flat list — the cart page (and, next,
    checkout) treats each farmer's items as a separate mini-order with its
    own subtotal and fulfillment choice. Includes each farm's own address/
    coordinates so the cart page can offer "pick up at the farm" without a
    second request per farmer."""
    rows = (
        db.query(CartItem, Product, FarmerProfile)
        .join(Product, Product.id == CartItem.product_id)
        .join(FarmerProfile, FarmerProfile.id == Product.farmer_id)
        .filter(CartItem.customer_id == customer_id)
        .all()
    )

    groups: dict[str, dict] = {}
    for item, product, farmer in rows:
        farmer_id = str(farmer.id)
        group = groups.setdefault(
            farmer_id,
            {
                "farmer_id": farmer_id,
                "farm_name": farmer.farm_name,
                "photo_url": farmer.photo_url,
                "address_street": farmer.address_street,
                "address_city": farmer.address_city,
                "address_state": farmer.address_state,
                "address_zip": farmer.address_zip,
                "latitude": farmer.latitude,
                "longitude": farmer.longitude,
                "items": [],
                "subtotal": 0.0,
            },
        )
        line_total = round(float(product.price) * item.quantity, 2)
        group["items"].append(
            {
                "product_id": str(item.product_id),
                "name": product.name,
                "unit": product.unit,
                "price": float(product.price),
                "quantity": item.quantity,
                "quantity_available": product.quantity_available,
                "line_total": line_total,
            }
        )
        group["subtotal"] = round(group["subtotal"] + line_total, 2)

    farms = sorted(groups.values(), key=lambda g: g["farm_name"])
    for farm in farms:
        farm["items"].sort(key=lambda i: i["name"])

    total = round(sum(f["subtotal"] for f in farms), 2)
    item_count = sum(i["quantity"] for f in farms for i in f["items"])
    return {"farms": farms, "total": total, "item_count": item_count}


def increment_item(db: Session, customer_id: str, product_id: str) -> dict:
    product = _get_active_product_or_404(db, product_id)
    item = (
        db.query(CartItem)
        .filter(CartItem.customer_id == customer_id, CartItem.product_id == product_id)
        .first()
    )
    current_qty = item.quantity if item else 0
    if current_qty >= product.quantity_available:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Not enough stock available")

    if item:
        item.quantity += 1
    else:
        item = CartItem(id=uuid.uuid4(), customer_id=customer_id, product_id=product_id, quantity=1)
        db.add(item)
    db.commit()

    total, count = _cart_totals(db, customer_id)
    return {"product_id": str(product_id), "quantity": item.quantity, "cart_total": total, "cart_item_count": count}


def decrement_item(db: Session, customer_id: str, product_id: str) -> dict:
    item = (
        db.query(CartItem)
        .filter(CartItem.customer_id == customer_id, CartItem.product_id == product_id)
        .first()
    )
    new_quantity = 0
    if item:
        if item.quantity <= 1:
            db.delete(item)
        else:
            item.quantity -= 1
            new_quantity = item.quantity
        db.commit()

    total, count = _cart_totals(db, customer_id)
    return {"product_id": str(product_id), "quantity": new_quantity, "cart_total": total, "cart_item_count": count}


def remove_item(db: Session, customer_id: str, product_id: str) -> dict:
    """Drops the line entirely regardless of quantity — the cart page's
    trash icon, as opposed to decrement's one-at-a-time stepper."""
    item = (
        db.query(CartItem)
        .filter(CartItem.customer_id == customer_id, CartItem.product_id == product_id)
        .first()
    )
    if item:
        db.delete(item)
        db.commit()

    total, count = _cart_totals(db, customer_id)
    return {"product_id": str(product_id), "quantity": 0, "cart_total": total, "cart_item_count": count}
