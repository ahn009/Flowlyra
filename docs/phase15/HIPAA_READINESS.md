# FlowLyra HIPAA Readiness Guide

**Status:** Compliant-ready  
**Last reviewed:** 2026-05-18  
**Applicable plans:** Enterprise

---

## Overview

HIPAA (Health Insurance Portability and Accountability Act) applies when FlowLyra is used to collect, process, or transmit Protected Health Information (PHI) on behalf of a Covered Entity or Business Associate.

FlowLyra provides the technical safeguards required under the HIPAA Security Rule (45 CFR § 164.300–318). Customers operating as Covered Entities must sign a Business Associate Agreement (BAA) before processing PHI.

---

## Administrative Safeguards

| Requirement | FlowLyra Control |
|---|---|
| Security Management Process | SOC2 risk register + annual review (see `SOC2_PREP_DOC_SET.md`) |
| Assigned Security Responsibility | Designated security officer role in org settings |
| Workforce Training | HIPAA training policy template provided |
| Access Management | RBAC + SCIM provisioning (`/api/v1/scim/v2`) |
| Audit Controls | AuditLog captures all access/modifications with actor, IP, timestamp |
| Business Associate Agreements | BAA template below; execute via legal@ before go-live |

---

## Physical Safeguards

| Requirement | FlowLyra Control |
|---|---|
| Facility Access | Hosted on AWS (SOC2 Type II certified data centers) |
| Workstation Use | Agent browser sessions enforced via secure HTTP-only cookies + IP allowlist |
| Device & Media Controls | No PHI stored on local devices; all data server-side |

---

## Technical Safeguards

| Requirement | FlowLyra Control |
|---|---|
| Access Control | Per-org RBAC; unique user IDs; automatic session expiry |
| Audit Controls | Full AuditLog for PHI-related events: view, export, delete, edit |
| Integrity Controls | TLS 1.2+ in transit; Fernet AES-128 encryption at rest for sensitive columns |
| Person Authentication | Password + mandatory 2FA TOTP for HIPAA orgs (`enforce_two_factor = true`) |
| Transmission Security | 256-bit TLS on all API + WebSocket channels |

---

## Data Handling

### PHI Fields in Scope

When a visitor submits personal or medical information via the chat widget, the following fields may contain PHI:

- `Contact.email`, `Contact.phone`, `Contact.name`
- `Message.content` (free-text chat messages)
- Custom fields on tickets and contacts
- File attachments (`Message.file_url`)

### Encryption at Rest

Sensitive columns use `EncryptedString` (Fernet/AES-128). Key rotation via AWS KMS (`/docs/SECURITY.md` §KMS).

### Data Minimisation

- Configure pre-chat form to collect only minimum necessary fields.
- Disable Giphy integration (sends no PHI externally).
- Disable third-party integrations that may receive PHI unless covered by BAA.

### Retention & Deletion

- Configure `RetentionPolicy` per org to auto-purge transcript data after N days.
- GDPR right-to-erasure endpoint (`DELETE /api/v1/security/gdpr/erasure/{contact_id}`) also erases PHI.
- Audit logs retain for 6 years (HIPAA requirement) regardless of retention policy.

---

## Required Customer Actions Before Processing PHI

1. **Sign BAA** — contact legal@flowlyra.com.
2. **Enforce 2FA** — set `enforce_two_factor: true` in Security settings.
3. **Enable IP allowlist** — restrict dashboard access to known corporate IPs.
4. **Set data retention** — configure auto-purge to ≤ your policy maximum (typically 7 years).
5. **Disable non-BAA integrations** — review Integrations Marketplace; disable any without signed BAA.
6. **Enable audit log export** — schedule weekly audit CSV export to your SIEM.
7. **Train staff** — distribute HIPAA workforce training policy to all agents.

---

## Business Associate Agreement (BAA) Template

```
BUSINESS ASSOCIATE AGREEMENT

This Business Associate Agreement ("BAA") is entered into between [CUSTOMER] ("Covered Entity") and FlowLyra, Inc. ("Business Associate") effective [DATE].

1. DEFINITIONS — As defined in 45 CFR §160.103.

2. OBLIGATIONS OF BUSINESS ASSOCIATE
   a. BA will not use or disclose PHI other than as permitted by this BAA or required by law.
   b. BA will implement administrative, physical, and technical safeguards per 45 CFR §164.
   c. BA will report any Security Incident or Breach to CE within 60 calendar days of discovery.
   d. BA will ensure all subcontractors agree to equivalent obligations.
   e. BA will make PHI available for access, amendment, and accounting as required.
   f. At termination, BA will return or destroy all PHI.

3. PERMITTED USES AND DISCLOSURES
   BA may use PHI only to perform services described in the Service Agreement.

4. SUBCONTRACTORS
   AWS (infrastructure), SendGrid (email), Twilio (SMS). Full list at flowlyra.com/subprocessors.

5. BREACH NOTIFICATION
   BA will notify CE within 60 days per 45 CFR §164.410.

6. TERM AND TERMINATION
   This BAA remains in effect for the duration of the Service Agreement.

Signatures: _________________ (CE)  _________________ (BA)
```

---

## Breach Response Procedure

1. Detect via security event alert (`SecurityEvent` model, type `breach_suspected`).
2. Contain — revoke affected tokens, rotate credentials.
3. Assess — determine PHI scope using AuditLog export.
4. Notify — CE within 60 days; HHS within 60 days if >500 individuals.
5. Document — preserve AuditLog records for 6 years.

---

## Certifications & Third-Party Assessments

| Standard | Status |
|---|---|
| GDPR | Compliant (DPA + erasure + export) |
| SOC 2 Type II | In progress (see `SOC2_PREP_DOC_SET.md`) |
| HIPAA | Technical controls complete; BAA required per customer |
| ISO 27001 | Roadmap Q3 2026 |
| CCPA | Compliant (GDPR controls satisfy CCPA) |
