"""Lightweight email template renderer (Jinja-style ``{var}`` interpolation).

For real templates we render with Jinja2 if installed; otherwise fall back to
``str.format`` against the same variable names. Keeps templates as plain HTML.
"""

from __future__ import annotations

from typing import Any

try:  # pragma: no cover
    from jinja2 import Environment, BaseLoader, select_autoescape

    _env: Environment | None = Environment(loader=BaseLoader(), autoescape=select_autoescape(["html"]))
except Exception:  # noqa: BLE001
    _env = None


_BASE_LAYOUT = """
<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f7f7f8;padding:24px;color:#111">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
    <h2 style="margin:0 0 16px 0;font-size:20px">{title}</h2>
    <div style="font-size:15px;line-height:1.55">{body}</div>
    <hr style="margin:32px 0 16px;border:none;border-top:1px solid #eee" />
    <p style="font-size:12px;color:#888;margin:0">FlowLyra · This email was sent because of activity on your workspace.</p>
  </div>
</body></html>
""".strip()


TEMPLATES: dict[str, dict[str, str]] = {
    "invite": {
        "subject": "You're invited to {organization_name} on FlowLyra",
        "body": (
            "<p>Hi,</p>"
            "<p><b>{inviter_name}</b> invited you to join <b>{organization_name}</b> on FlowLyra as a {role}.</p>"
            "<p><a href=\"{invite_url}\" style=\"background:#1E40AF;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block\">Accept invite</a></p>"
            "<p>Or use this code: <code>{invite_token}</code></p>"
        ),
    },
    "password_reset": {
        "subject": "Reset your FlowLyra password",
        "body": (
            "<p>We received a request to reset your password.</p>"
            "<p><a href=\"{reset_url}\" style=\"background:#1E40AF;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block\">Reset password</a></p>"
            "<p>This link expires in 2 hours. If you did not request this, you can ignore this email.</p>"
        ),
    },
    "csat_request": {
        "subject": "How was your chat with {organization_name}?",
        "body": (
            "<p>Thanks for chatting with us. Tap the link below to rate your conversation.</p>"
            "<p><a href=\"{rate_url}\">Rate this chat</a></p>"
        ),
    },
    "ticket_assigned": {
        "subject": "Ticket #{ticket_number} assigned to you",
        "body": "<p>Ticket <b>{ticket_subject}</b> was assigned to you.</p><p><a href=\"{ticket_url}\">Open ticket</a></p>",
    },
    "ticket_sla_breach": {
        "subject": "[SLA] Ticket #{ticket_number} breach imminent",
        "body": "<p>Ticket <b>{ticket_subject}</b> has breached SLA target.</p><p><a href=\"{ticket_url}\">Open ticket</a></p>",
    },
    "trial_ending": {
        "subject": "Your FlowLyra trial ends in {days_left} days",
        "body": "<p>Pick a plan to keep chatting with your customers.</p><p><a href=\"{billing_url}\">Choose a plan</a></p>",
    },
    "invoice_paid": {
        "subject": "Receipt for FlowLyra invoice {invoice_number}",
        "body": "<p>Thanks for your payment of <b>{amount}</b>.</p><p><a href=\"{invoice_url}\">View invoice</a></p>",
    },
    "weekly_digest": {
        "subject": "Your FlowLyra weekly digest",
        "body": "<p>Chats this week: <b>{chats_count}</b><br/>Avg first response: <b>{avg_frt}</b><br/>CSAT: <b>{csat}</b></p>",
    },
}


def render(template_name: str, variables: dict[str, Any]) -> tuple[str, str]:
    tpl = TEMPLATES.get(template_name)
    if tpl is None:
        raise KeyError(f"Email template '{template_name}' not found")
    safe_vars = {k: ("" if v is None else v) for k, v in variables.items()}
    subject = tpl["subject"].format(**safe_vars)
    body_inner = tpl["body"].format(**safe_vars)
    html = _BASE_LAYOUT.format(title=subject, body=body_inner)
    return subject, html
