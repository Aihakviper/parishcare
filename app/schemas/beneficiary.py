from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)

from app.models.enums import VerificationStatus
from app.utils.crypto import normalize_phone


class BeneficiaryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=200)
    phone: str = Field(min_length=8, max_length=20)
    home_parish_id: UUID
    dependents_count: int = Field(ge=0, le=100)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return normalize_phone(value)


class BeneficiaryLookupRequest(BaseModel):
    phone: str = Field(min_length=8, max_length=20)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return normalize_phone(value)


class BeneficiaryResponse(BaseModel):
    id: UUID
    name: str
    phone: str
    home_parish_id: UUID
    dependents_count: int
    verification_status: VerificationStatus
    created_at: datetime
    updated_at: datetime


class BeneficiaryRegistrationResponse(BaseModel):
    beneficiary: BeneficiaryResponse
    possible_duplicate: bool
    possible_duplicate_count: int


class BeneficiaryLookupResponse(BaseModel):
    outcome: Literal["match", "restricted_match", "none"]
    beneficiary: BeneficiaryResponse | None = None
    verification_status: VerificationStatus | None = None
    message: str
