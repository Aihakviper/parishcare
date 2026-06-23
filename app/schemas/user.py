from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.models.enums import CampRole, UserRole


class UserCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole
    parish_id: UUID | None = None
    mfa_enabled: bool

    @model_validator(mode="after")
    def validate_parish_assignment(self) -> "UserCreate":
        if self.role in {UserRole.OFFICER, UserRole.PASTOR}:
            if self.parish_id is None:
                raise ValueError("Parish roles require a parish")
            if not self.mfa_enabled:
                raise ValueError("Payment-capable roles require MFA")
        elif self.parish_id is not None:
            raise ValueError("HQ and auditor users cannot belong to a parish")
        return self


class UserUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=2, max_length=200)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role: UserRole | None = None
    parish_id: UUID | None = None
    mfa_enabled: bool | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def require_change(self) -> "UserUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one field must be supplied")
        if any(
            field in self.model_fields_set and getattr(self, field) is None
            for field in {
                "name",
                "email",
                "password",
                "role",
                "mfa_enabled",
                "is_active",
            }
        ):
            raise ValueError("Updated user fields cannot be null")
        return self


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    role: UserRole
    parish_id: UUID | None
    camp_role: CampRole | None = None
    member_id: UUID | None = None
    artisan_id: UUID | None = None
    active_job_id: UUID | None = None
    mfa_enabled: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
