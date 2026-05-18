from pydantic import BaseModel, EmailStr, Field
from typing import Union
from uuid import UUID


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    totp_code: str | None = Field(default=None, max_length=12)
    backup_code: str | None = Field(default=None, max_length=20)


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8)
    organization_name: str = Field(min_length=2, max_length=255)
    organization_slug: str | None = Field(default=None, min_length=2, max_length=100)


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class LogoutRequest(BaseModel):
    token: str | None = None


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


class TwoFactorSetupResponse(BaseModel):
    secret: str
    otpauth_uri: str
    qr_data_uri: str


class TwoFactorVerifyRequest(BaseModel):
    code: str = Field(min_length=6, max_length=10)


class TwoFactorDisableRequest(BaseModel):
    password: str = Field(min_length=8)
    code: str | None = None


class TwoFactorBackupCodesResponse(BaseModel):
    codes: list[str]


class TwoFactorChallengeRequiredResponse(BaseModel):
    challenge_token: str
    methods: list[str]
    token_type: str = "challenge"


class TwoFactorChallengeRequest(BaseModel):
    challenge_token: str
    code: str | None = None
    backup_code: str | None = None
