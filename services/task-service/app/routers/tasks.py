from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import clients, models, schemas
from ..database import get_db
from ..security import CurrentUser, get_current_user, require_role

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("", response_model=schemas.TaskOut, status_code=201)
async def create_task(
    payload: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role("client")),
):
    task = models.Task(client_id=current_user.id, **payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)

    # Ask the pricing-service for a Hardness Score quote as soon as the task exists.
    try:
        quote = await clients.get_price_quote(
            task.id,
            {
                "category": task.category,
                "skill_complexity": task.skill_complexity,
                "physical_intensity": task.physical_intensity,
                "hours_until_start": task.hours_until_start,
                "estimated_duration_hours": task.estimated_duration_hours,
                "is_peak_demand": task.is_peak_demand,
            },
        )
        task.hardness_score = quote["hardness_score"]
        task.final_price = quote["final_price"]
        db.commit()
        db.refresh(task)
    except Exception:
        # Pricing is best-effort at creation time; client can still proceed and retry.
        pass

    return task


@router.get("", response_model=List[schemas.TaskOut])
def list_tasks(
    status: Optional[models.TaskStatus] = None,
    mine: bool = False,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    query = db.query(models.Task)
    if status:
        query = query.filter(models.Task.status == status)
    if mine:
        if current_user.role == "client":
            query = query.filter(models.Task.client_id == current_user.id)
        else:
            query = query.filter(models.Task.assigned_worker_id == current_user.id)
    return query.order_by(models.Task.created_at.desc()).all()


@router.get("/{task_id}", response_model=schemas.TaskOut)
def get_task(task_id: UUID, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return task


@router.get("/{task_id}/candidates", response_model=List[schemas.CandidateWorker])
async def get_candidates(task_id: UUID, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    workers = await clients.fetch_workers(skill=task.category)
    candidates = []
    for w in workers:
        distance = clients.haversine_km(task.latitude, task.longitude, w.get("latitude"), w.get("longitude"))
        candidates.append(
            schemas.CandidateWorker(
                id=w["id"],
                full_name=w["full_name"],
                role=w["role"],
                is_verified_student=w["is_verified_student"],
                rating=w["rating"],
                skills=w.get("skills"),
                distance_km=distance,
            )
        )

    # Verified students first (priority tier), then by distance, then by rating.
    candidates.sort(
        key=lambda c: (
            c.role != "student" or not c.is_verified_student,
            c.distance_km if c.distance_km is not None else 9999,
            -c.rating,
        )
    )
    return candidates[:10]


@router.post("/{task_id}/select-workers", response_model=schemas.TaskOut)
async def select_workers(
    task_id: UUID,
    payload: schemas.SelectWorkersRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role("client")),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    if task.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this task.")
    if task.status != models.TaskStatus.OPEN:
        raise HTTPException(status_code=400, detail="Task is no longer accepting candidate selection.")

    # Kick off the curated multi-select queue in the matching-service (60s ping/timeout).
    await clients.start_matching_queue(task.id, task.client_id, payload.worker_ids)

    task.status = models.TaskStatus.MATCHING
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/assign", response_model=schemas.TaskOut)
async def assign_worker(task_id: UUID, payload: schemas.AssignRequest, db: Session = Depends(get_db)):
    """Called back by the matching-service the instant a worker accepts a ping."""
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    quota = await clients.check_quota(payload.worker_id, task.estimated_duration_hours)
    if not quota["eligible"]:
        raise HTTPException(status_code=409, detail=quota.get("reason", "Worker is not eligible (quota)."))

    await clients.deduct_quota(payload.worker_id, task.estimated_duration_hours)

    task.assigned_worker_id = payload.worker_id
    task.status = models.TaskStatus.ASSIGNED
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/start", response_model=schemas.TaskOut)
def start_task(task_id: UUID, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task or task.status != models.TaskStatus.ASSIGNED:
        raise HTTPException(status_code=400, detail="Task cannot be started from its current state.")
    task.status = models.TaskStatus.IN_PROGRESS
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/complete", response_model=schemas.TaskOut)
def complete_task(task_id: UUID, db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task or task.status not in (models.TaskStatus.IN_PROGRESS, models.TaskStatus.ASSIGNED):
        raise HTTPException(status_code=400, detail="Task cannot be completed from its current state.")
    task.status = models.TaskStatus.COMPLETED
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/cancel", response_model=schemas.TaskOut)
def cancel_task(task_id: UUID, db: Session = Depends(get_db), current_user: CurrentUser = Depends(require_role("client"))):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task or task.client_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found.")
    task.status = models.TaskStatus.CANCELLED
    db.commit()
    db.refresh(task)
    return task


# ---------------------------------------------------------------------------
# Applications - lets a worker proactively apply to an OPEN task instead of
# only waiting to be picked through the client's curated matching queue.
# ---------------------------------------------------------------------------

@router.get("/applications/mine", response_model=List[schemas.ApplicationOut])
def list_my_applications(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role("student", "standard_worker")),
):
    return (
        db.query(models.TaskApplication)
        .filter(models.TaskApplication.worker_id == current_user.id)
        .order_by(models.TaskApplication.created_at.desc())
        .all()
    )


@router.post("/{task_id}/apply", response_model=schemas.ApplicationOut, status_code=201)
async def apply_to_task(
    task_id: UUID,
    payload: schemas.ApplyRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role("student", "standard_worker")),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    if task.status != models.TaskStatus.OPEN:
        raise HTTPException(status_code=400, detail="This task is no longer open for applications.")

    existing = (
        db.query(models.TaskApplication)
        .filter(models.TaskApplication.task_id == task_id, models.TaskApplication.worker_id == current_user.id)
        .first()
    )
    if existing and existing.status != models.ApplicationStatus.WITHDRAWN:
        raise HTTPException(status_code=409, detail="You have already applied to this task.")

    # A quick quota pre-check so a student doesn't apply to something they
    # couldn't actually accept later - the authoritative check still runs on accept.
    quota = await clients.check_quota(current_user.id, task.estimated_duration_hours)
    if not quota["eligible"]:
        raise HTTPException(
            status_code=409, detail=quota.get("reason", "You don't have enough weekly hours left for this task.")
        )

    if existing:
        existing.status = models.ApplicationStatus.PENDING
        existing.message = payload.message
        db.commit()
        db.refresh(existing)
        return existing

    application = models.TaskApplication(task_id=task_id, worker_id=current_user.id, message=payload.message)
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


@router.get("/{task_id}/applications", response_model=List[schemas.ApplicationOut])
def list_applications(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role("client")),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    if task.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this task.")

    return (
        db.query(models.TaskApplication)
        .filter(
            models.TaskApplication.task_id == task_id,
            models.TaskApplication.status != models.ApplicationStatus.WITHDRAWN,
        )
        .order_by(models.TaskApplication.created_at.asc())
        .all()
    )


@router.delete("/{task_id}/applications/mine", status_code=204)
def withdraw_application(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role("student", "standard_worker")),
):
    application = (
        db.query(models.TaskApplication)
        .filter(models.TaskApplication.task_id == task_id, models.TaskApplication.worker_id == current_user.id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")
    application.status = models.ApplicationStatus.WITHDRAWN
    db.commit()
    return None


@router.post("/{task_id}/applications/{application_id}/accept", response_model=schemas.TaskOut)
async def accept_application(
    task_id: UUID,
    application_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role("client")),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    if task.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this task.")
    if task.status not in (models.TaskStatus.OPEN, models.TaskStatus.MATCHING):
        raise HTTPException(status_code=400, detail="Task is no longer open for assignment.")

    application = (
        db.query(models.TaskApplication)
        .filter(models.TaskApplication.id == application_id, models.TaskApplication.task_id == task_id)
        .first()
    )
    if not application or application.status != models.ApplicationStatus.PENDING:
        raise HTTPException(status_code=404, detail="Pending application not found.")

    quota = await clients.check_quota(application.worker_id, task.estimated_duration_hours)
    if not quota["eligible"]:
        raise HTTPException(status_code=409, detail=quota.get("reason", "Applicant is not eligible (quota)."))
    await clients.deduct_quota(application.worker_id, task.estimated_duration_hours)

    application.status = models.ApplicationStatus.ACCEPTED
    task.assigned_worker_id = application.worker_id
    task.status = models.TaskStatus.ASSIGNED

    other_pending = (
        db.query(models.TaskApplication)
        .filter(
            models.TaskApplication.task_id == task_id,
            models.TaskApplication.id != application_id,
            models.TaskApplication.status == models.ApplicationStatus.PENDING,
        )
        .all()
    )
    for app in other_pending:
        app.status = models.ApplicationStatus.REJECTED

    db.commit()
    db.refresh(task)
    return task
