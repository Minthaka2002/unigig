"""
UniGig Curated Multi-Select Matching Queue
-------------------------------------------
A client picks up to 3 preferred workers for a task. This module pings them
one at a time: the current candidate has PING_TIMEOUT_SECONDS (default 60)
to accept before the queue automatically advances to the next choice.
"""
import asyncio
import os
from datetime import datetime, timedelta, timezone

from . import clients, models
from .database import SessionLocal

PING_TIMEOUT_SECONDS = int(os.getenv("PING_TIMEOUT_SECONDS", "60"))

# Tracks in-flight timeout watchers so they can be cancelled if a worker
# responds before the clock runs out.
_watchers: dict = {}


def _now():
    return datetime.now(timezone.utc)


def start_current_ping(db, queue: models.MatchQueue) -> None:
    ping = (
        db.query(models.Ping)
        .filter(models.Ping.queue_id == queue.id, models.Ping.position == queue.current_index)
        .first()
    )
    if not ping:
        return
    ping.expires_at = _now() + timedelta(seconds=PING_TIMEOUT_SECONDS)
    db.commit()

    task = asyncio.create_task(_watch_timeout(queue.id, ping.id))
    _watchers[str(ping.id)] = task


async def _watch_timeout(queue_id, ping_id) -> None:
    try:
        await asyncio.sleep(PING_TIMEOUT_SECONDS)
    except asyncio.CancelledError:
        return

    db = SessionLocal()
    try:
        ping = db.query(models.Ping).filter(models.Ping.id == ping_id).first()
        if not ping or ping.status != models.PingStatus.PENDING:
            return  # already responded to
        ping.status = models.PingStatus.TIMED_OUT
        ping.responded_at = _now()
        db.commit()

        queue = db.query(models.MatchQueue).filter(models.MatchQueue.id == queue_id).first()
        if queue and queue.status == models.QueueStatus.ACTIVE:
            await advance_queue(db, queue)
    finally:
        db.close()
        _watchers.pop(str(ping_id), None)


async def advance_queue(db, queue: models.MatchQueue) -> None:
    queue.current_index += 1
    if queue.current_index >= len(queue.worker_ids):
        queue.status = models.QueueStatus.EXHAUSTED
        db.commit()
        return
    db.commit()
    start_current_ping(db, queue)


async def handle_response(db, queue: models.MatchQueue, worker_id, accept: bool) -> models.Ping:
    ping = (
        db.query(models.Ping)
        .filter(
            models.Ping.queue_id == queue.id,
            models.Ping.worker_id == worker_id,
            models.Ping.position == queue.current_index,
        )
        .first()
    )
    if not ping or ping.status != models.PingStatus.PENDING:
        raise ValueError("This worker has no active ping on this task.")

    # Cancel the running timeout watcher for this ping - it's been answered.
    watcher = _watchers.pop(str(ping.id), None)
    if watcher:
        watcher.cancel()

    if not accept:
        ping.status = models.PingStatus.REJECTED
        ping.responded_at = _now()
        db.commit()
        await advance_queue(db, queue)
        return ping

    # Worker accepted - try to confirm the assignment with the task-service
    # (which re-checks the 20-hour quota before finalizing).
    try:
        await clients.notify_task_assigned(queue.task_id, worker_id)
    except Exception:
        # Quota check failed or task-service unreachable - treat as a rejection
        # and keep the queue moving instead of leaving the client stuck.
        ping.status = models.PingStatus.REJECTED
        ping.responded_at = _now()
        db.commit()
        await advance_queue(db, queue)
        raise

    ping.status = models.PingStatus.ACCEPTED
    ping.responded_at = _now()
    queue.matched_worker_id = worker_id
    queue.status = models.QueueStatus.MATCHED
    db.commit()

    # Mark any later-position pings as skipped since a match was found.
    later = (
        db.query(models.Ping)
        .filter(models.Ping.queue_id == queue.id, models.Ping.position > ping.position)
        .all()
    )
    for p in later:
        p.status = models.PingStatus.SKIPPED
    db.commit()

    return ping
