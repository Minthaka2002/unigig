from dataclasses import asdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..engine import CATEGORY_BASE_RATES, HardnessInputs, HardnessScoreEngine

router = APIRouter(prefix="/pricing", tags=["pricing"])
engine = HardnessScoreEngine()


@router.get("/categories", response_model=schemas.CategoryRatesResponse)
def get_categories():
    return schemas.CategoryRatesResponse(rates=CATEGORY_BASE_RATES)


@router.post("/quote", response_model=schemas.QuoteResponse)
def create_quote(payload: schemas.QuoteRequest, db: Session = Depends(get_db)):
    inputs = HardnessInputs(
        category=payload.category,
        skill_complexity=payload.skill_complexity,
        physical_intensity=payload.physical_intensity,
        hours_until_start=payload.hours_until_start,
        estimated_duration_hours=payload.estimated_duration_hours,
        is_peak_demand=payload.is_peak_demand,
        client_rating_risk=payload.client_rating_risk,
    )
    breakdown = engine.calculate(inputs)

    quote = models.PricingQuote(
        task_id=payload.task_id,
        category=payload.category,
        hardness_score=breakdown.hardness_score,
        base_rate=breakdown.base_rate,
        final_price=breakdown.final_price,
        breakdown=asdict(breakdown),
    )
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return quote
