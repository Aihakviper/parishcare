from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import (
    VerificationChannel,
    VerificationOutcome,
    VerificationStatus,
    WelfareRequestStatus,
)


class VerificationStartResponse(BaseModel):
    mode: Literal["already_verified", "voucher_issued"]
    welfare_request_id: UUID
    welfare_request_status: WelfareRequestStatus
    beneficiary_verification_status: VerificationStatus
    verification_request_id: UUID | None = None
    channel: VerificationChannel | None = None
    expires_at: datetime | None = None
    voucher_token: str | None = Field(
        default=None,
        description=(
            "Returned only for mock delivery. Never stored by the server."
        ),
    )


class VerificationVoucherResponse(BaseModel):
    token: str = Field(min_length=1)
    outcome: Literal["confirmed", "rejected"]


class VerificationOutcomeResponse(BaseModel):
    verification_request_id: UUID
    outcome: VerificationOutcome
    welfare_request_id: UUID
    welfare_request_status: WelfareRequestStatus
    beneficiary_id: UUID
    beneficiary_verification_status: VerificationStatus
    responded_at: datetime
