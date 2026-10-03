from pydantic import BaseModel
from typing import Optional


# Deliberately no customer identity: a farmer sees what was rated and when,
# not who rated it — honest ratings matter more than attribution, and the
# farmer already had the customer's details while the order was active.
class ReceivedRatingOut(BaseModel):
    rating: int
    comment: Optional[str]
    created_at: str
    order_placed_at: Optional[str]
    items_summary: str  # e.g. "Carrots, Eggs +2 more"


class FarmerRatingsOut(BaseModel):
    average: Optional[float]  # same rounding as the customer-facing farm page
    count: int
    distribution: list[int]  # index 0 = number of 1-star ratings ... index 4 = 5-star
    recent: list[ReceivedRatingOut]  # newest first
