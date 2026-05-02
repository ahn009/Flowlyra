from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TicketCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=500)
    description: str | None = None
    contact_id: UUID | None = None
    assigned_user_id: UUID | None = None
    team_id: UUID | None = None
    priority: str = "medium"
    tags: list[str] = []


class TicketUpdate(BaseModel):
    subject: str | None = None
    description: str | None = None
    assigned_user_id: UUID | None = None
    team_id: UUID | None = None
    status: str | None = None
    priority: str | None = None
    tags: list[str] | None = None


class TicketOut(BaseModel):
    id: UUID
    ticket_number: int
    subject: str
    description: str | None
    status: str
    priority: str
    assigned_user_id: UUID | None
    team_id: UUID | None
    source_chat_id: UUID | None
    tags: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    content: str = Field(min_length=1)
    is_internal: bool = False


class CommentOut(BaseModel):
    id: UUID
    ticket_id: UUID
    user_id: UUID | None
    content: str
    is_internal: bool
    created_at: datetime

    model_config = {"from_attributes": True}
