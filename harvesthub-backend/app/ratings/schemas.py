from pydantic import BaseModel, Field
from typing import Optional


class SubmitRatingRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class RatingOut(BaseModel):
    rating: int
    comment: Optional[str]
    created_at: str
