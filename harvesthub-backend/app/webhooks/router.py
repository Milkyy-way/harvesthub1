from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session
import stripe

from app.core.database import get_db
from app.payments import stripe_client
from app.orders import service as orders_service

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Authenticated by Stripe signature (STRIPE_WEBHOOK_SECRET), not a customer
# JWT — this endpoint is called by Stripe's servers, not the app. This is
# the SOURCE OF TRUTH for payment reconciliation; the app's own
# /orders/{id}/sync-payment-status is only a client-triggered fallback for
# immediate UI feedback (see app/orders/service.py's docstring on
# reconcile_payment_intent — both call the same function, idempotently).


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(..., alias="Stripe-Signature"),
    db: Session = Depends(get_db),
):
    payload = await request.body()
    try:
        event = stripe_client.construct_webhook_event(payload, stripe_signature)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature")

    obj = event["data"]["object"]

    if event["type"] == "payment_intent.succeeded":
        orders_service.reconcile_payment_intent(
            db, "succeeded", obj["id"], charge_id=obj.get("latest_charge")
        )
    elif event["type"] == "payment_intent.payment_failed":
        last_error = obj.get("last_payment_error") or {}
        orders_service.reconcile_payment_intent(
            db, obj.get("status", "requires_payment_method"), obj["id"], failure_reason=last_error.get("message")
        )
    elif event["type"] == "payment_intent.canceled":
        orders_service.reconcile_payment_intent(db, "canceled", obj["id"])

    return {"received": True}
