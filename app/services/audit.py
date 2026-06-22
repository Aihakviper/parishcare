import hmac
from collections.abc import Iterable
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.schemas.audit import AuditVerificationResult
from app.utils.audit import (
    GENESIS_HASH,
    AuditSerializationError,
    build_audit_payload,
    compute_audit_hash,
    normalize_audit_value,
)

AUDIT_CHAIN_LOCK_ID = 1_347_221_091


class AuditService:
    """Writes audit entries in the caller's active database transaction.

    State payloads must contain only the minimum non-PII data needed to explain
    a mutation. Sensitive values should remain encrypted or be omitted.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def record(
        self,
        *,
        actor_id: UUID | None,
        action: str,
        entity_type: str,
        entity_id: UUID,
        before_state: dict[str, Any] | None = None,
        after_state: dict[str, Any] | None = None,
    ) -> AuditLog:
        action = action.strip()
        entity_type = entity_type.strip()
        if not action or len(action) > 120:
            raise ValueError("Action must contain between 1 and 120 characters")
        if not entity_type or len(entity_type) > 120:
            raise ValueError(
                "Entity type must contain between 1 and 120 characters"
            )

        normalized_before = _normalize_state(before_state)
        normalized_after = _normalize_state(after_state)

        # This lock is held until the surrounding transaction ends. Callers must
        # commit the domain mutation and audit record in the same transaction.
        await self._session.execute(
            text("SELECT pg_advisory_xact_lock(:lock_id)"),
            {"lock_id": AUDIT_CHAIN_LOCK_ID},
        )
        result = await self._session.execute(
            select(AuditLog)
            .order_by(AuditLog.sequence_number.desc())
            .limit(1)
        )
        previous_entry = result.scalar_one_or_none()
        prev_hash = (
            previous_entry.entry_hash
            if previous_entry is not None
            else GENESIS_HASH
        )

        entry_id = uuid4()
        timestamp = datetime.now(timezone.utc)
        payload = build_audit_payload(
            entry_id=entry_id,
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before_state=normalized_before,
            after_state=normalized_after,
            timestamp=timestamp,
        )
        entry = AuditLog(
            id=entry_id,
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before_state=normalized_before,
            after_state=normalized_after,
            prev_hash=prev_hash,
            entry_hash=compute_audit_hash(prev_hash, payload),
            timestamp=timestamp,
        )
        self._session.add(entry)
        await self._session.flush()
        return entry

    async def verify_chain(self) -> AuditVerificationResult:
        result = await self._session.execute(
            select(AuditLog).order_by(AuditLog.sequence_number.asc())
        )
        return verify_audit_entries(result.scalars())


def verify_audit_entries(
    entries: Iterable[AuditLog],
) -> AuditVerificationResult:
    entry_list = list(entries)
    expected_prev_hash = GENESIS_HASH
    previous_sequence: int | None = None
    verified_entries = 0

    for entry in entry_list:
        if (
            previous_sequence is not None
            and entry.sequence_number <= previous_sequence
        ):
            return _broken_result(
                total_entries=len(entry_list),
                verified_entries=verified_entries,
                entry=entry,
                last_hash=expected_prev_hash,
                reason="Audit sequence is not strictly increasing",
            )
        if not hmac.compare_digest(entry.prev_hash, expected_prev_hash):
            return _broken_result(
                total_entries=len(entry_list),
                verified_entries=verified_entries,
                entry=entry,
                last_hash=expected_prev_hash,
                reason="Previous hash does not match the prior entry",
            )

        payload = build_audit_payload(
            entry_id=entry.id,
            actor_id=entry.actor_id,
            action=entry.action,
            entity_type=entry.entity_type,
            entity_id=entry.entity_id,
            before_state=entry.before_state,
            after_state=entry.after_state,
            timestamp=entry.timestamp,
        )
        try:
            expected_entry_hash = compute_audit_hash(
                entry.prev_hash,
                payload,
            )
        except (AuditSerializationError, ValueError):
            return _broken_result(
                total_entries=len(entry_list),
                verified_entries=verified_entries,
                entry=entry,
                last_hash=expected_prev_hash,
                reason="Entry contains invalid canonical data",
            )
        if not hmac.compare_digest(entry.entry_hash, expected_entry_hash):
            return _broken_result(
                total_entries=len(entry_list),
                verified_entries=verified_entries,
                entry=entry,
                last_hash=expected_prev_hash,
                reason="Entry hash does not match its stored content",
            )

        previous_sequence = entry.sequence_number
        expected_prev_hash = entry.entry_hash
        verified_entries += 1

    return AuditVerificationResult(
        valid=True,
        total_entries=len(entry_list),
        last_hash=expected_prev_hash if entry_list else None,
    )


def _normalize_state(
    state: dict[str, Any] | None,
) -> dict[str, Any] | None:
    if state is None:
        return None
    normalized = normalize_audit_value(state)
    if not isinstance(normalized, dict):
        raise AuditSerializationError("Audit state must be an object")
    return normalized


def _broken_result(
    *,
    total_entries: int,
    verified_entries: int,
    entry: AuditLog,
    last_hash: str,
    reason: str,
) -> AuditVerificationResult:
    return AuditVerificationResult(
        valid=False,
        total_entries=total_entries,
        last_hash=last_hash if verified_entries else None,
        first_broken_sequence=entry.sequence_number,
        first_broken_entry_id=entry.id,
        reason=reason,
    )
