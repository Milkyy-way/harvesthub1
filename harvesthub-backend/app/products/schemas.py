from pydantic import BaseModel
from typing import Literal, Optional

class HarvestPickOut(BaseModel):
    id: str
    name: str
    price: float
    unit: str
    image_url: Optional[str]
    farmer_id: str
    farm_name: str
    distance_km: float
    tag: Optional[Literal["farmer_favorite", "limited", "just_picked"]]

class HarvestPicksResponse(BaseModel):
    items: list[HarvestPickOut]

class ProductOut(BaseModel):
    id: str
    farmer_id: str
    category_id: str
    category_slug: str
    category_name: str
    name: str
    description: Optional[str]
    price: float
    unit: str
    quantity_available: int
    image_url: Optional[str]
    # Current customer's own cart quantity for this product — lets the farm
    # detail page's stepper render the right starting value without a
    # separate /cart round trip on load (see app/products/service.py).
    cart_quantity: int
