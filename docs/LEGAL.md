# Legal & Compliance — FlowLyra

Public legal pages exposed by the frontend at:

- `/legal/privacy`
- `/legal/dpa`
- `/legal/soc2`
- `/legal/terms`

The markdown sources for these pages live below. Marketing edits should land
here, not inside React components, so we keep one canonical version.

---

## Privacy notice (`/legal/privacy`)

FlowLyra processes the following categories of personal data on behalf of
customer organizations who deploy our widget and use our APIs:

- Visitor identifiers: IP address, user-agent, referrer URL, session token.
- Optional contact data: name, email, phone — only when supplied by the
  visitor or pushed via the JS API.
- Conversation contents: messages, attachments, and reaction metadata.
- Agent activity: login timestamps, role changes, audit log entries.

We retain data per the organization's configured retention policy
(see Admin → Security → Retention). Data subjects may request export or
erasure via the customer organization's controller, who can fulfil it via
`POST /api/v1/security/data-exports` and `POST /api/v1/security/contacts/{id}/erase`.

---

## Data Processing Agreement summary (`/legal/dpa`)

FlowLyra acts as a **Data Processor** under GDPR Art. 28. The full DPA
template is available on request from `privacy@flowlyra.example`. Key
processor commitments:

1. Process personal data only on documented instructions from the controller.
2. Ensure subprocessors are bound by equivalent obligations.
3. Notify controllers of personal data breaches without undue delay
   (target: < 24 hours).
4. Provide reasonable assistance with DPIAs and DSAR responses.
5. Return or delete personal data at end of contract.

Subprocessor list (last updated 2026-05-18):

| Provider | Purpose | Region |
|--|--|--|
| AWS (S3, KMS, RDS) | Storage, encryption, database | us-east-1 |
| SendGrid | Transactional email | us-east |
| OpenAI / Anthropic | AI assist features (opt-in) | us |
| Cloudflare | CDN + WAF | global |

---

## SOC 2 status (`/legal/soc2`)

FlowLyra is currently working toward SOC 2 Type II attestation. Existing
controls aligned with the AICPA Trust Services Criteria:

- **Security:** SSO, MFA, IP allowlist, encrypted columns, audit trail.
- **Availability:** Multi-AZ Postgres, hourly backups, RTO < 4h.
- **Confidentiality:** Per-org tenant isolation enforced in middleware.
- **Processing integrity:** Webhook deliveries idempotent + signed.
- **Privacy:** GDPR export/erase endpoints, retention policy enforcement.

Report availability ETA: Q4 2026. Email `compliance@flowlyra.example` for
the latest gap analysis or to request a copy under NDA.

---

## Terms of service (`/legal/terms`)

FlowLyra is provided **as-is** under the customer agreement signed at
purchase. Acceptable use prohibits: spamming, hosting illegal content,
attempting to bypass per-org isolation, and excessive automated scraping.
Customers are responsible for the lawfulness of their visitor-facing
deployments.

Service availability target: **99.9% monthly uptime** for paid plans.
