from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator

from app.models.enums import (
    PriorityBand,
    WelfareRequestStatus,
    WelfareRequestType,
)


class WelfareRequestCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    beneficiary_id: UUID
    request_type: WelfareRequestType
    amount_requested_kobo: StrictInt = Field(gt=0)
    reason: str = Field(min_length=10, max_length=4000)
    is_urgent: bool
    deadline_at: datetime | None = None

    @field_validator("deadline_at")
    @classmethod
    def validate_deadline(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("Deadline must include a timezone")
        if value <= datetime.now(timezone.utc):
            raise ValueError("Deadline must be in the future")
        return value


class WelfareRequestTransition(BaseModel):
    status: WelfareRequestStatus
    reason: str = Field(min_length=5, max_length=2000)


class WelfareRiskReview(BaseModel):
    reason: str = Field(min_length=10, max_length=2000)


class WelfareRequestResponse(BaseModel):
    id: UUID
    beneficiary_id: UUID
    created_by: UUID
    request_type: WelfareRequestType
    amount_requested_kobo: int
    reason: str
    is_urgent: bool
    deadline_at: datetime | None
    status: WelfareRequestStatus
    priority_score: int
    priority_band: PriorityBand
    scoring_version: str
    score_breakdown: dict[str, Any]
    risk_flags: list[dict[str, Any]]
    transition_reason: str | None
    transitioned_by: UUID | None
    transitioned_at: datetime | None
    decision_reason: str | None
    decided_by: UUID | None
    decided_at: datetime | None
    risk_review_reason: str | None
    risk_reviewed_by: UUID | None
    risk_reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime
