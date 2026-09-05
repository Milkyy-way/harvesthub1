from datetime import datetime
from sqlalchemy.orm import Session
from app.promotions.models import PromoCode


def _find_promo(db: Session, farmer_id: str, code: str) -> PromoCode | None:
    return (
        db.query(PromoCode)
        .filter(
            PromoCode.farmer_id == farmer_id,
            PromoCode.code == code.strip().upper(),
            PromoCode.is_active.is_(True),
        )
        .first()
    )


def apply_promo(db: Session, farmer_id: str, code: str | None, subtotal: float) -> tuple[float, str | None, str | None]:
    """Returns (discount_amount, applied_code_or_none, error_message_or_none).
    Never raises — an invalid/expired/inapplicable code just means no
    discount for that farm's subsection, not a failed checkout preview."""
    if not code or not code.strip():
        return 0.0, None, None

    promo = _find_promo(db, farmer_id, code)
    if not promo:
        return 0.0, None, "Invalid promo code for this farm"

    now = datetime.utcnow()
    if promo.starts_at and now < promo.starts_at:
        return 0.0, None, "This promo code isn't active yet"
    if promo.expires_at and now > promo.expires_at:
        return 0.0, None, "This promo code has expired"
    if promo.usage_limit is not None and promo.times_used >= promo.usage_limit:
        return 0.0, None, "This promo code has reached its usage limit"
    if promo.min_order_amount is not None and subtotal < float(promo.min_order_amount):
        return 0.0, None, f"Minimum order of ${float(promo.min_order_amount):.2f} required for this code"

    if promo.discount_type == "percentage":
        discount = subtotal * float(promo.discount_value) / 100
    else:
        discount = float(promo.discount_value)

    if promo.max_discount_amount is not None:
        discount = min(discount, float(promo.max_discount_amount))
    discount = min(discount, subtotal)  # never discount past $0

    return round(discount, 2), promo.code, None
