from fastapi import APIRouter, Request

from app.config import get_settings
from app.schemas.public import ContactRequest
from app.services.email_service import send_email

router = APIRouter(prefix="/public", tags=["public"])


@router.post("/contact")
async def contact(payload: ContactRequest) -> dict:
    settings = get_settings()
    subject = "FlowLyra Contact Request"
    company_line = f"<p><b>Company:</b> {payload.company}</p>" if payload.company else ""
    html = (
        "<h3>New contact request</h3>"
        f"<p><b>Name:</b> {payload.full_name}</p>"
        f"<p><b>Email:</b> {payload.email}</p>"
        f"{company_line}"
        f"<p><b>Message:</b><br/>{payload.message}</p>"
    )
    await send_email(settings.from_email, subject, html)
    return {"ok": True}


@router.get("/client-ip")
async def client_ip(request: Request) -> dict:
    return {"ip": request.client.host if request.client else None}
