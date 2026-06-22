from datetime import datetime
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.utils.crypto import normalize_phone


class ParishCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=200)
    region: str = Field(min_length=2, max_length=120)
    address: str | None = Field(default=None, max_length=1000)
    contact_name: str = Field(min_length=2, max_length=200)
    contact_phone: str = Field(min_length=8, max_length=20)

    @field_validator("contact_phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return normalize_phone(value)


class ParishUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=2, max_length=200)
    region: str | None = Field(default=None, min_length=2, max_length=120)
    address: str | None = Field(default=None, max_length=1000)
    contact_name: str | None = Field(default=None, min_length=2, max_length=200)
    contact_phone: str | None = Field(default=None, min_length=8, max_length=20)

    @field_validator("contact_phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        return normalize_phone(value) if value is not None else None

    @model_validator(mode="after")
    def require_change(self) -> "ParishUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one field must be supplied")
        non_nullable_fields = {"name", "region", "contact_name", "contact_phone"}
        if any(
            field in self.model_fields_set and getattr(self, field) is None
            for field in non_nullable_fields
        ):
            raise ValueError("Required parish fields cannot be null")
        return self


class ParishResponse(BaseModel):
    id: UUID
    name: str
    region: str
    address: str | None
    contact_name: str
    contact_phone: str
    created_at: datetime
    updated_at: datetime
