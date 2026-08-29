import math
import os
import uuid
from typing import List, Optional

import httpx

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8000")
PRICING_SERVICE_URL = os.getenv("PRICING_SERVICE_URL", "http://pricing-service:8000")
MATCHING_SERVICE_URL = os.getenv("MATCHING_SERVICE_URL", "http://matching-service:8000")


def haversine_km(lat1, lon1, lat2, lon2) -> Optional[float]:
    if None in (lat1, lon1, lat2, lon2):
        return None
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return round(r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)


async def fetch_workers(skill: Optional[str] = None) -> List[dict]:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{AUTH_SERVICE_URL}/users/workers", params={"skill": skill} if skill else {})
        resp.raise_for_status()
        return resp.json()


async def get_price_quote(task_id: uuid.UUID, payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{PRICING_SERVICE_URL}/pricing/quote", json={**payload, "task_id": str(task_id)}
        )
        resp.raise_for_status()
        return resp.json()


async def check_quota(user_id: uuid.UUID, requested_hours: float) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{AUTH_SERVICE_URL}/auth/internal/quota/check",
            json={"user_id": str(user_id), "requested_hours": requested_hours},
        )
        resp.raise_for_status()
        return resp.json()


async def deduct_quota(user_id: uuid.UUID, hours: float) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{AUTH_SERVICE_URL}/auth/internal/quota/deduct",
            json={"user_id": str(user_id), "hours": hours},
        )
        resp.raise_for_status()
        return resp.json()


async def start_matching_queue(task_id: uuid.UUID, client_id: uuid.UUID, worker_ids: List[uuid.UUID]) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{MATCHING_SERVICE_URL}/matching/queues",
            json={
                "task_id": str(task_id),
                "client_id": str(client_id),
                "worker_ids": [str(w) for w in worker_ids],
            },
        )
        resp.raise_for_status()
        return resp.json()
