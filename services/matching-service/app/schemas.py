import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from .models import PingStatus, QueueStatus


class CreateQueueRequest(BaseModel):
    task_id: uuid.UUID
    client_id: uuid.UUID
    worker_ids: List[uuid.UUID] = Field(min_length=1, max_length=3)


class PingOut(BaseModel):
    id: uuid.UUID
    worker_id: uuid.UUID
    position: int
    status: PingStatus
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


class QueueOut(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    client_id: uuid.UUID
    worker_ids: List[uuid.UUID]
    current_index: int
    status: QueueStatus
    matched_worker_id: Optional[uuid.UUID]
    pings: List[PingOut] = []
    created_at: datetime

    class Config:
        from_attributes = True


class RespondRequest(BaseModel):
    worker_id: uuid.UUID
    accept: bool
