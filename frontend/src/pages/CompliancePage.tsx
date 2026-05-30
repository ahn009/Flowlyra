import { Link } from "react-router-dom";

export function CompliancePage(): JSX.Element {
  const sections = [
    ["Data Security", ["AES-256 encryption at rest and TLS 1.2+ in transit", "Field-level encryption for sensitive data (Fernet)", "Regional data residency options", "Regular automated backups"]],
    ["Authentication & Access Control", ["JWT + refresh rotation", "TOTP 2FA + backup codes", "SAML 2.0 SSO", "OAuth2 Google/Microsoft", "SCIM 2.0", "RBAC owner→admin→supervisor→agent", "IP allowlist", "Redis-backed token blacklist", "Account lockout"]],
    ["Audit & Monitoring", ["Comprehensive audit logs", "Sentry error tracking", "Structured JSON logs", "Health check endpoints"]],
    ["Data Privacy", ["GDPR data export/deletion", "Access audit trails", "Configurable retention", "No third-party data sharing; AI via provider APIs"]],
    ["Infrastructure", ["Dockerized services", "PostgreSQL 15", "Redis 7", "Nginx with security headers", "Per-key and per-IP rate limiting"]],
    ["Certifications (In Progress)", ["SOC 2 Type II (in preparation)", "HIPAA (BAA on Enterprise)", "GDPR DPA on request"]],
  ];
  return <main className="mx-auto max-w-5xl p-6 space-y-6">
    <h1 className="text-3xl font-bold">Security & Compliance</h1>
    <p className="text-sm text-slate-600">FlowLyra security posture for enterprise procurement and security review.</p>
    <div className="flex gap-3">
      <a href="/FlowLyra-Security-Whitepaper.md" className="rounded bg-navy-900 px-4 py-2 text-white text-sm">Download Security Whitepaper</a>
      <Link to="/contact" className="rounded border px-4 py-2 text-sm">Contact Sales for DPA/BAA</Link>
    </div>
    {sections.map(([title, bullets]) => <section key={title} className="rounded-xl border bg-white p-4">
      <h2 className="font-semibold">{title}</h2>
      <ul className="mt-2 list-disc pl-5 text-sm space-y-1">{(bullets as string[]).map((b)=> <li key={b}>{b}</li>)}</ul>
    </section>)}
  </main>
}
