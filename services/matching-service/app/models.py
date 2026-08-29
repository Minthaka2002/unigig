import enum
import uuid

from sqlalchemy import Column, String, Integer, DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from .database import Base


class QueueStatus(str, enum.Enum):
    ACTIVE = "active"
    MATCHED = "matched"
    EXHAUSTED = "exhausted"      # all 3 candidates rejected / timed out
    CANCELLED = "cancelled"


class PingStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    TIMED_OUT = "timed_out"
    SKIPPED = "skipped"          # never reached because an earlier candidate accepted


class MatchQueue(Base):
    __tablename__ = "match_queues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), nullable=False)
    worker_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=False)
    current_index = Column(Integer, default=0)
    status = Column(Enum(QueueStatus), default=QueueStatus.ACTIVE)
    matched_worker_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    pings = relationship("Ping", back_populates="queue", cascade="all, delete-orphan")


class Ping(Base):
    __tablename__ = "pings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    queue_id = Column(UUID(as_uuid=True), ForeignKey("match_queues.id"), nullable=False)
    worker_id = Column(UUID(as_uuid=True), nullable=False)
    position = Column(Integer, nullable=False)  # 0, 1, 2 (1st, 2nd, 3rd choice)
    status = Column(Enum(PingStatus), default=PingStatus.PENDING)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    responded_at = Column(DateTime(timezone=True), nullable=True)

    queue = relationship("MatchQueue", back_populates="pings")
