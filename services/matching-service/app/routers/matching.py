from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..queue_manager import handle_response, start_current_ping

router = APIRouter(prefix="/matching", tags=["matching"])


@router.post("/queues", response_model=schemas.QueueOut, status_code=201)
def create_queue(payload: schemas.CreateQueueRequest, db: Session = Depends(get_db)):
    existing = (
        db.query(models.MatchQueue)
        .filter(models.MatchQueue.task_id == payload.task_id, models.MatchQueue.status == models.QueueStatus.ACTIVE)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="A matching queue is already active for this task.")

    queue = models.MatchQueue(
        task_id=payload.task_id, client_id=payload.client_id, worker_ids=payload.worker_ids
    )
    db.add(queue)
    db.flush()

    for i, worker_id in enumerate(payload.worker_ids):
        db.add(models.Ping(queue_id=queue.id, worker_id=worker_id, position=i))
    db.commit()
    db.refresh(queue)

    start_current_ping(db, queue)
    db.refresh(queue)
    return queue


@router.get("/queues/task/{task_id}", response_model=schemas.QueueOut)
def get_queue_for_task(task_id: UUID, db: Session = Depends(get_db)):
    queue = (
        db.query(models.MatchQueue)
        .filter(models.MatchQueue.task_id == task_id)
        .order_by(models.MatchQueue.created_at.desc())
        .first()
    )
    if not queue:
        raise HTTPException(status_code=404, detail="No matching queue found for this task.")
    return queue


@router.get("/queues/worker/{worker_id}/pending", response_model=list[schemas.QueueOut])
def get_pending_for_worker(worker_id: UUID, db: Session = Depends(get_db)):
    """All active queues currently pinging this worker (their live 60s job offers)."""
    queues = db.query(models.MatchQueue).filter(models.MatchQueue.status == models.QueueStatus.ACTIVE).all()
    result = []
    for q in queues:
        if q.current_index < len(q.worker_ids) and q.worker_ids[q.current_index] == worker_id:
            result.append(q)
    return result


@router.post("/queues/{queue_id}/respond", response_model=schemas.QueueOut)
async def respond_to_ping(queue_id: UUID, payload: schemas.RespondRequest, db: Session = Depends(get_db)):
    queue = db.query(models.MatchQueue).filter(models.MatchQueue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found.")
    if queue.status != models.QueueStatus.ACTIVE:
        raise HTTPException(status_code=400, detail=f"Queue is no longer active (status: {queue.status.value}).")

    try:
        await handle_response(db, queue, payload.worker_id, payload.accept)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        db.refresh(queue)
        raise HTTPException(
            status_code=409,
            detail="Could not confirm assignment (worker may be over their weekly quota). Queue advanced to next candidate.",
        )

    db.refresh(queue)
    return queue
