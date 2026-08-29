"""
UniGig AI-Driven Dynamic Pricing Model
---------------------------------------
Computes the "Hardness Score" for a task and converts it into a fair price.

The score blends four weighted inputs into a single 0-1 difficulty index,
which is then applied as a multiplier on top of a category base rate.
This keeps pricing transparent (every quote returns its full breakdown)
while removing manual client/worker negotiation friction.
"""
from dataclasses import dataclass, field
from typing import Dict


# LKR / hour baseline rates per task category. Tunable without touching the algorithm.
CATEGORY_BASE_RATES: Dict[str, float] = {
    "tutoring": 1200.0,
    "tech_help": 1500.0,
    "graphic_design": 1600.0,
    "delivery": 700.0,
    "moving_labor": 900.0,
    "event_staffing": 850.0,
    "house_chores": 650.0,
    "data_entry": 800.0,
    "photography": 1800.0,
    "other": 750.0,
}

# Weights must sum to 1.0
WEIGHT_SKILL = 0.35
WEIGHT_PHYSICAL = 0.20
WEIGHT_URGENCY = 0.25
WEIGHT_OPPORTUNITY_COST = 0.20


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


@dataclass
class HardnessInputs:
    category: str
    skill_complexity: int  # 1-5
    physical_intensity: int  # 1-5
    hours_until_start: float  # lower == more urgent
    estimated_duration_hours: float
    is_peak_demand: bool = False  # e.g. exam week, weekend evening
    client_rating_risk: float = 0.0  # 0-1, low client rating raises opportunity cost


@dataclass
class HardnessBreakdown:
    skill_component: float
    physical_component: float
    urgency_component: float
    opportunity_cost_component: float
    hardness_score: float
    base_rate: float
    hardness_multiplier: float
    subtotal: float
    peak_demand_surcharge: float
    final_price: float
    currency: str = "LKR"


class HardnessScoreEngine:
    """Encapsulates the full pricing algorithm as a reusable, testable unit."""

    MIN_MULTIPLIER = 1.0
    MAX_MULTIPLIER = 2.75

    def __init__(self, category_rates: Dict[str, float] = None):
        self.category_rates = category_rates or CATEGORY_BASE_RATES

    def _urgency_factor(self, hours_until_start: float) -> float:
        # < 1 hour = maximum urgency (1.0), > 72 hours = minimal urgency (0.0)
        if hours_until_start <= 1:
            return 1.0
        if hours_until_start >= 72:
            return 0.0
        return 1.0 - (hours_until_start - 1) / 71.0

    def _opportunity_cost_factor(self, duration: float, client_risk: float) -> float:
        # Longer tasks eat more into a student's scarce 20-hour weekly quota,
        # so they carry a higher opportunity cost per hour, same for riskier clients.
        duration_component = _clamp(duration / 8.0)
        return _clamp(0.7 * duration_component + 0.3 * client_risk)

    def calculate(self, inputs: HardnessInputs) -> HardnessBreakdown:
        base_rate = self.category_rates.get(inputs.category, self.category_rates["other"])

        skill_component = _clamp((inputs.skill_complexity - 1) / 4.0)
        physical_component = _clamp((inputs.physical_intensity - 1) / 4.0)
        urgency_component = self._urgency_factor(inputs.hours_until_start)
        opportunity_component = self._opportunity_cost_factor(
            inputs.estimated_duration_hours, inputs.client_rating_risk
        )

        hardness_score = _clamp(
            WEIGHT_SKILL * skill_component
            + WEIGHT_PHYSICAL * physical_component
            + WEIGHT_URGENCY * urgency_component
            + WEIGHT_OPPORTUNITY_COST * opportunity_component
        )

        multiplier = self.MIN_MULTIPLIER + hardness_score * (self.MAX_MULTIPLIER - self.MIN_MULTIPLIER)

        subtotal = base_rate * inputs.estimated_duration_hours * multiplier
        peak_surcharge = subtotal * 0.15 if inputs.is_peak_demand else 0.0
        final_price = round(subtotal + peak_surcharge, 2)

        return HardnessBreakdown(
            skill_component=round(skill_component, 3),
            physical_component=round(physical_component, 3),
            urgency_component=round(urgency_component, 3),
            opportunity_cost_component=round(opportunity_component, 3),
            hardness_score=round(hardness_score, 3),
            base_rate=base_rate,
            hardness_multiplier=round(multiplier, 3),
            subtotal=round(subtotal, 2),
            peak_demand_surcharge=round(peak_surcharge, 2),
            final_price=final_price,
        )
