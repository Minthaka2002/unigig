import os
import uuid

import httpx

TASK_SERVICE_URL = os.getenv("TASK_SERVICE_URL", "http://task-service:8000")


async def notify_task_assigned(task_id: uuid.UUID, worker_id: uuid.UUID) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.patch(
            f"{TASK_SERVICE_URL}/tasks/{task_id}/assign", json={"worker_id": str(worker_id)}
        )
        resp.raise_for_status()
        return resp.json()
