import enum
import uuid

from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Enum, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from .database import Base


class TaskStatus(str, enum.Enum):
    OPEN = "open"                # posted, candidates not yet chosen
    MATCHING = "matching"        # curated queue actively pinging workers
    ASSIGNED = "assigned"        # a worker accepted
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False)

    skill_complexity = Column(Integer, default=1)
    physical_intensity = Column(Integer, default=1)
    hours_until_start = Column(Float, default=24.0)
    estimated_duration_hours = Column(Float, nullable=False)
    is_peak_demand = Column(Boolean, default=False)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_label = Column(String, nullable=True)

    hardness_score = Column(Float, nullable=True)
    final_price = Column(Float, nullable=True)

    status = Column(Enum(TaskStatus), default=TaskStatus.OPEN)
    assigned_worker_id = Column(UUID(as_uuid=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class TaskApplication(Base):
    """Lets a student/worker proactively apply to an OPEN task instead of
    waiting to be picked by a client through the curated queue."""

    __tablename__ = "task_applications"
    __table_args__ = (UniqueConstraint("task_id", "worker_id", name="uq_task_worker_application"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    worker_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    message = Column(String, nullable=True)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.PENDING)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
