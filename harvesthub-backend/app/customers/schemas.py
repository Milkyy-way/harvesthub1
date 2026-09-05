from pydantic import BaseModel
from typing import Optional

class CustomerProfileOut(BaseModel):
    address_street: str
    address_city: str
    address_state: str
    address_zip: str
    latitude: Optional[float]
    longitude: Optional[float]

    class Config:
        from_attributes = True