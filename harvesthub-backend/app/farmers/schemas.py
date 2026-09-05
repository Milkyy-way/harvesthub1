from pydantic import BaseModel
from typing import Optional

class FarmerFeedCard(BaseModel):
    id: str
    farm_name: str
    photo_url: Optional[str]
    distance_km: float
    matched_categories: list[str]

class FarmerFeedResponse(BaseModel):
    items: list[FarmerFeedCard]
    limit: int
    offset: int
    total: int

class CertificationOut(BaseModel):
    cert_type: str
    cert_name: str

class FarmerDetailOut(BaseModel):
    id: str
    farm_name: str
    photo_url: Optional[str]
    bio: Optional[str]
    address_city: Optional[str]
    address_state: Optional[str]
    distance_km: Optional[float]
    farm_types: list[str]
    years_in_operation: Optional[int]
    certifications: list[CertificationOut]
