import random
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth_utils import create_access_token, hash_password, verify_password
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


def _reset_quota_if_new_week(user: models.User, db: Session) -> None:
    """The 20-Hour Quota Engine rolls over every Monday."""
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    if user.quota_week_start < week_start:
        user.weekly_hours_used = 0.0
        user.quota_week_start = week_start
        db.commit()
        db.refresh(user)


@router.post("/register", response_model=schemas.TokenResponse, status_code=201)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    is_verified_student = False
    if payload.role == models.UserRole.STUDENT:
        # Simplified verification: a .ac.lk / .edu style email or a student id auto-verifies.
        # In production this would call a real university registry / OTP check.
        if payload.student_id_number or any(
            domain in payload.email.lower() for domain in [".ac.lk", ".edu", "nibm"]
        ):
            is_verified_student = True

    user = models.User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        university_name=payload.university_name,
        student_id_number=payload.student_id_number,
        is_verified_student=is_verified_student,
        skills=payload.skills,
        bio=payload.bio,
        latitude=payload.latitude,
        longitude=payload.longitude,
        avatar_seed=str(random.randint(1, 999999)),
        quota_week_start=date.today() - timedelta(days=date.today().weekday()),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    _reset_quota_if_new_week(user, db)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))


# ---- Internal service-to-service endpoints (used by task/matching services) ----

@router.post("/internal/quota/check", response_model=schemas.QuotaCheckResponse)
def check_quota(payload: schemas.QuotaCheckRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.role != models.UserRole.STUDENT:
        # Standard workers have no cap - unlimited overflow capacity.
        return schemas.QuotaCheckResponse(
            user_id=user.id, eligible=True, remaining_hours=999, weekly_hour_cap=999
        )

    _reset_quota_if_new_week(user, db)
    remaining = user.weekly_hour_cap - user.weekly_hours_used
    eligible = remaining >= payload.requested_hours
    reason = None if eligible else "Requested hours exceed remaining weekly quota."
    return schemas.QuotaCheckResponse(
        user_id=user.id,
        eligible=eligible,
        remaining_hours=max(remaining, 0),
        weekly_hour_cap=user.weekly_hour_cap,
        reason=reason,
    )


@router.post("/internal/quota/deduct", response_model=schemas.UserOut)
def deduct_quota(payload: schemas.QuotaDeductRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.role == models.UserRole.STUDENT:
        _reset_quota_if_new_week(user, db)
        user.weekly_hours_used = min(user.weekly_hours_used + payload.hours, user.weekly_hour_cap + payload.hours)
        db.commit()
        db.refresh(user)
    return user
