from pydantic import BaseModel
from typing import Optional

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
