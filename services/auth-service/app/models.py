import enum
import uuid
from datetime import date

from sqlalchemy import Column, String, Boolean, Float, Date, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID

from .database import Base


class UserRole(str, enum.Enum):
    STUDENT = "student"
    STANDARD_WORKER = "standard_worker"
    CLIENT = "client"


WEEKLY_STUDENT_HOUR_CAP = 20.0


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)

    university_name = Column(String, nullable=True)
    student_id_number = Column(String, nullable=True)
    is_verified_student = Column(Boolean, default=False)

    skills = Column(String, nullable=True)  # comma separated tags
    bio = Column(String, nullable=True)
    rating = Column(Float, default=5.0)
    avatar_seed = Column(String, nullable=True)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # 20-hour quota engine (students only)
    weekly_hours_used = Column(Float, default=0.0)
    quota_week_start = Column(Date, default=date.today)
    weekly_hour_cap = Column(Float, default=WEEKLY_STUDENT_HOUR_CAP)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
