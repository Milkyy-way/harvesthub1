from pydantic import BaseModel
from typing import Optional

class CartLineItemOut(BaseModel):
    product_id: str
    name: str
    unit: str
    price: float
    quantity: int
    quantity_available: int
    line_total: float

# One entry per farmer with items in the cart — the cart is grouped this
# way because checkout splits it into one order per farmer (separate
# fulfillment choice, separate total), not one order for the whole cart.
# Carries the farm's own address/coordinates so the cart page can offer a
# pickup-at-the-farm option without a second round trip to /farmers/{id}.
class CartFarmGroupOut(BaseModel):
    farmer_id: str
    farm_name: str
    photo_url: Optional[str]
    address_street: Optional[str]
    address_city: Optional[str]
    address_state: Optional[str]
    address_zip: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    items: list[CartLineItemOut]
    subtotal: float

class CartSummary(BaseModel):
    farms: list[CartFarmGroupOut]
    total: float
    item_count: int

class CartActionResponse(BaseModel):
    product_id: str
    quantity: int
    cart_total: float
    cart_item_count: int
