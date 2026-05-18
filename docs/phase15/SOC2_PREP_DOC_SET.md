# SOC2 Prep Doc Set (Phase 15.15)

## Scope
- Product: FlowLyra API, Dashboard, Widget, Worker stack.
- Trust Services Criteria: Security, Availability, Confidentiality.

## Control Matrix
- Access Control: RBAC, 2FA, API keys, IP allowlist.
- Change Management: PR review, CI checks, release notes.
- Incident Management: Public incident publish flow + internal escalation.
- Vendor Management: Cloud hosting, email provider, monitoring provider.
- Logging and Monitoring: Audit logs, security events, uptime probes.
- Backup and Recovery: Defined in `DISASTER_RECOVERY_AND_BACKUPS.md`.

## Required Evidence Artifacts
- Deployment logs and release approvals.
- Access reviews (quarterly).
- Security event exports (monthly).
- Backup restore drill output (quarterly).
- Incident postmortems for Sev-1/2 events.
- Vulnerability scan reports + remediation proof.

## Operating Cadence
- Weekly: vulnerability triage + patching.
- Monthly: access review, webhook retry review, retention review.
- Quarterly: restore drill, tabletop incident simulation.

## Ownership
- Security owner: Engineering lead.
- Availability owner: Platform/DevOps owner.
- Compliance owner: Operations manager.
