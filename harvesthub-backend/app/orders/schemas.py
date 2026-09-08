from pydantic import BaseModel
from typing import Literal, Optional

FulfillmentMethod = Literal["pickup", "delivery"]
# 'card' covers everything the native Stripe PaymentSheet offers (manually
# entered card, Apple Pay, Google Pay) — the sheet itself decides what to
# show based on device capability, the app doesn't distinguish which.
PaymentMethod = Literal["card", "cash_on_pickup"]


class DeliveryAddressIn(BaseModel):
    street: str
    city: str
    state: str
    zip: str


class CreateOrderGroup(BaseModel):
    farmer_id: str
    fulfillment_method: FulfillmentMethod
    delivery_address: Optional[DeliveryAddressIn] = None
    promo_code: Optional[str] = None


class CreateOrderRequest(BaseModel):
    groups: list[CreateOrderGroup]
    payment_method: PaymentMethod


class OrderItemOut(BaseModel):
    product_id: Optional[str]
    product_name: str
    unit: str
    unit_price: float
    quantity: int
    line_total: float


class StoreOrderOut(BaseModel):
    id: str
    farmer_id: str
    farm_name: str
    fulfillment_method: FulfillmentMethod
    pickup_address_street: Optional[str]
    pickup_address_city: Optional[str]
    pickup_address_state: Optional[str]
    pickup_address_zip: Optional[str]
    delivery_address_street: Optional[str]
    delivery_address_city: Optional[str]
    delivery_address_state: Optional[str]
    delivery_address_zip: Optional[str]
    subtotal: float
    promo_code: Optional[str]
    promo_discount: float
    delivery_fee: float
    service_fee: float
    tax: float
    total: float
    refunded_amount: float
    status: Literal["pending_payment", "paid", "completed", "cancelled"]
    items: list[OrderItemOut]


class PaymentOut(BaseModel):
    id: str
    amount: float
    currency: str
    payment_method: PaymentMethod
    status: str
    failure_reason: Optional[str]


class OrderOut(BaseModel):
    id: str
    status: Literal["active", "completed", "cancelled"]
    placed_at: str
    grand_total: float
    store_orders: list[StoreOrderOut]
    payment: Optional[PaymentOut]


class CreateOrderResponse(BaseModel):
    order: OrderOut
    client_secret: Optional[str]


class CancelRequest(BaseModel):
    reason: Optional[str] = None
