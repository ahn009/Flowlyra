# Operations Runbook (Phase 15.24)

## 1. Incident Response
- Detect: alerts from health checks, Sentry, customer reports.
- Triage: classify severity (`minor`, `major`, `critical`).
- Publish: create/update incident in `/admin/polish` (public status page updates immediately).
- Mitigate: rollback, hotfix, capacity scale, or dependency failover.
- Resolve: mark incident resolved and publish summary.

## 2. Release Procedure
- Run checks:
  - `cd backend && PYTHONPATH=. ./.review_venv/bin/python -m pytest -q`
  - `cd frontend && npm run typecheck && npm run build`
  - `cd frontend && npm run perf:budget`
  - `cd widget && npm run build:budget`
- Deploy backend, then frontend, then workers.
- Post-deploy smoke:
  - `/healthz`
  - login flow
  - widget init flow
  - status page render

## 3. Email/Domain Operations
- Configure dashboard custom domain in `/admin/polish`.
- Configure sender domain DKIM/SPF in `/admin/polish`.
- Verify DNS records and update verification status.

## 4. Onboarding Drip Operations
- Manual trigger: `/admin/polish` -> “Run drip now”.
- Scheduled trigger: hourly Celery beat task `run_onboarding_drip`.

## 5. Load/Capacity Testing
- Chat concurrency: `k6-chat-concurrency.js`.
- Socket capacity: `k6-socket-capacity.js`.
- Review P95/P99 latency and failure rates before release.
