import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import stripe

from app.orders.models import Order, StoreOrder, StoreOrderItem, OrderCancellation
from app.payments.models import Payment, Refund, PaymentCancellation
from app.payments import stripe_client
from app.products.models import Product
from app.cart.models import CartItem
from app.farmers.models import FarmerProfile
from app.checkout.service import build_checkout_preview
from app.checkout.schemas import CheckoutGroupRequest
from app.orders.schemas import CreateOrderRequest
from app.payouts import service as payouts_service
from app.ratings import service as ratings_service
from app.ratings.schemas import SubmitRatingRequest
from app.cart.service import _cart_totals

# Terminal from the customer's point of view — no further payment action
# will change these without a new attempt (we don't build retries yet).
_TERMINAL_PAYMENT_STATUSES = ("succeeded", "canceled", "failed")
# 'completed' is cancellable/refundable too (e.g. a quality complaint after
# pickup) — this is what makes the farmer-payout ledger's refund-before/
# after-payout branch reachable at all, since a ledger entry is only ever
# created at completion (see app/payouts/service.py). No time limit on this
# post-completion refund window yet — a known simplification.
_CANCELLABLE_STORE_ORDER_STATUSES = ("pending_payment", "paid", "completed")
# Statuses whose refund actually needs a real Stripe refund + a farmer
# ledger adjustment (as opposed to 'pending_payment', which never captured
# any money and never created a ledger entry).
_REFUNDABLE_STORE_ORDER_STATUSES = ("paid", "completed")


def get_owned_order(db: Session, customer_id: str, order_id: str) -> Order:
    order = db.query(Order).filter(Order.id == order_id, Order.customer_id == customer_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


def build_order_out(db: Session, order_id) -> dict:
    order = db.query(Order).filter(Order.id == order_id).first()
    store_orders = db.query(StoreOrder).filter(StoreOrder.order_id == order_id).order_by(StoreOrder.created_at).all()
    payment = db.query(Payment).filter(Payment.order_id == order_id).first()

    # Live-joined, not a snapshot — unlike price/address (frozen for
    # historical accuracy), a farm's photo has no legal/financial reason to
    # stay pinned to what it was at order time, so this just shows the
    # farm's current photo. Avoids a new snapshot column + migration.
    photo_by_farmer = dict(
        db.query(FarmerProfile.id, FarmerProfile.photo_url)
        .filter(FarmerProfile.id.in_({so.farmer_id for so in store_orders}))
        .all()
    )

    store_order_outs = []
    grand_total = 0.0
    for so in store_orders:
        items = (
            db.query(StoreOrderItem)
            .filter(StoreOrderItem.store_order_id == so.id)
            .order_by(StoreOrderItem.product_name)
            .all()
        )
        refunded = (
            db.query(func.coalesce(func.sum(Refund.amount), 0))
            .filter(Refund.store_order_id == so.id, Refund.status == "succeeded")
            .scalar()
        )
        rating = ratings_service.get_rating_for_store_order(db, so.id)
        store_order_outs.append(
            {
                "id": str(so.id),
                "farmer_id": str(so.farmer_id),
                "farm_name": so.farm_name,
                "photo_url": photo_by_farmer.get(so.farmer_id),
                "my_rating": rating.rating if rating else None,
                "fulfillment_method": so.fulfillment_method,
                "pickup_address_street": so.pickup_address_street,
                "pickup_address_city": so.pickup_address_city,
                "pickup_address_state": so.pickup_address_state,
                "pickup_address_zip": so.pickup_address_zip,
                "delivery_address_street": so.delivery_address_street,
                "delivery_address_city": so.delivery_address_city,
                "delivery_address_state": so.delivery_address_state,
                "delivery_address_zip": so.delivery_address_zip,
                "subtotal": float(so.subtotal),
                "promo_code": so.promo_code,
                "promo_discount": float(so.promo_discount),
                "delivery_fee": float(so.delivery_fee),
                "service_fee": float(so.service_fee),
                "tax": float(so.tax),
                "total": float(so.total),
                "refunded_amount": float(refunded or 0),
                "status": so.status,
                "items": [
                    {
                        "product_id": str(i.product_id) if i.product_id else None,
                        "product_name": i.product_name,
                        "unit": i.unit,
                        "unit_price": float(i.unit_price),
                        "quantity": i.quantity,
                        "line_total": float(i.line_total),
                    }
                    for i in items
                ],
            }
        )
        grand_total += float(so.total)

    payment_out = None
    if payment:
        payment_out = {
            "id": str(payment.id),
            "amount": float(payment.amount),
            "currency": payment.currency,
            "payment_method": payment.payment_method,
            "status": payment.status,
            "failure_reason": payment.failure_reason,
        }

    return {
        "id": str(order.id),
        "status": order.status,
        "placed_at": order.placed_at.isoformat(),
        "grand_total": round(grand_total, 2),
        "store_orders": store_order_outs,
        "payment": payment_out,
    }


def list_orders(db: Session, customer_id: str, status_filter: str | None, range_key: str | None = None) -> list[dict]:
    q = db.query(Order).filter(Order.customer_id == customer_id)
    if status_filter:
        q = q.filter(Order.status == status_filter)
    if range_key in _RANGE_WINDOWS:
        q = q.filter(Order.placed_at >= datetime.now(timezone.utc) - _RANGE_WINDOWS[range_key])
    orders = q.order_by(Order.placed_at.desc()).all()
    return [build_order_out(db, o.id) for o in orders]


def _validate_stock(db: Session, groups: list[dict]) -> None:
    for group in groups:
        for item in group["items"]:
            product = db.query(Product).filter(Product.id == item["product_id"]).first()
            if product and item["quantity"] > product.quantity_available:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Only {product.quantity_available} of {item['name']} left — please update your cart",
                )


def _commit_inventory_and_clear_cart(db: Session, customer_id: str, order_id) -> None:
    """The point of no return for one order: decrement real stock and drop
    the ordered items from the customer's active cart. Deliberately NOT
    called at order-creation time for card payments — only once payment is
    actually confirmed (see _finalize_successful_payment) — so a declined
    or abandoned payment never locks stock or empties a cart for nothing.
    cash_on_pickup has no such failure mode, so it calls this immediately
    at creation instead."""
    store_orders = db.query(StoreOrder).filter(StoreOrder.order_id == order_id).all()
    for so in store_orders:
        items = db.query(StoreOrderItem).filter(StoreOrderItem.store_order_id == so.id).all()
        for item in items:
            if item.product_id:
                product = db.query(Product).filter(Product.id == item.product_id).first()
                if product:
                    product.quantity_available = max(0, product.quantity_available - item.quantity)
                db.query(CartItem).filter(
                    CartItem.customer_id == customer_id, CartItem.product_id == item.product_id
                ).delete()


def create_order(db: Session, customer, request: CreateOrderRequest) -> tuple[dict, str | None]:
    customer_id = str(customer.id)

    preview_groups = [
        CheckoutGroupRequest(farmer_id=g.farmer_id, fulfillment_method=g.fulfillment_method, promo_code=g.promo_code)
        for g in request.groups
    ]
    preview = build_checkout_preview(db, customer_id, preview_groups)
    if not preview["groups"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nothing in your cart for the selected farms")

    _validate_stock(db, preview["groups"])

    delivery_by_farmer = {g.farmer_id: g.delivery_address for g in request.groups}
    for group in preview["groups"]:
        if group["fulfillment_method"] == "delivery" and not delivery_by_farmer.get(group["farmer_id"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Delivery address required for {group['farm_name']}",
            )

    order = Order(id=uuid.uuid4(), customer_id=customer.id)
    db.add(order)
    db.flush()

    for group in preview["groups"]:
        delivery = delivery_by_farmer.get(group["farmer_id"])
        store_order = StoreOrder(
            id=uuid.uuid4(),
            order_id=order.id,
            farmer_id=group["farmer_id"],
            farm_name=group["farm_name"],
            fulfillment_method=group["fulfillment_method"],
            pickup_address_street=group["address_street"],
            pickup_address_city=group["address_city"],
            pickup_address_state=group["address_state"],
            pickup_address_zip=group["address_zip"],
            delivery_address_street=delivery.street if delivery else None,
            delivery_address_city=delivery.city if delivery else None,
            delivery_address_state=delivery.state if delivery else None,
            delivery_address_zip=delivery.zip if delivery else None,
            subtotal=group["subtotal"],
            promo_code=group["promo_code"],
            promo_discount=group["promo_discount"],
            delivery_fee=group["delivery_fee"],
            service_fee=group["service_fee"],
            tax=group["tax"],
            total=group["farm_total"],
            status="pending_payment",
        )
        db.add(store_order)
        db.flush()
        for item in group["items"]:
            db.add(
                StoreOrderItem(
                    id=uuid.uuid4(),
                    store_order_id=store_order.id,
                    product_id=item["product_id"],
                    product_name=item["name"],
                    unit=item["unit"],
                    unit_price=item["price"],
                    quantity=item["quantity"],
                    line_total=item["line_total"],
                )
            )

    grand_total = preview["grand_total"]
    payment = Payment(
        id=uuid.uuid4(),
        order_id=order.id,
        customer_id=customer.id,
        amount=grand_total,
        currency="usd",
        payment_method=request.payment_method,
        provider="stripe" if request.payment_method != "cash_on_pickup" else "none",
        status="pending" if request.payment_method == "cash_on_pickup" else "requires_payment_method",
    )
    db.add(payment)
    db.flush()

    client_secret = None
    if request.payment_method == "cash_on_pickup":
        _commit_inventory_and_clear_cart(db, customer_id, order.id)
        db.commit()
    else:
        try:
            intent = stripe_client.create_payment_intent(grand_total, "usd", str(order.id), customer_id)
        except stripe.error.StripeError as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Could not start payment: {getattr(e, 'user_message', None) or str(e)}",
            )
        payment.stripe_payment_intent_id = intent.id
        payment.status = intent.status
        client_secret = intent.client_secret
        db.commit()

    return build_order_out(db, order.id), client_secret


def _finalize_successful_payment(db: Session, order_id) -> None:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return
    _commit_inventory_and_clear_cart(db, str(order.customer_id), order_id)
    db.query(StoreOrder).filter(StoreOrder.order_id == order_id, StoreOrder.status == "pending_payment").update(
        {"status": "paid"}
    )
    db.commit()


def reconcile_payment_intent(
    db: Session,
    stripe_status: str,
    payment_intent_id: str,
    charge_id: str | None = None,
    failure_reason: str | None = None,
) -> None:
    """Shared by the Stripe webhook and the client-triggered sync endpoint —
    whichever gets there first wins; idempotent against being called twice
    for the same terminal state."""
    payment = db.query(Payment).filter(Payment.stripe_payment_intent_id == payment_intent_id).first()
    if not payment:
        return  # unrecognized intent (different environment/stale test data) — ignore, don't fail the caller

    if payment.status in _TERMINAL_PAYMENT_STATUSES:
        return

    payment.status = stripe_status
    if charge_id:
        payment.stripe_charge_id = charge_id
    if failure_reason:
        payment.failure_reason = failure_reason
    db.commit()

    if stripe_status == "succeeded":
        _finalize_successful_payment(db, payment.order_id)
    elif stripe_status == "canceled":
        db.add(PaymentCancellation(id=uuid.uuid4(), payment_id=payment.id, reason=failure_reason))
        db.commit()


def sync_payment_status(db: Session, customer_id: str, order_id: str) -> dict:
    order = get_owned_order(db, customer_id, order_id)
    payment = db.query(Payment).filter(Payment.order_id == order.id).first()
    if not payment or not payment.stripe_payment_intent_id or payment.status in _TERMINAL_PAYMENT_STATUSES:
        return build_order_out(db, order.id)

    try:
        intent = stripe_client.retrieve_payment_intent(payment.stripe_payment_intent_id)
    except stripe.error.StripeError:
        return build_order_out(db, order.id)

    reconcile_payment_intent(
        db,
        intent.status,
        intent.id,
        charge_id=getattr(intent, "latest_charge", None),
        failure_reason=(intent.last_payment_error.message if getattr(intent, "last_payment_error", None) else None),
    )
    return build_order_out(db, order.id)


def _record_cancellation(order_id, store_order_id, cancelled_by, cancelled_by_role: str, reason: str | None) -> OrderCancellation:
    return OrderCancellation(
        id=uuid.uuid4(),
        order_id=order_id,
        store_order_id=store_order_id,
        cancelled_by=cancelled_by,
        cancelled_by_role=cancelled_by_role,
        reason=reason,
    )


def _refund_store_order(db: Session, payment: Payment, store_order: StoreOrder, reason: str | None) -> None:
    if payment.payment_method == "cash_on_pickup":
        return  # nothing was ever electronically captured — just a status change, no refund object

    try:
        stripe_refund = stripe_client.create_refund(payment.stripe_payment_intent_id, float(store_order.total), reason=reason)
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Refund failed: {getattr(e, 'user_message', None) or str(e)}",
        )
    db.add(
        Refund(
            id=uuid.uuid4(),
            payment_id=payment.id,
            store_order_id=store_order.id,
            amount=store_order.total,
            reason=reason,
            stripe_refund_id=stripe_refund.id,
            status="succeeded" if stripe_refund.status == "succeeded" else "pending",
        )
    )
    # Inventory was only ever decremented once payment succeeded (see
    # _commit_inventory_and_clear_cart) — restore it now that it's cancelled.
    items = db.query(StoreOrderItem).filter(StoreOrderItem.store_order_id == store_order.id).all()
    for item in items:
        if item.product_id:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                product.quantity_available += item.quantity


def cancel_store_order(
    db: Session, customer_id: str, order_id: str, store_order_id: str, cancelled_by_role: str, cancelled_by, reason: str | None
) -> dict:
    order = get_owned_order(db, customer_id, order_id)
    store_order = db.query(StoreOrder).filter(StoreOrder.id == store_order_id, StoreOrder.order_id == order.id).first()
    if not store_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store order not found")
    if store_order.status not in _CANCELLABLE_STORE_ORDER_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot cancel a store order with status '{store_order.status}'",
        )

    payment = db.query(Payment).filter(Payment.order_id == order.id).first()

    if store_order.status in _REFUNDABLE_STORE_ORDER_STATUSES:
        _refund_store_order(db, payment, store_order, reason)
        payouts_service.handle_refund_ledger_adjustment(db, store_order)
    elif payment and payment.payment_method == "card" and payment.status not in _TERMINAL_PAYMENT_STATUSES:
        sibling_count = (
            db.query(StoreOrder)
            .filter(StoreOrder.order_id == order.id, StoreOrder.status.in_(_CANCELLABLE_STORE_ORDER_STATUSES))
            .count()
        )
        if sibling_count <= 1:
            # Only store order left on this PaymentIntent — cancel it outright.
            try:
                stripe_client.cancel_payment_intent(payment.stripe_payment_intent_id)
            except stripe.error.StripeError:
                pass  # already terminal on Stripe's side — proceed with local cancellation regardless
            payment.status = "canceled"
            db.add(PaymentCancellation(id=uuid.uuid4(), payment_id=payment.id, reason=reason))
        else:
            # Still-unpaid multi-farm order — shrink the shared PaymentIntent's
            # amount instead of cancelling it, so sibling stores can still pay.
            new_amount = round(float(payment.amount) - float(store_order.total), 2)
            try:
                stripe.PaymentIntent.modify(payment.stripe_payment_intent_id, amount=stripe_client.to_cents(new_amount))
            except stripe.error.StripeError:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This farm can't be removed individually right now — cancel the whole order and re-checkout instead.",
                )
            payment.amount = new_amount

    store_order.status = "cancelled"
    db.add(_record_cancellation(order.id, store_order.id, cancelled_by, cancelled_by_role, reason))
    db.commit()
    return build_order_out(db, order.id)


def cancel_whole_order(db: Session, customer_id: str, order_id: str, cancelled_by_role: str, cancelled_by, reason: str | None) -> dict:
    order = get_owned_order(db, customer_id, order_id)
    store_orders = (
        db.query(StoreOrder)
        .filter(StoreOrder.order_id == order.id, StoreOrder.status.in_(_CANCELLABLE_STORE_ORDER_STATUSES))
        .all()
    )
    if not store_orders:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Nothing left to cancel on this order")

    payment = db.query(Payment).filter(Payment.order_id == order.id).first()
    refundable = [so for so in store_orders if so.status in _REFUNDABLE_STORE_ORDER_STATUSES]
    pending = [so for so in store_orders if so.status == "pending_payment"]

    for so in refundable:
        _refund_store_order(db, payment, so, reason)
        payouts_service.handle_refund_ledger_adjustment(db, so)
        so.status = "cancelled"
        db.add(_record_cancellation(order.id, so.id, cancelled_by, cancelled_by_role, reason))

    if pending:
        if payment and payment.payment_method == "card" and payment.status not in _TERMINAL_PAYMENT_STATUSES:
            try:
                stripe_client.cancel_payment_intent(payment.stripe_payment_intent_id)
            except stripe.error.StripeError:
                pass  # already terminal on Stripe's side — proceed with local cancellation regardless
            payment.status = "canceled"
            db.add(PaymentCancellation(id=uuid.uuid4(), payment_id=payment.id, reason=reason))
        for so in pending:
            so.status = "cancelled"
            db.add(_record_cancellation(order.id, so.id, cancelled_by, cancelled_by_role, reason))

    db.commit()
    return build_order_out(db, order.id)


def mark_store_order_completed(db: Session, customer_id: str, order_id: str, store_order_id: str) -> dict:
    """Customer-initiated 'I received this' confirmation — there's no
    farmer-facing fulfillment tool yet to transition this automatically."""
    order = get_owned_order(db, customer_id, order_id)
    store_order = db.query(StoreOrder).filter(StoreOrder.id == store_order_id, StoreOrder.order_id == order.id).first()
    if not store_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store order not found")
    if store_order.status != "paid":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Only a paid order can be marked received (current status: '{store_order.status}')",
        )
    store_order.status = "completed"
    payouts_service.create_ledger_entry_for_completion(db, store_order)
    db.commit()
    return build_order_out(db, order.id)


def submit_store_order_rating(
    db: Session, customer_id: str, order_id: str, store_order_id: str, payload: SubmitRatingRequest
) -> dict:
    """Only once a store order is 'completed' — a customer rates the
    experience they actually had, not one still in progress. Submitting
    again revises the existing rating (see ratings_service.submit_rating)
    rather than failing or stacking duplicates."""
    order = get_owned_order(db, customer_id, order_id)
    store_order = db.query(StoreOrder).filter(StoreOrder.id == store_order_id, StoreOrder.order_id == order.id).first()
    if not store_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store order not found")
    if store_order.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Only a completed order can be rated (current status: '{store_order.status}')",
        )
    ratings_service.submit_rating(db, customer_id, store_order.farmer_id, store_order.id, payload)
    db.commit()
    return build_order_out(db, order.id)


def reorder(db: Session, customer_id: str, order_id: str) -> dict:
    """Re-adds a past order's items to the customer's cart ('Rebook') —
    skips anything no longer active or out of stock rather than failing
    the whole action, and caps each item at whatever room is actually left
    (current stock minus whatever's already in the cart), never oversells.
    Never re-adds more than the original line's own quantity even if more
    stock is now available — reordering isn't a chance to buy extra."""
    order = get_owned_order(db, customer_id, order_id)
    store_order_ids = [so.id for so in db.query(StoreOrder).filter(StoreOrder.order_id == order.id).all()]
    items = db.query(StoreOrderItem).filter(StoreOrderItem.store_order_id.in_(store_order_ids)).all()

    added_count = 0
    skipped_count = 0
    for item in items:
        product = (
            db.query(Product).filter(Product.id == item.product_id, Product.is_active.is_(True)).first()
            if item.product_id
            else None
        )
        if not product:
            skipped_count += 1
            continue

        cart_item = (
            db.query(CartItem).filter(CartItem.customer_id == customer_id, CartItem.product_id == item.product_id).first()
        )
        current_qty = cart_item.quantity if cart_item else 0
        room = product.quantity_available - current_qty
        if room <= 0:
            skipped_count += 1
            continue

        add_qty = min(item.quantity, room)
        if cart_item:
            cart_item.quantity += add_qty
        else:
            db.add(CartItem(id=uuid.uuid4(), customer_id=customer_id, product_id=item.product_id, quantity=add_qty))
        added_count += 1
        if add_qty < item.quantity:
            skipped_count += 1  # partially added — still flag it so the UI can say so

    db.commit()
    _, cart_item_count = _cart_totals(db, customer_id)
    return {"added_count": added_count, "skipped_count": skipped_count, "cart_item_count": cart_item_count}


# Statuses that represent money actually kept by a farmer — a cancelled
# store_order was refunded (or never captured), so it contributes nothing
# to spending/savings/insights even if the parent order also has paid
# siblings.
_KEPT_STORE_ORDER_STATUSES = ("paid", "completed")


# Rolling windows, not calendar-based (no "this month" edge cases to
# reason about) — 'all' or an unrecognized/missing key means no lower
# bound at all (genuine all-time), which is also what Account's own
# dashboard-summary call (no range param) relies on for its stat tiles.
_RANGE_WINDOWS = {
    "week": timedelta(days=7),
    "month": timedelta(days=30),
    "3m": timedelta(days=90),
    "6m": timedelta(days=180),
}


def get_dashboard_summary(db: Session, customer_id: str, range_key: str | None = None) -> dict:
    orders = db.query(Order).filter(Order.customer_id == customer_id).all()

    empty = {
        "orders_total": 0,
        "orders_active": 0,
        "orders_completed": 0,
        "orders_cancelled": 0,
        "spending_all_time": 0.0,
        "savings_all_time": 0.0,
        "average_order_value": 0.0,
        "activity_last_7_days": _empty_activity_buckets(),
        "favorite_farm": None,
        "most_ordered_product": None,
    }
    if not orders:
        return empty

    all_kept_store_orders = (
        db.query(StoreOrder)
        .filter(StoreOrder.order_id.in_({o.id for o in orders}), StoreOrder.status.in_(_KEPT_STORE_ORDER_STATUSES))
        .all()
    )

    # The recent-activity pulse is always the real last 7 days, independent
    # of the selected range filter below — a variable-granularity chart
    # (daily bars for a week, weekly/monthly bars for 6 months) was more
    # than this needed; a known, deliberate simplification.
    buckets = _empty_activity_buckets()
    buckets_by_date = {b["date"]: b for b in buckets}
    store_orders_by_order: dict = defaultdict(list)
    for so in all_kept_store_orders:
        store_orders_by_order[so.order_id].append(so)
    for order in orders:
        day_key = order.placed_at.date().isoformat()
        bucket = buckets_by_date.get(day_key)
        if bucket is None:
            continue  # outside the 7-day window
        bucket["order_count"] += 1
        bucket["amount"] = round(bucket["amount"] + sum(float(so.total) for so in store_orders_by_order.get(order.id, [])), 2)

    # Everything below IS scoped to range_key (all-time when absent/'all'/
    # unrecognized) — the Dashboard tab's date filter controls the whole
    # view (stat tiles + insights), not just a headline number.
    window_start = None
    if range_key in _RANGE_WINDOWS:
        window_start = datetime.now(timezone.utc) - _RANGE_WINDOWS[range_key]

    orders_in_range = [o for o in orders if window_start is None or o.placed_at >= window_start]
    order_ids_in_range = {o.id for o in orders_in_range}
    kept_store_orders = [so for so in all_kept_store_orders if so.order_id in order_ids_in_range]

    spending_total = round(sum(float(so.total) for so in kept_store_orders), 2)
    savings_total = round(sum(float(so.promo_discount) for so in kept_store_orders), 2)

    orders_with_spend = {so.order_id for so in kept_store_orders}
    average_order_value = round(spending_total / len(orders_with_spend), 2) if orders_with_spend else 0.0

    favorite_farm = None
    farm_stats: dict = defaultdict(lambda: {"farm_name": "", "count": 0, "spend": 0.0})
    for so in kept_store_orders:
        entry = farm_stats[so.farmer_id]
        entry["farm_name"] = so.farm_name
        entry["count"] += 1
        entry["spend"] += float(so.total)
    if farm_stats:
        top_farmer_id, top = max(farm_stats.items(), key=lambda kv: (kv[1]["count"], kv[1]["spend"]))
        favorite_farm = {"farmer_id": str(top_farmer_id), "farm_name": top["farm_name"], "order_count": top["count"]}

    most_ordered_product = None
    kept_store_order_ids = [so.id for so in kept_store_orders]
    if kept_store_order_ids:
        product_qty: dict = defaultdict(int)
        items = db.query(StoreOrderItem).filter(StoreOrderItem.store_order_id.in_(kept_store_order_ids)).all()
        for item in items:
            product_qty[item.product_name] += item.quantity
        if product_qty:
            top_name, top_qty = max(product_qty.items(), key=lambda kv: kv[1])
            most_ordered_product = {"product_name": top_name, "quantity": top_qty}

    return {
        "orders_total": len(orders_in_range),
        "orders_active": sum(1 for o in orders_in_range if o.status == "active"),
        "orders_completed": sum(1 for o in orders_in_range if o.status == "completed"),
        "orders_cancelled": sum(1 for o in orders_in_range if o.status == "cancelled"),
        "spending_all_time": spending_total,
        "savings_all_time": savings_total,
        "average_order_value": average_order_value,
        "activity_last_7_days": buckets,
        "favorite_farm": favorite_farm,
        "most_ordered_product": most_ordered_product,
    }


def _empty_activity_buckets() -> list[dict]:
    today = datetime.utcnow().date()
    return [
        {"date": (today - timedelta(days=offset)).isoformat(), "order_count": 0, "amount": 0.0}
        for offset in range(6, -1, -1)
    ]
