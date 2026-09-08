import stripe
from app.core.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

# Test-mode friendly by construction: whatever key is in STRIPE_SECRET_KEY
# (sk_test_... during development, sk_live_... only once this is actually
# ready to take real money) is what every call below uses — there's no
# separate "dummy" code path to maintain. Stripe's own test mode (test API
# keys + test card numbers, e.g. 4242 4242 4242 4242) is what makes this
# safe to exercise end-to-end without moving real money.


def to_cents(amount: float) -> int:
    return int(round(amount * 100))


def create_payment_intent(amount: float, currency: str, order_id: str, customer_id: str) -> stripe.PaymentIntent:
    return stripe.PaymentIntent.create(
        amount=to_cents(amount),
        currency=currency,
        automatic_payment_methods={"enabled": True},
        metadata={"order_id": order_id, "customer_id": customer_id},
    )


def retrieve_payment_intent(payment_intent_id: str) -> stripe.PaymentIntent:
    return stripe.PaymentIntent.retrieve(payment_intent_id)


def cancel_payment_intent(payment_intent_id: str) -> stripe.PaymentIntent:
    intent = stripe.PaymentIntent.retrieve(payment_intent_id)
    return intent.cancel(cancellation_reason="requested_by_customer")


def create_refund(payment_intent_id: str, amount: float, reason: str | None = None) -> stripe.Refund:
    params = {"payment_intent": payment_intent_id, "amount": to_cents(amount)}
    if reason:
        params["metadata"] = {"reason": reason}
    return stripe.Refund.create(**params)


def construct_webhook_event(payload: bytes, sig_header: str) -> stripe.Event:
    return stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
