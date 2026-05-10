from pydantic import BaseModel, EmailStr, Field


class ContactRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    company: str | None = Field(default=None, max_length=255)
    message: str = Field(min_length=10, max_length=5000)
