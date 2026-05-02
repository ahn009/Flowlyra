## 2026-05-02 - Information Leakage in Exception Handler and Unauthenticated Admin Endpoint

**Vulnerability:** The global exception handler was returning the raw exception string to clients in all environments, which leaked internal details (e.g., database connection errors, library internals). Additionally, the `/api/v1/admin/tasks/ping` endpoint was missing authentication, allowing anyone to trigger Celery tasks.

**Learning:** Global exception handlers that default to returning `str(exc)` are dangerous in production. Even if they are intended for debugging, they must be environment-aware. Admin endpoints can sometimes be overlooked if they are added for system-level tasks and not strictly part of the user-facing CRUD.

**Prevention:** Always mask internal error details in production environments. Use a consistent dependency-based authentication pattern for all admin routes, even those intended for "system" use.
