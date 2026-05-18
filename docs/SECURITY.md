# FlowLyra Security & Deployment Hardening

This document covers operational guidance for Phase 12 (Enterprise Security).
Sections marked **action** require ops changes outside the application code.

---

## 1. TLS configuration (12.24)

FlowLyra terminates TLS at the load balancer (Cloudflare, AWS ALB, GCP LB, or
Nginx in self-hosted deployments). The API itself listens on plain HTTP behind
the proxy.

**Recommended TLS settings:**

| Setting | Value |
|--|--|
| Minimum protocol | TLS 1.2 (prefer TLS 1.3) |
| Cipher suites | Mozilla *Intermediate* profile |
| HSTS | `max-age=63072000; includeSubDomains; preload` |
| OCSP stapling | Enabled |
| Certificate | LetsEncrypt or org-managed RSA 2048 / ECDSA P-256 |

The application already emits HSTS via `SecurityHeadersMiddleware`; ensure the
proxy does not strip the header.

### Nginx snippet

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...';
ssl_prefer_server_ciphers off;
ssl_stapling on;
ssl_stapling_verify on;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

---

## 2. DDoS & abuse mitigation (12.20)

Place FlowLyra behind a layer-7 reverse proxy that supports per-IP rate limits
and challenge pages. Recommended setups:

### Cloudflare (preferred)
- Enable **Bot Fight Mode** for the API hostname.
- Rule: `path matches "/api/v1/auth/*"` → `Managed Challenge` if `cf.threat_score > 10`.
- Rate limit: 60 requests / 10s per IP on `/api/v1/auth/login`.
- Rate limit: 10 requests / 10s per IP on `/api/v1/widget/init` when no `session_token`.
- WAF custom rule: block known TOR exits + scrapers.

### AWS (ALB + WAF)
- Apply `AWSManagedRulesCommonRuleSet` and `AWSManagedRulesAmazonIpReputationList`.
- Add a rate-based rule: 2000 requests / 5min per IP.

The application provides finer-grained rate limits via `RateLimitMiddleware`,
but front-edge protection prevents L7 floods from ever reaching the workers.

---

## 3. IP allowlisting (12.9)

Per-org allowlists are enforced by the application in `auth.login` and by the
`enforce_ip_allowlist` dependency on admin routes. Configure via Admin →
Security → IP allowlist, or `PUT /api/v1/security/ip-allowlist`:

```json
{ "enabled": true, "cidrs": ["203.0.113.0/24", "198.51.100.42"] }
```

---

## 4. Encryption at rest (12.12 / 12.13)

Sensitive columns (`users.two_factor_secret`, `sso_configs.idp_cert`) are
wrapped via `app.services.crypto.EncryptedString`. The Fernet key is sourced
from `ENCRYPTION_KEY` (preferred — generate with
`python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`)
or derived from `SECRET_KEY` via HKDF as a fallback.

**KMS adapter (12.13):** set `KMS_PROVIDER=aws` and `KMS_KEY_ID=arn:aws:kms:...`
to wrap the data key with AWS KMS at startup. Requires `boto3` and an IAM
identity with `kms:Decrypt` on the key.

> **Rotation policy:** rotate `ENCRYPTION_KEY` annually. Use the
> `scripts/rotate_encryption_key.py` helper (re-encrypt routine).

---

## 5. SAML SSO (12.1)

- SP metadata: `GET /api/v1/auth/saml/{org_slug}/metadata`
- ACS URL: `/api/v1/auth/saml/{org_slug}/acs`
- AuthnRequest entrypoint: `GET /api/v1/auth/saml/{org_slug}/login`

Configure IdP in Admin → SSO. Required fields: `idp_entity_id`,
`idp_sso_url`, `idp_cert` (PEM or raw base64). The application verifies
`SAMLResponse` signatures using the IdP cert (RSA-SHA256 / exclusive c14n).

---

## 6. SCIM provisioning (12.3)

Endpoints under `/api/v1/scim/v2/*`. Auth: Bearer SCIM token (create at
Admin → Security → SCIM tokens). The token's organization scopes all reads
and writes. Tested against Okta and Azure AD SCIM connectors.

---

## 7. 2FA (12.6–12.8)

- Per-user: `/api/v1/auth/2fa/setup` → `/2fa/verify` → backup codes returned.
- Login challenge: `/api/v1/auth/2fa/challenge`.
- Org policy: `organizations.enforce_two_factor = true` forces enrollment on
  next login.

---

## 8. CAPTCHA on widget (12.19)

Toggle per org. Set `HCAPTCHA_SITE_KEY` / `HCAPTCHA_SECRET` (or reCAPTCHA
equivalents) in environment. Widget must include `captcha_token` in the
`visitor` payload when enabled.

---

## 9. Cookie consent (12.18)

`organizations.cookie_consent.enabled = true` causes the widget to render a
consent banner before any tracking cookies are set. The widget falls back to
session-only mode on decline (no persistent identifiers).

---

## 10. Data retention (12.16)

Hourly Celery beat task `sweep_retention` enforces per-org policies stored in
`retention_policies`. Configure via Admin → Security → Retention.

| Resource | Default | Min |
|--|--|--|
| Chats | 365 days | 30 |
| Tickets | 730 days | 30 |
| Audit | 365 days | 90 (compliance) |
| Sessions | 90 days | 7 |

---

## 11. Incident response

| Event | Channel | SLA |
|--|--|--|
| Security event severity=critical | In-app + email to org owners | < 5 min |
| Suspected key compromise | Page on-call via `oncall@flowlyra.example` | < 15 min |
| Data subject access request | `privacy@flowlyra.example` | < 30 days (GDPR) |

GDPR endpoints:
- Export: `POST /api/v1/security/data-exports`
- Erase contact: `POST /api/v1/security/contacts/{id}/erase`
