# FlowLyra Security Whitepaper

## Data Security
- AES-256 encryption at rest, TLS 1.2+ in transit
- Field-level encryption for sensitive fields (Fernet)
- Regional data residency options
- Automated backups

## Authentication & Access Control
- JWT + refresh token rotation
- TOTP 2FA + backup codes
- SAML 2.0 SSO
- OAuth2 (Google/Microsoft)
- SCIM 2.0 provisioning
- RBAC (owner/admin/supervisor/agent)
- IP allowlisting
- Redis-backed token blacklist
- Account lockout policy

## Audit & Monitoring
- State-change audit logs
- Sentry error tracking
- Structured JSON logging
- Health check endpoints

## Data Privacy
- GDPR export/deletion controls
- Data access audit trail
- Configurable retention policies
- No third-party data sharing; AI via provider APIs

## Infrastructure
- Dockerized architecture
- PostgreSQL 15 + pooling
- Redis 7 cache/pubsub
- Nginx reverse proxy + security headers
- Per-key and per-IP rate limiting

## Certifications (In Progress)
- SOC 2 Type II (in preparation)
- HIPAA (BAA available on Enterprise)
- GDPR DPA available on request
