from typing import Optional
from pydantic import BaseModel


class RatingStatsResponse(BaseModel):
    avg_rating: float
    total_count: int
    distribution: dict[int, int]  # {1: count, 2: count, ...}
