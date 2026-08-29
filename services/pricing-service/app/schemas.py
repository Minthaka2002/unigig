import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class QuoteRequest(BaseModel):
    task_id: Optional[uuid.UUID] = None
    category: str
    skill_complexity: int = Field(ge=1, le=5)
    physical_intensity: int = Field(ge=1, le=5)
    hours_until_start: float = Field(ge=0)
    estimated_duration_hours: float = Field(gt=0)
    is_peak_demand: bool = False
    client_rating_risk: float = Field(default=0.0, ge=0, le=1)


class QuoteResponse(BaseModel):
    id: uuid.UUID
    task_id: Optional[uuid.UUID]
    category: str
    hardness_score: float
    base_rate: float
    final_price: float
    currency: str = "LKR"
    breakdown: dict
    created_at: datetime

    class Config:
        from_attributes = True


class CategoryRatesResponse(BaseModel):
    rates: dict
