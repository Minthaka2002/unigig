from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=schemas.UserOut)
def read_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.get("/workers", response_model=List[schemas.UserOut])
def list_workers(skill: Optional[str] = None, db: Session = Depends(get_db)):
    """Used by the matching-service to build the curated worker queue.
    Students (verified) are returned first, then standard workers - implementing
    the 'prioritize verified university students' rule at the data layer.
    """
    query = db.query(models.User).filter(models.User.role != models.UserRole.CLIENT)
    if skill:
        query = query.filter(models.User.skills.ilike(f"%{skill}%"))

    workers = query.all()
    workers.sort(key=lambda w: (w.role != models.UserRole.STUDENT, -(w.rating or 0)))
    return workers


@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: UUID, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user
