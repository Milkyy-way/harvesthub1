import uuid
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import stripe

from app.orders.models import Order, StoreOrder, StoreOrderItem, OrderCancellation
from app.payments.models import Payment, Refund, PaymentCancellation
from app.payments import stripe_client
from app.products.models import Product
from app.cart.models import CartItem
from app.checkout.service import build_checkout_preview
from app.checkout.schemas import CheckoutGroupRequest
from app.orders.schemas import CreateOrderRequest

# Terminal from the customer's point of view — no further payment action
# will change these without a new attempt (we don't build retries yet).
_TERMINAL_PAYMENT_STATUSES = ("succeeded", "canceled", "failed")
_CANCELLABLE_STORE_ORDER_STATUSES = ("pending_payment", "paid")


def get_owned_order(db: Session, customer_id: str, order_id: str) -> Order:
    order = db.query(Order).filter(Order.id == order_id, Order.customer_id == customer_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


def build_order_out(db: Session, order_id) -> dict:
    order = db.query(Order).filter(Order.id == order_id).first()
    store_orders = db.query(StoreOrder).filter(StoreOrder.order_id == order_id).order_by(StoreOrder.created_at).all()
    payment = db.query(Payment).filter(Payment.order_id == order_id).first()

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
        store_order_outs.append(
            {
                "id": str(so.id),
                "farmer_id": str(so.farmer_id),
                "farm_name": so.farm_name,
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


def list_orders(db: Session, customer_id: str, status_filter: str | None) -> list[dict]:
    q = db.query(Order).filter(Order.customer_id == customer_id)
    if status_filter:
        q = q.filter(Order.status == status_filter)
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

    if store_order.status == "paid":
        _refund_store_order(db, payment, store_order, reason)
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
    paid = [so for so in store_orders if so.status == "paid"]
    pending = [so for so in store_orders if so.status == "pending_payment"]

    for so in paid:
        _refund_store_order(db, payment, so, reason)
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
    db.commit()
    return build_order_out(db, order.id)
