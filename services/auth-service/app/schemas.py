import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from .models import UserRole


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: UserRole
    university_name: Optional[str] = None
    student_id_number: Optional[str] = None
    skills: Optional[str] = None
    bio: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr
    role: UserRole
    university_name: Optional[str] = None
    is_verified_student: bool
    skills: Optional[str] = None
    bio: Optional[str] = None
    rating: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    weekly_hours_used: float
    weekly_hour_cap: float
    quota_week_start: date
    created_at: datetime

    class Config:
        from_attributes = True


class QuotaCheckRequest(BaseModel):
    user_id: uuid.UUID
    requested_hours: float


class QuotaCheckResponse(BaseModel):
    user_id: uuid.UUID
    eligible: bool
    remaining_hours: float
    weekly_hour_cap: float
    reason: Optional[str] = None


class QuotaDeductRequest(BaseModel):
    user_id: uuid.UUID
    hours: float


TokenResponse.model_rebuild()
