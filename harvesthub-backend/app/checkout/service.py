from sqlalchemy.orm import Session

from app.cart.models import CartItem
from app.products.models import Product
from app.farmers.models import FarmerProfile
from app.checkout.schemas import CheckoutGroupRequest
from app.promotions.service import apply_promo
from app.core.pricing import SERVICE_FEE_RATE, DELIVERY_FEE_FLAT
from app.core.tax import compute_item_tax


def build_checkout_preview(db: Session, customer_id: str, groups: list[CheckoutGroupRequest]) -> dict:
    """A live estimate, not an order — nothing is written here. Items/
    prices/quantities are read fresh from cart_items on every call (never
    trusts client-supplied amounts); fulfillment_method and promo_code are
    the only inputs the client actually controls."""
    requested_farmer_ids = [g.farmer_id for g in groups]
    if not requested_farmer_ids:
        return {"groups": [], "grand_total": 0.0}

    rows = (
        db.query(CartItem, Product, FarmerProfile)
        .join(Product, Product.id == CartItem.product_id)
        .join(FarmerProfile, FarmerProfile.id == Product.farmer_id)
        .filter(CartItem.customer_id == customer_id, Product.farmer_id.in_(requested_farmer_ids))
        .all()
    )

    items_by_farmer: dict[str, list[dict]] = {}
    farmer_by_id: dict[str, FarmerProfile] = {}
    for item, product, farmer in rows:
        fid = str(farmer.id)
        farmer_by_id[fid] = farmer
        items_by_farmer.setdefault(fid, []).append(
            {
                "product_id": str(item.product_id),
                "name": product.name,
                "unit": product.unit,
                "price": float(product.price),
                "quantity": item.quantity,
                "line_total": round(float(product.price) * item.quantity, 2),
                "tax_category": product.tax_category,
            }
        )

    result_groups = []
    grand_total = 0.0
    for group in groups:
        farmer = farmer_by_id.get(group.farmer_id)
        if farmer is None:
            continue  # nothing in the cart for this farmer (stale request) — skip, don't error the whole preview

        items = sorted(items_by_farmer.get(group.farmer_id, []), key=lambda i: i["name"])
        subtotal = round(sum(i["line_total"] for i in items), 2)

        discount, applied_code, promo_error = apply_promo(db, group.farmer_id, group.promo_code, subtotal)

        delivery_fee = DELIVERY_FEE_FLAT if group.fulfillment_method == "delivery" else 0.0
        service_fee = round(subtotal * SERVICE_FEE_RATE, 2)

        # Per-item, not a single blended rate over the whole subtotal — a
        # farm's cart can mix raw/prepared items, which tax differently
        # (see app/core/tax.py). The promo discount is prorated across
        # items by their share of subtotal before each item's own rate
        # applies. Round only once, on the aggregate, to avoid compounding
        # cent-level drift from rounding each item individually.
        tax_total = 0.0
        for i in items:
            item_discount_share = discount * (i["line_total"] / subtotal) if subtotal > 0 else 0.0
            item_taxable = max(i["line_total"] - item_discount_share, 0.0)
            tax_total += compute_item_tax(farmer.address_state, i["tax_category"], item_taxable)
        tax = round(tax_total, 2)

        farm_total = round(max(subtotal - discount, 0.0) + delivery_fee + service_fee + tax, 2)
        grand_total += farm_total

        result_groups.append(
            {
                "farmer_id": group.farmer_id,
                "farm_name": farmer.farm_name,
                "address_street": farmer.address_street,
                "address_city": farmer.address_city,
                "address_state": farmer.address_state,
                "address_zip": farmer.address_zip,
                "latitude": farmer.latitude,
                "longitude": farmer.longitude,
                "fulfillment_method": group.fulfillment_method,
                "items": items,
                "subtotal": subtotal,
                "promo_code": applied_code,
                "promo_discount": discount,
                "promo_error": promo_error,
                "delivery_fee": delivery_fee,
                "service_fee": service_fee,
                "tax": tax,
                "farm_total": farm_total,
            }
        )

    return {"groups": result_groups, "grand_total": round(grand_total, 2)}
