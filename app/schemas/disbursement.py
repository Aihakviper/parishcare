from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictInt

from app.models.enums import PaymentMethod, SettlementStatus


class DisbursementCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    welfare_request_id: UUID
    amount_kobo: StrictInt = Field(gt=0)
    notes: str | None = Field(default=None, max_length=2000)


class DisbursementResponse(BaseModel):
    id: UUID
    welfare_request_id: UUID
    amount_kobo: int
    payment_method: PaymentMethod
    approved_by: UUID
    paid_by: UUID
    idempotency_key: UUID
    rail_reference: str
    settlement_status: SettlementStatus
    paid_at: datetime
    receipt_url: str | None
    notes: str | None
    idempotent_replay: bool
    created_at: datetime
    updated_at: datetime
