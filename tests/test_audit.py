from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.services.audit import AuditService, verify_audit_entries
from app.utils.audit import (
    GENESIS_HASH,
    build_audit_payload,
    canonical_json,
    compute_audit_hash,
)


def make_entry(
    *,
    sequence_number: int,
    prev_hash: str,
    actor_id: UUID | None = None,
    action: str = "parish.created",
    entity_type: str = "parish",
    entity_id: UUID | None = None,
    before_state: dict | None = None,
    after_state: dict | None = None,
) -> AuditLog:
    entry_id = uuid4()
    timestamp = datetime(2026, 6, 22, 10, sequence_number, tzinfo=timezone.utc)
    resolved_entity_id = entity_id or uuid4()
    payload = build_audit_payload(
        entry_id=entry_id,
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=resolved_entity_id,
        before_state=before_state,
        after_state=after_state,
        timestamp=timestamp,
    )
    return AuditLog(
        id=entry_id,
        sequence_number=sequence_number,
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=resolved_entity_id,
        before_state=before_state,
        after_state=after_state,
        prev_hash=prev_hash,
        entry_hash=compute_audit_hash(prev_hash, payload),
        timestamp=timestamp,
    )


def test_canonical_json_is_stable_across_key_order() -> None:
    assert canonical_json({"b": 2, "a": 1}) == canonical_json(
        {"a": 1, "b": 2}
    )


def test_valid_audit_chain() -> None:
    first = make_entry(
        sequence_number=1,
        prev_hash=GENESIS_HASH,
        after_state={"name": "St. Peter"},
    )
    second = make_entry(
        sequence_number=2,
        prev_hash=first.entry_hash,
        before_state={"active": False},
        after_state={"active": True},
    )

    result = verify_audit_entries([first, second])

    assert result.valid is True
    assert result.total_entries == 2
    assert result.last_hash == second.entry_hash


def test_empty_audit_chain_is_valid() -> None:
    result = verify_audit_entries([])

    assert result.valid is True
    assert result.total_entries == 0
    assert result.last_hash is None


def test_changed_state_breaks_entry_hash() -> None:
    entry = make_entry(
        sequence_number=1,
        prev_hash=GENESIS_HASH,
        after_state={"amount_kobo": 10_000},
    )
    entry.after_state = {"amount_kobo": 100_000}

    result = verify_audit_entries([entry])

    assert result.valid is False
    assert result.first_broken_sequence == 1
    assert result.reason == "Entry hash does not match its stored content"


def test_removed_middle_entry_breaks_next_link() -> None:
    first = make_entry(sequence_number=1, prev_hash=GENESIS_HASH)
    second = make_entry(sequence_number=2, prev_hash=first.entry_hash)
    third = make_entry(sequence_number=3, prev_hash=second.entry_hash)

    result = verify_audit_entries([first, third])

    assert result.valid is False
    assert result.total_entries == 2
    assert result.last_hash == first.entry_hash
    assert result.first_broken_sequence == 3
    assert result.reason == "Previous hash does not match the prior entry"


@pytest.mark.asyncio
async def test_record_uses_lock_and_flushes_without_committing() -> None:
    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = None
    session = MagicMock(spec=AsyncSession)
    session.execute = AsyncMock(side_effect=[MagicMock(), scalar_result])
    session.flush = AsyncMock()
    service = AuditService(session)

    entry = await service.record(
        actor_id=None,
        action="system.started",
        entity_type="system",
        entity_id=uuid4(),
        after_state={"status": "ready"},
    )

    assert entry.prev_hash == GENESIS_HASH
    assert len(entry.entry_hash) == 64
    assert session.execute.await_count == 2
    session.add.assert_called_once_with(entry)
    session.flush.assert_awaited_once()
    session.commit.assert_not_called()
