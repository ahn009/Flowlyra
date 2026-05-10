from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class MessageOut(BaseModel):
    id: UUID
    chat_id: UUID
    sender_type: str
    sender_id: UUID | None
    content: str | None
    content_type: str
    file_url: str | None
    file_name: str | None
    is_internal: bool
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatOut(BaseModel):
    id: UUID
    organization_id: UUID
    session_id: UUID
    contact_id: UUID | None
    assigned_user_id: UUID | None
    team_id: UUID | None
    status: str
    channel: str
    subject: str | None
    tags: list[str]
    csat_score: int | None
    is_missed: bool
    created_at: datetime
    updated_at: datetime
    visitor_name: str | None = None
    visitor_email: str | None = None
    visitor_status: str = "offline"
    visitor_ip: str | None = None
    visitor_current_url: str | None = None
    visitor_referrer: str | None = None
    visitor_page_views: int | None = None

    model_config = {"from_attributes": True}


class ChatDetail(ChatOut):
    messages: list[MessageOut] = []
    contact: dict | None = None
    visitor_session: dict | None = None


class ChatUpdate(BaseModel):
    status: str | None = None
    assigned_user_id: UUID | None = None
    team_id: UUID | None = None
    tags: list[str] | None = None
    subject: str | None = None


class AssignRequest(BaseModel):
    assigned_user_id: UUID | None = None
    team_id: UUID | None = None


class TransferRequest(AssignRequest):
    note: str = Field(default="", max_length=2000)


class NoteRequest(BaseModel):
    content: str = Field(min_length=1, max_length=10000)


class TagRequest(BaseModel):
    tag: str = Field(min_length=1, max_length=80)
