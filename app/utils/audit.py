import hashlib
import json
import math
from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any, Mapping
from uuid import UUID

GENESIS_HASH = "0" * 64


class AuditSerializationError(ValueError):
    """Raised when an audit state cannot be represented deterministically."""


def normalize_audit_value(value: Any) -> Any:
    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        if not math.isfinite(value):
            raise AuditSerializationError("Non-finite floats are not supported")
        return value
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Enum):
        return normalize_audit_value(value.value)
    if isinstance(value, datetime):
        if value.tzinfo is None:
            raise AuditSerializationError("Datetimes must be timezone-aware")
        utc_value = value.astimezone(timezone.utc)
        return utc_value.isoformat(timespec="microseconds").replace("+00:00", "Z")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Mapping):
        normalized: dict[str, Any] = {}
        for key, item in value.items():
            if not isinstance(key, str):
                raise AuditSerializationError("Audit object keys must be strings")
            normalized[key] = normalize_audit_value(item)
        return normalized
    if isinstance(value, (list, tuple)):
        return [normalize_audit_value(item) for item in value]
    raise AuditSerializationError(
        f"Unsupported audit value type: {type(value).__name__}"
    )


def canonical_json(value: Any) -> str:
    return json.dumps(
        normalize_audit_value(value),
        ensure_ascii=False,
        allow_nan=False,
        separators=(",", ":"),
        sort_keys=True,
    )


def build_audit_payload(
    *,
    entry_id: UUID,
    actor_id: UUID | None,
    action: str,
    entity_type: str,
    entity_id: UUID,
    before_state: dict[str, Any] | None,
    after_state: dict[str, Any] | None,
    timestamp: datetime,
) -> dict[str, Any]:
    return {
        "id": entry_id,
        "actor_id": actor_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "before_state": before_state,
        "after_state": after_state,
        "timestamp": timestamp,
    }


def compute_audit_hash(prev_hash: str, payload: dict[str, Any]) -> str:
    if len(prev_hash) != 64:
        raise ValueError("Previous hash must contain 64 hexadecimal characters")
    try:
        bytes.fromhex(prev_hash)
    except ValueError as exc:
        raise ValueError("Previous hash must be hexadecimal") from exc

    content = (prev_hash + canonical_json(payload)).encode("utf-8")
    return hashlib.sha256(content).hexdigest()
