import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from .models import ApplicationStatus, TaskStatus


class TaskCreate(BaseModel):
    title: str
    description: str
    category: str
    skill_complexity: int = Field(ge=1, le=5, default=1)
    physical_intensity: int = Field(ge=1, le=5, default=1)
    hours_until_start: float = Field(ge=0, default=24.0)
    estimated_duration_hours: float = Field(gt=0)
    is_peak_demand: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_label: Optional[str] = None


class TaskOut(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    title: str
    description: str
    category: str
    skill_complexity: int
    physical_intensity: int
    hours_until_start: float
    estimated_duration_hours: float
    is_peak_demand: bool
    latitude: Optional[float]
    longitude: Optional[float]
    location_label: Optional[str]
    hardness_score: Optional[float]
    final_price: Optional[float]
    status: TaskStatus
    assigned_worker_id: Optional[uuid.UUID]
    created_at: datetime

    class Config:
        from_attributes = True


class CandidateWorker(BaseModel):
    id: uuid.UUID
    full_name: str
    role: str
    is_verified_student: bool
    rating: float
    skills: Optional[str]
    distance_km: Optional[float]


class SelectWorkersRequest(BaseModel):
    worker_ids: List[uuid.UUID] = Field(min_length=1, max_length=3)


class AssignRequest(BaseModel):
    worker_id: uuid.UUID


class ApplyRequest(BaseModel):
    message: Optional[str] = Field(default=None, max_length=500)


class ApplicationOut(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    worker_id: uuid.UUID
    message: Optional[str]
    status: ApplicationStatus
    created_at: datetime

    class Config:
        from_attributes = True
