from pydantic import BaseModel, EmailStr, Field
from uuid import UUID


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8)
    organization_name: str = Field(min_length=2, max_length=255)
    organization_slug: str | None = Field(default=None, min_length=2, max_length=100)


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    token: str


class InviteAcceptRequest(BaseModel):
    token: str
    password: str = Field(min_length=8)
    full_name: str | None = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirmRequest(BaseModel):
    token: str
    password: str = Field(min_length=8)


class UserOut(BaseModel):
    id: UUID
    organization_id: UUID
    email: EmailStr
    full_name: str
    role: str
    status: str

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut
