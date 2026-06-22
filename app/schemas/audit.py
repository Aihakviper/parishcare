from uuid import UUID

from pydantic import BaseModel


class AuditVerificationResult(BaseModel):
    valid: bool
    total_entries: int
    last_hash: str | None = None
    first_broken_sequence: int | None = None
    first_broken_entry_id: UUID | None = None
    reason: str | None = None
