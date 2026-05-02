from uuid import UUID

from pydantic import BaseModel, Field


class OrgUpdate(BaseModel):
    name: str | None = None
    widget_color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    widget_logo_url: str | None = None
    widget_greeting: str | None = None
    widget_position: str | None = None
    widget_custom_css: str | None = None
    operating_hours: dict | None = None
    sla_config: dict | None = None
    timezone: str | None = None


class TeamCreate(BaseModel):
    name: str
    description: str | None = None
    routing_mode: str = "round_robin"


class CannedCreate(BaseModel):
    shortcut: str
    title: str
    content: str
    tags: list[str] = []


class RuleCreate(BaseModel):
    name: str
    priority: int = 0
    conditions: dict
    action: dict
    is_active: bool = True


class TriggerCreate(BaseModel):
    name: str
    trigger_type: str
    conditions: dict
    message: str
    assigned_team_id: UUID | None = None
    is_active: bool = True


class MemberRequest(BaseModel):
    user_id: UUID
