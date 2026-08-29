import uuid

from sqlalchemy import Column, String, Float, DateTime, JSON, func
from sqlalchemy.dialects.postgresql import UUID

from .database import Base


class PricingQuote(Base):
    __tablename__ = "pricing_quotes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    category = Column(String, nullable=False)
    hardness_score = Column(Float, nullable=False)
    base_rate = Column(Float, nullable=False)
    final_price = Column(Float, nullable=False)
    breakdown = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
