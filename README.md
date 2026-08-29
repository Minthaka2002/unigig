# UniGig — On-Demand Service Platform for University Students

A hyper-local gig marketplace connecting verified university students (and standard
workers, as overflow) with clients who need short-term tasks done — built as a
final-year HNDSE project around three core mechanics:

1. **20-Hour Quota Engine** — students are hard-capped at 20 working hours/week,
   enforced server-side and reset automatically every Monday.
2. **Curated Multi-Select Matching Queue** — a client picks up to 3 preferred
   workers; the system pings them one at a time with a real 60-second
   accept/timeout window before automatically advancing to the next choice.
   Workers can also **apply directly** to any open task instead of waiting to
   be picked — the client sees applicants alongside their curated shortlist
   and can accept one immediately (still subject to the quota check).
3. **AI-Driven "Hardness Score" Pricing** — every task is priced automatically
   from skill complexity, physical intensity, urgency, and opportunity cost,
   removing manual negotiation.

## Architecture

This project uses a **microservices architecture**, split into the smallest set
of services that still gives each core mechanic its own deployable, independently
testable boundary — chosen specifically to be buildable within a 16-week academic
timeline (see `PROJECT_PLAN.md`).

```
                         ┌─────────────┐
                         │   Frontend   │  React + Vite + Tailwind
                         │  (nginx :3000)│
                         └──────┬───────┘
                                │ /api/*
                         ┌──────▼───────┐
                         │   Gateway     │  nginx reverse proxy
                         │    (:8000)    │
                         └──┬───┬───┬───┬┘
              ┌─────────────┘   │   │   └─────────────┐
              ▼                 ▼   ▼                  ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │Auth Service │  │Task Service │  │Matching Svc │  │Pricing Svc  │
     │  (:8001)    │  │  (:8002)    │  │  (:8003)    │  │  (:8004)    │
     │ users, JWT, │  │ job posting,│  │ 60s ping/   │  │ Hardness    │
     │ quota engine│  │ candidates  │  │ timeout FSM │  │ Score engine│
     └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
            │                │                │                │
            └────────────────┴───────┬────────┴────────────────┘
                                      ▼
                            ┌──────────────────┐
                            │   PostgreSQL      │
                            │ (1 database per   │
                            │    service)        │
                            └──────────────────┘
```

Each service is an independent FastAPI (Python) app with its own database and
Dockerfile, communicating over plain REST (`httpx`) — a deliberately simple
inter-service protocol that's easy to explain and defend for an academic project.
A natural "phase 2" extension (mentioned in the report) would swap these
synchronous calls for an async message broker (RabbitMQ/Kafka) for the
matching → task-service assignment callback.

| Service            | Responsibility                                             | Port |
|--------------------|-------------------------------------------------------------|------|
| `auth-service`     | Registration, login, JWT issuance, student verification, the 20-hour quota engine | 8001 |
| `task-service`     | Task/job CRUD, candidate discovery, orchestrates pricing + matching | 8002 |
| `matching-service` | Curated multi-select queue, 60-second ping/timeout state machine | 8003 |
| `pricing-service`  | Hardness Score dynamic pricing engine                       | 8004 |
| `gateway`          | Single nginx entry point routing `/api/*` to each service   | 8000 |
| `frontend`         | React SPA (client + student dashboards)                     | 3000 |

## Tech stack

- **Backend:** Python 3.11, FastAPI, SQLAlchemy, PostgreSQL, JWT (python-jose), bcrypt (passlib)
- **Frontend:** React 18, Vite, Tailwind CSS, React Router
- **Infra:** Docker Compose, nginx (gateway + static hosting)

> Note: the original proposal specified Java/Spring Boot and PostGIS. This build
> uses Python/FastAPI instead (equally capable of async, OOP-structured services)
> and plain latitude/longitude + a Haversine distance calculation in `task-service`
> rather than PostGIS, to keep local setup to a single `docker-compose up` with
> no extra Postgres extensions to install. Swapping in PostGIS later is a
> contained change inside `task-service` only.

## Running locally

**Prerequisites:** Docker Desktop (or Docker Engine + Compose) installed and running.

```bash
cd unigig
docker-compose up --build
```

First build takes a few minutes (installing Python + npm dependencies). Once it's
up:

- **App:** http://localhost:3000
- **API gateway:** http://localhost:8000
- Individual service docs (Swagger UI), useful for testing/demoing each
  microservice independently:
  - Auth: http://localhost:8001/docs
  - Tasks: http://localhost:8002/docs
  - Matching: http://localhost:8003/docs
  - Pricing: http://localhost:8004/docs

To stop: `Ctrl+C`, then `docker-compose down` (add `-v` to also wipe the database).

### Trying it out

1. Register a **client** account at `/register`.
2. Register a **student** account (use an email containing `.ac.lk`, `.edu`, or
   `nibm` to auto-verify) in a second browser/incognito window.
3. As the client, post a task — watch the live Hardness Score price update as
   you adjust the sliders.
4. Select your student as one of up to 3 preferred workers — this starts the
   60-second matching queue.
5. Switch to the student's dashboard — a live ping with a countdown appears.
   Accept it before the timer runs out.
6. The task moves to **assigned**, and the quota gauge on the student dashboard
   updates immediately.

## Repository layout

```
unigig/
├── docker-compose.yml
├── infra/init-db.sql        # creates one Postgres DB per service
├── services/
│   ├── auth-service/
│   ├── task-service/
│   ├── matching-service/
│   └── pricing-service/
├── gateway/                  # nginx reverse proxy config
└── frontend/                 # React + Vite + Tailwind SPA
```

## Deploying later

Each service already builds from its own Dockerfile, so this compose file maps
fairly directly onto most container hosts (a VPS with Docker, Render, Railway,
AWS ECS, etc.). Before deploying publicly:

- Change `JWT_SECRET` in `.env` (copy `.env.example`) to a long random value.
- Put the gateway behind HTTPS (e.g. Caddy/nginx + Let's Encrypt, or your host's
  managed TLS).
- Point `VITE_API_BASE_URL` at your public gateway URL when building the frontend.
- Consider managed Postgres instead of the in-container volume for production data.
