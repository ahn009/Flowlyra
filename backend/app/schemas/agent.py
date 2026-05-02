from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class AgentCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1)
    role: str = "agent"
    max_chats: int = 5


class AgentUpdate(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
    role: str | None = None
    max_chats: int | None = None


class StatusRequest(BaseModel):
    status: str


class AgentOut(BaseModel):
    id: UUID
    organization_id: UUID
    email: EmailStr
    full_name: str
    avatar_url: str | None
    role: str
    is_active: bool
    is_online: bool
    status: str
    max_chats: int

    model_config = {"from_attributes": True}
