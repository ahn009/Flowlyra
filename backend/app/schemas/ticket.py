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
    status: str = "open"
    custom_fields: dict = Field(default_factory=dict)
    portal_enabled: bool = False


class TicketUpdate(BaseModel):
    subject: str | None = None
    description: str | None = None
    assigned_user_id: UUID | None = None
    team_id: UUID | None = None
    status: str | None = None
    priority: str | None = None
    tags: list[str] | None = None
    custom_fields: dict | None = None
    portal_enabled: bool | None = None


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
    custom_fields: dict = Field(default_factory=dict)
    merged_into_ticket_id: UUID | None = None
    parent_ticket_id: UUID | None = None
    email_thread_id: str | None = None
    sla_due_at: datetime | None = None
    sla_first_response_due_at: datetime | None = None
    sla_resolution_due_at: datetime | None = None
    first_response_breached: bool = False
    resolution_breached: bool = False
    resolved_at: datetime | None = None
    portal_enabled: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    content: str = Field(min_length=1)
    is_internal: bool = False
    content_format: str = "plain"
    time_spent_minutes: int | None = None


class CommentOut(BaseModel):
    id: UUID
    ticket_id: UUID
    user_id: UUID | None
    content: str
    is_internal: bool
    content_format: str = "plain"
    time_spent_minutes: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class BulkTicketAction(BaseModel):
    ticket_ids: list[UUID] = Field(min_length=1, max_length=500)
    action: str = Field(pattern=r"^(assign|close|status|tag|priority)$")
    assigned_user_id: UUID | None = None
    status: str | None = None
    priority: str | None = None
    tags_add: list[str] = Field(default_factory=list)
    tags_remove: list[str] = Field(default_factory=list)


class TicketActivityOut(BaseModel):
    id: UUID
    ticket_id: UUID
    actor_user_id: UUID | None = None
    event_type: str
    title: str
    body: str | None = None
    meta: dict = Field(default_factory=dict)
    created_at: datetime

    model_config = {"from_attributes": True}


class TicketDetailOut(BaseModel):
    ticket: TicketOut
    comments: list[CommentOut]
    activity: list[TicketActivityOut]
    followers: list[str]
    linked_chat_id: UUID | None = None


class SlaPolicyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    priority: str | None = None
    team_id: UUID | None = None
    plan: str | None = None
    first_response_minutes: int = Field(default=60, ge=1, le=10080)
    resolution_minutes: int = Field(default=1440, ge=1, le=43200)
    is_active: bool = True


class SlaPolicyOut(BaseModel):
    id: UUID
    name: str
    priority: str | None = None
    team_id: UUID | None = None
    plan: str | None = None
    first_response_minutes: int
    resolution_minutes: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TicketSavedViewCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    filters: dict = Field(default_factory=dict)
    is_shared: bool = False


class TicketSavedViewOut(BaseModel):
    id: UUID
    organization_id: UUID
    user_id: UUID
    name: str
    filters: dict = Field(default_factory=dict)
    is_shared: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TicketWorkflowCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    trigger_type: str = "on_create"
    conditions: dict = Field(default_factory=dict)
    actions: dict = Field(default_factory=dict)
    is_active: bool = True


class TicketWorkflowOut(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    trigger_type: str
    conditions: dict = Field(default_factory=dict)
    actions: dict = Field(default_factory=dict)
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TicketTimeEntryCreate(BaseModel):
    minutes: int = Field(ge=1, le=1440)
    note: str | None = None
    billable_rate: float | None = None


class TicketTimeEntryOut(BaseModel):
    id: UUID
    organization_id: UUID
    ticket_id: UUID
    user_id: UUID
    minutes: int
    note: str | None = None
    billable_rate: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TicketCustomFieldCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    label: str = Field(min_length=1, max_length=255)
    field_type: str = "text"
    options: dict = Field(default_factory=dict)
    required: bool = False
    is_active: bool = True


class TicketCustomFieldOut(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    label: str
    field_type: str
    options: dict = Field(default_factory=dict)
    required: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TicketRelationOut(BaseModel):
    id: UUID
    organization_id: UUID
    ticket_id: UUID
    related_ticket_id: UUID
    relation_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TicketPortalRequest(BaseModel):
    org_slug: str
    email: str = Field(min_length=3, max_length=320)


class PortalTicketCreate(BaseModel):
    org_slug: str
    token: str
    subject: str = Field(min_length=1, max_length=500)
    description: str | None = None
    priority: str = "normal"


class PortalTicketReply(BaseModel):
    org_slug: str
    token: str
    content: str = Field(min_length=1)


class InboundEmailPayload(BaseModel):
    org_slug: str
    from_email: str
    from_name: str | None = None
    subject: str = ""
    body_text: str = ""
    message_id: str | None = None
    in_reply_to: str | None = None
