import logging

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from app.config import get_settings

logger = logging.getLogger(__name__)


async def send_email(to_email: str, subject: str, html: str, headers: dict[str, str] | None = None) -> bool:
    settings = get_settings()
    if not settings.sendgrid_api_key:
        logger.info("email skipped to=%s subject=%s", to_email, subject)
        return False
    message = Mail(from_email=settings.from_email, to_emails=to_email, subject=subject, html_content=html)
    if headers:
        for k, v in headers.items():
            message.add_header({k: v})
    try:
        SendGridAPIClient(settings.sendgrid_api_key).send(message)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("sendgrid send failed: %s", exc)
        return False


async def send_invite(to_email: str, token: str) -> None:
    await send_email(to_email, "You’re invited to FlowLyra", f"<p>Accept your invite with token <b>{token}</b>.</p>")


async def send_csat(to_email: str, chat_id: str) -> None:
    await send_email(to_email, "How was your FlowLyra support?", f"<p>Please rate your chat: {chat_id}</p>")
