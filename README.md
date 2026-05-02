# ChatFlow

ChatFlow is a human-first live chat SaaS platform. Customers always talk to real agents; AI only generates private reply suggestions for agents.

## Prerequisites

- Docker and Docker Compose
- Node 20+ for local frontend/widget development
- Python 3.11+ for local backend development

## One-command Setup

```bash
cp .env.example .env
cd docker
docker compose up --build
```

The compose stack starts PostgreSQL, Redis, FastAPI, Celery, the React dashboard, and the widget dev server.

Default login:

- Email: `admin@chatflow.dev`
- Password: `Dev@12345`

## Manual Setup

Backend:

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
alembic upgrade head
python -m scripts.seed_dev
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Widget:

```bash
cd widget
npm install
npm run dev
npm run build
```

## Tests

```bash
cd backend
pytest --cov=app
cd ../frontend
npm test
```

For a complete local startup and testing walkthrough, see [LOCAL_DEVELOPMENT_AND_TESTING.md](LOCAL_DEVELOPMENT_AND_TESTING.md).

## Migrations

```bash
cd backend
alembic upgrade head
alembic revision --autogenerate -m "change name"
```

## Widget Embed

```html
<script>
  window.ChatFlowConfig = { orgSlug: "test-org", apiUrl: "http://localhost:8000" };
</script>
<script async src="https://cdn.chatflow.io/widget.js"></script>
```

## Architecture

```text
Customer Browser
  | widget.js + Socket.io
  v
FastAPI + Socket.io ASGI  <---- React Agent Dashboard
  |        |
  |        +-- Redis rooms, rate limits, JWT blacklist, Celery broker
  |
  +-- PostgreSQL tenant data
  +-- Celery worker -> OpenAI suggestions -> agent room only
  +-- S3 uploads
  +-- SendGrid email
```
