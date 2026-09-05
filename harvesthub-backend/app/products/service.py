from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.models import Profile
from app.categories.models import Category
from app.products.models import Product
from app.cart.models import CartItem


def list_products_for_farmer(
    db: Session,
    farmer_id: str,
    category_slug: str | None,
    customer_id: str,
) -> list[dict]:
    """Active products for one farm, alphabetical by name. Joined against
    Profile so a suspended/unapproved farmer's products don't leak through
    a direct farmer_id query — same visibility rule as the feed and the
    farmer detail endpoint (see app/farmers/service.py)."""
    q = (
        db.query(Product, Category)
        .join(Category, Category.id == Product.category_id)
        .join(Profile, Profile.id == Product.farmer_id)
        .filter(
            Product.farmer_id == farmer_id,
            Product.is_active.is_(True),
            Profile.role == "farmer",
            Profile.status == "active",
        )
    )
    if category_slug:
        q = q.filter(Category.slug == category_slug)

    rows = q.order_by(func.lower(Product.name)).all()
    if not rows:
        return []

    product_ids = [p.id for p, _ in rows]
    cart_rows = (
        db.query(CartItem.product_id, CartItem.quantity)
        .filter(CartItem.customer_id == customer_id, CartItem.product_id.in_(product_ids))
        .all()
    )
    cart_by_product = {str(pid): qty for pid, qty in cart_rows}

    return [
        {
            "id": str(p.id),
            "farmer_id": str(p.farmer_id),
            "category_id": str(p.category_id),
            "category_slug": c.slug,
            "category_name": c.name,
            "name": p.name,
            "description": p.description,
            "price": float(p.price),
            "unit": p.unit,
            "quantity_available": p.quantity_available,
            "image_url": p.image_url,
            "cart_quantity": cart_by_product.get(str(p.id), 0),
        }
        for p, c in rows
    ]
