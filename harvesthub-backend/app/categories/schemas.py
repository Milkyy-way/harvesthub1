from pydantic import BaseModel
from typing import Optional

class CategoryOut(BaseModel):
    id: str
    slug: str
    name: str
    sort_order: int
    icon_name: Optional[str]

    class Config:
        from_attributes = True
