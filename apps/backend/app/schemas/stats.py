from pydantic import BaseModel


class UserStatsResponse(BaseModel):
    days_used: int
    today_count: int
    total_works: int
    total_consumed: int
    total_recharge: int
    total_income: int
    reward_points: int
    monthly_consumed: int
