# FlowLyra

FlowLyra is a multi-tenant, human-first customer support platform.
Customers chat with real agents in real time; AI is used only for private agent reply suggestions.

## What Is In This Repository

- `backend/`: FastAPI API + Socket.IO ASGI server + Celery worker + Alembic migrations
- `frontend/`: React + Vite agent dashboard and admin panels
- `widget/`: embeddable TypeScript chat widget (`dist/widget.js`)
- `docker/`: local Docker Compose stack

## Core Capabilities

- Real-time customer <> agent chat over Socket.IO
- Multi-tenant organization boundaries (org-scoped data and auth)
- Agent authentication with access/refresh JWT tokens
- Role-aware admin endpoints (admin/supervisor/agent)
- Ticketing, contacts, canned replies, routing rules, proactive triggers
- Analytics endpoints (overview, volume, response time, CSAT, agent stats)
- AI reply suggestions for agents (with local fallback when OpenAI key is absent)
- File upload pipeline with validation and optional S3 storage
- Optional SendGrid email integration
- Celery worker for async background tasks

## Public Website Pages (Production IA)

FlowLyra now includes a full public-facing website layer (in addition to the agent app):

- `/` home
- `/features`
- `/pricing`
- `/solutions/customer-support`
- `/solutions/sales-marketing`
- `/solutions/enterprise`
- `/integrations`
- `/customers`
- `/product-tour`
- `/help`
- `/contact`
- `/status`
- `/privacy`
- `/terms`
- `/signup`

Authenticated product workspace remains under:

- `/inbox`, `/chat/:id`, `/tickets`, `/contacts`
- `/admin/*`

## Architecture

```text
Customer Site (Widget)
  -> HTTP /api/v1/widget/init
  -> Socket.IO /socket.io

FastAPI + Socket.IO ASGI (backend/app/main.py)
  -> PostgreSQL (tenant data)
  -> Redis (socket rooms, rate limiting, token blacklist, caching)
  -> Celery worker (AI suggestion jobs)
  -> OpenAI (optional, agent-only suggestions)
  -> AWS S3 (optional uploads)
  -> SendGrid (optional emails)

Agent Dashboard (React)
  -> REST API /api/v1/*
  -> Socket.IO live updates
```

## Tech Stack

- Backend: Python 3.11, FastAPI, SQLAlchemy 2, Alembic, Redis, Celery, Socket.IO
- Frontend: React 18, Vite 5, TypeScript, TanStack Query, Zustand
- Widget: TypeScript, Vite library build (IIFE)
- Infra: PostgreSQL 15, Redis 7, Docker Compose
- CI/CD: GitHub Actions (`.github/workflows/deploy.yml`)

## Prerequisites

- Docker Engine + Docker Compose plugin
- Node.js 20+ (for local frontend/widget workflows)
- Python 3.11+ (for local backend workflows)

## Quick Start (Docker, Recommended)

1. Create environment file:

```bash
cp .env.example .env
```

2. Start full stack:

```bash
cd docker
docker compose up --build
```

3. Open services:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Widget dev page: `http://localhost:5174`
- Health check: `http://localhost:8000/health`

4. Default seeded login:

- Email: `admin@flowlyra.dev`
- Password: `Dev@12345`

## Important Environment Variables

Copy `.env.example` and set values for your environment.

Required for production:

- `SECRET_KEY`: strong random value (32+ chars). App validation fails for weak/default values in `production`/`staging`.
- `DATABASE_URL`: production Postgres connection string
- `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`
- `CORS_ORIGINS`: explicit allowed origins (no wildcards)
- `FRONTEND_BASE_URL`: used to generate password reset links
- `ENVIRONMENT=production`

Common optional integrations:

- `OPENAI_API_KEY`, `OPENAI_MODEL`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_REGION`
- `SENDGRID_API_KEY`, `FROM_EMAIL`
- `CLOUDFLARE_WIDGET_URL`

Frontend runtime variables (optional):

- `VITE_API_BASE_URL` (default: `http://localhost:8000/api/v1`)
- `VITE_SOCKET_URL` (default: `http://localhost:8000`)

## Local Development (Without Docker)

### Backend

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
alembic upgrade head
python -m scripts.seed_dev
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Widget

```bash
cd widget
npm install
npm run dev
npm run build
```

## Tests And Quality Gates

### Backend

```bash
cd backend
pytest --cov=app
```

### Frontend

```bash
cd frontend
npm test
npm run typecheck
npm run build
```

### Widget

```bash
cd widget
npm run typecheck
npm run build
```

CI runs backend tests + frontend tests on pushes/PRs, then builds and optionally deploys on `main`.

## Database Migrations

```bash
cd backend
alembic upgrade head
alembic revision --autogenerate -m "describe change"
```

## Widget Embed

Local development embed:

```html
<script>
  window.FlowLyraConfig = {
    orgSlug: "test-org",
    apiUrl: "http://localhost:8000"
  };
</script>
<script type="module" async src="http://localhost:5174/src/Widget.ts"></script>
```

Production-style embed:

```html
<script>
  window.FlowLyraConfig = {
    orgSlug: "your-org-slug",
    apiUrl: "https://api.flowlyra.com"
  };
</script>
<script async src="https://cdn.flowlyra.com/widget.js"></script>
```

## Docker Images

Build locally:

```bash
docker build -f docker/Dockerfile.backend -t flowlyra-backend:latest backend
docker build -t flowlyra-frontend:latest frontend
docker build -t flowlyra-widget:latest widget
```

## Production Readiness Checklist

- Set `ENVIRONMENT=production`
- Rotate `SECRET_KEY` and all external API credentials
- Restrict `CORS_ORIGINS` to trusted domains only
- Use managed PostgreSQL + Redis with backups and monitoring
- Terminate TLS at ingress/load balancer
- Run backend with multiple replicas and shared Redis
- Run Celery worker as separate scalable service
- Configure centralized logs and error alerting
- Run migrations during deploy (before traffic cutover)
- Remove dev seeding from runtime startup command
- Add uptime checks on `/health`

## Deployment Notes

`docker/docker-compose.yml` is development-oriented. The backend startup command currently runs:

- `alembic upgrade head`
- `python -m scripts.seed_dev`
- `uvicorn ...`

For production, keep migrations in deployment pipeline but remove `seed_dev` from runtime startup.

## API Surface (High Level)

Base prefix: `/api/v1`

- `auth`: login, refresh, logout, invite acceptance, password reset
- `widget`: visitor session/widget init
- `chats`: chat lifecycle, assign/transfer/resolve/close, notes, tags, convert-to-ticket
- `tickets`: CRUD + comments + resolve
- `contacts`: list + delete
- `agents`: profile/status/admin management
- `admin`: org config, teams, canned responses, routing rules, triggers, billing placeholders
- `analytics`: overview and trend endpoints
- `upload`: file upload endpoint

## Security Controls Implemented

- JWT auth with token type validation and revocation (Redis blacklist)
- Role-based guards for protected endpoints
- Rate limiting middleware (stricter for auth routes)
- Tenant scoping through org-aware queries and token claims
- Upload validation (type + size)

## Operational Commands

Start stack:

```bash
cd docker
docker compose up --build
```

View logs:

```bash
cd docker
docker compose logs -f backend
docker compose logs -f celery
```

Stop stack:

```bash
cd docker
docker compose down
```

Reset local data:

```bash
cd docker
docker compose down -v
docker compose up --build
```

## Extended Local Guide

For step-by-step manual testing (API, sockets, widget, DB, Celery, troubleshooting), see:

- `LOCAL_DEVELOPMENT_AND_TESTING.md`
