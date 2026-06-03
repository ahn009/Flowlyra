# FlowLyra

FlowLyra is a multi-tenant customer support platform for real-time human support, AI-assisted agent workflows, ticketing, knowledge management, customer engagement, and developer integrations.

AI in this codebase is designed around private agent assistance and knowledge retrieval rather than replacing the live support experience.

## Repository Map

- `backend/`: FastAPI API, Socket.IO ASGI app, SQLAlchemy models, Alembic migrations, Celery workers, integrations, middleware, and tests.
- `frontend/`: React, Vite, TypeScript workspace app, public website pages, developer portal, admin/settings screens, and Playwright/Vitest tests.
- `widget/`: embeddable TypeScript chat widget built as a Vite library.
- `desktop/`: Electron desktop shell that opens the FlowLyra workspace.
- `sdk/`: Node.js, Python, and PHP API clients for `/api/v1/platform/*` endpoints.
- `docker/`: development and production Docker Compose files plus backend/nginx Docker config.
- `docs/`: security, legal, operations, QA, compliance, and launch-readiness documentation.
- `qa/load/`: k6 load tests for widget initialization and Socket.IO capacity.
- Root planning/report files: implementation roadmap, parity gap reports, and product documentation.

## Product Surface

### Public Website

- `/`
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
- `/blog`
- `/privacy`
- `/terms`
- `/security`
- `/signup`

### Public Product Experiences

- `/chat/:wsId`
- `/kb/:orgSlug`
- `/kb/:orgSlug/:slug`
- `/api-docs`
- `/api-changelog`
- `/api-status`

### Authenticated Workspace

- `/home`
- `/inbox`
- `/archives`
- `/inbox/chat/:id`
- `/tickets`
- `/ticket/:id`
- `/contacts`
- `/developer`
- `/supervision`
- `/engage/*`
- `/admin/*`
- `/settings/*`

## Core Capabilities

- Real-time visitor-to-agent chat over Socket.IO.
- Multi-tenant organization boundaries across auth, data access, and API operations.
- Access and refresh JWT auth, token revocation, password reset, invite acceptance, and optional cookie auth.
- Agent, supervisor, and admin workspace flows.
- Inbox, chat assignment, transfer, resolution, notes, tags, and conversion to ticket.
- Ticketing, contacts, teams, canned responses, routing rules, and proactive engagement.
- Knowledge base, public KB pages, chatbot configuration, AI knowledge sources, and RAG support.
- AI reply assistance, summarization, sentiment, and provider abstraction for OpenAI or Anthropic.
- Analytics, reporting, scheduled reports, audit logs, security events, and operational polish endpoints.
- API keys, webhooks, public platform API, SDKs, and developer portal.
- Billing and subscriptions through Stripe configuration.
- Channels and integrations including email, WhatsApp, Messenger, Telegram, SMS/Twilio, Slack, HubSpot, Salesforce, Shopify, Zapier, Stripe, and Google Analytics.
- Enterprise/security controls including RBAC, rate limiting, CSRF protection, dynamic CORS, security headers, SAML/SCIM, OAuth, 2FA, CAPTCHA, IP allowlists, visitor bans, retention settings, and audit middleware.
- Upload validation with optional S3 storage.
- Push notification configuration for web, FCM, and APNS.
- Voice/video settings through WebRTC STUN/TURN configuration.

## Architecture

```text
Customer site
  -> FlowLyra widget
  -> HTTP /api/v1/widget/init
  -> Socket.IO /socket.io

FastAPI + Socket.IO ASGI (backend/app/main.py)
  -> PostgreSQL for tenant data
  -> Redis for sockets, rate limits, token revocation, cache, and Celery broker/result storage
  -> Celery workers for async jobs
  -> Optional AI providers, object storage, email, billing, push, and channel integrations

React workspace and public site
  -> REST API /api/v1/*
  -> Socket.IO live updates
```

## Tech Stack

- Backend: Python 3.11, FastAPI, SQLAlchemy 2, Alembic, Pydantic, Redis, Celery, Socket.IO, pytest.
- Frontend: React 18, Vite 5, TypeScript, React Router, TanStack Query, Zustand, Tailwind CSS, Vitest, Playwright.
- Widget: TypeScript, Vite library build, Socket.IO client.
- Desktop: Electron.
- SDKs: Node.js, Python, PHP.
- Infrastructure: PostgreSQL 15, Redis 7, Docker Compose, nginx config.

## Prerequisites

- Docker Engine with the Docker Compose plugin.
- Node.js 20+ for frontend, widget, SDK, or desktop workflows.
- Python 3.11+ for backend workflows.
- k6 if you plan to run `qa/load` tests.

## Quick Start With Docker

1. Create the environment file:

```bash
cp .env.example .env
```

2. Start the development stack:

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
- Host Postgres port: `5433`

4. Default seeded login:

- Email: `admin@flowlyra.dev`
- Password: `Dev@12345`

The development Compose backend runs migrations and seeds dev data on startup. Remove dev seeding from production startup commands.

## Environment Variables

Copy `.env.example` and set values for your environment.

Required for production or staging:

- `ENVIRONMENT=production` or `ENVIRONMENT=staging`
- `SECRET_KEY`: strong random value, 32+ characters.
- `DATABASE_URL`
- `REDIS_URL`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `CORS_ORIGINS`: explicit trusted origins.
- `API_BASE_URL`
- `FRONTEND_BASE_URL`

Common optional integrations:

- AI: `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, embedding/RAG settings.
- Storage: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_REGION`.
- Email: `SENDGRID_API_KEY`, `FROM_EMAIL`.
- Billing: Stripe secret, publishable, webhook, and price ID variables.
- OAuth/SAML/SCIM/security: Google, Microsoft, SAML, CAPTCHA, KMS, and 2FA variables.
- Channel integrations: WhatsApp/Meta, Slack, Salesforce, HubSpot, Shopify, GitHub, and related OAuth credentials.
- Push: VAPID, FCM, and APNS variables.
- Voice/video: WebRTC STUN/TURN variables.
- Observability: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, `LOG_LEVEL`, `JSON_LOGS`.

Frontend runtime variables live in `frontend/.env.example`:

- `VITE_API_BASE_URL`
- `VITE_SOCKET_URL`

## Local Development Without Docker

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

If you use the Docker Compose Postgres service from the host, point `DATABASE_URL` at port `5433` because Compose maps container port `5432` to host port `5433`.

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

### Desktop

```bash
cd desktop
npm install
npm start
```

Set `FLOWLYRA_DESKTOP_URL` to open a deployed workspace instead of the default local inbox.

## Tests And Quality Gates

### Backend

```bash
cd backend
pytest -q
```

### Frontend

```bash
cd frontend
npm test
npm run typecheck
npm run build
npm run e2e
npm run a11y:audit
npm run visual:test
npm run perf:budget
```

### Widget

```bash
cd widget
npm run typecheck
npm run build
npm run build:budget
```

### Load Tests

```bash
k6 run qa/load/k6-chat-concurrency.js -e BASE_URL=http://localhost:8000 -e ORG_SLUG=test-org
k6 run qa/load/k6-socket-capacity.js -e WS_URL=ws://localhost:8000/socket.io/?EIO=4\&transport=websocket -e VUS=500 -e DURATION=5m
```

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

## SDKs

The SDKs authenticate with `X-API-Key` and target `/api/v1/platform/*` endpoints.

- `sdk/node`: `@flowlyra/sdk`
- `sdk/python`: `flowlyra-sdk`
- `sdk/php`: `flowlyra/sdk`

## Docker Commands

Start the stack:

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

Stop the stack:

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

Build images locally:

```bash
docker build -f docker/Dockerfile.backend -t flowlyra-backend:latest backend
docker build -t flowlyra-frontend:latest frontend
docker build -t flowlyra-widget:latest widget
```

## API Surface

Base prefix: `/api/v1`

- `auth`: login, refresh, logout, invites, password reset, OAuth callback helpers.
- `public`: public site/API helpers.
- `widget`: widget initialization and visitor session flows.
- `chats`: inbox, messages, assignment, transfers, resolution, notes, tags, and ticket conversion.
- `tickets`: ticket lifecycle, comments, SLA/workflow behavior.
- `contacts`: customer profile management.
- `ecommerce`: ecommerce/product/order foundations.
- `agents`: agent profile, availability, and management.
- `admin`: workspace configuration, teams, routing, triggers, canned responses, billing/admin setup.
- `analytics`: reporting, exports, trends, CSAT, response time, and agent stats.
- `engage`: campaigns, goals, traffic, greetings, and proactive workflows.
- `integrations`: marketplace, OAuth, health checks, and logs.
- `upload`: validated file upload.
- `audit`: audit log access.
- `billing`: subscription and plan flows.
- `notifications`: notification preferences and delivery state.
- `api-keys`: scoped API key management.
- `webhooks`: outbound webhook subscriptions and deliveries.
- `platform`: external API consumed by SDKs.
- `kb`: admin and public knowledge base endpoints.
- `ai`: assistant, summarization, sentiment, and knowledge search.
- `chatbot`: chatbot configuration and behavior.
- `channels`: channel setup and webhooks.
- `security`: enterprise security controls.
- `scim`: identity provisioning.
- `gaps` and `polish`: parity, benchmarking, and launch-readiness endpoints.

## Production Notes

- Use managed PostgreSQL and Redis with backups and monitoring.
- Run migrations during deployment before traffic cutover.
- Run the API and Celery worker as separate scalable processes.
- Restrict CORS to trusted origins.
- Rotate `SECRET_KEY` and all third-party credentials.
- Terminate TLS at ingress or load balancer.
- Configure centralized logs, Sentry, health checks, and uptime checks.
- Review `docs/SECURITY.md`, `docs/LEGAL.md`, and `docs/phase15/*` before launch.
