from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    String,
    Text,
    event,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class AuditLog(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        CheckConstraint("char_length(action) > 0", name="action_not_empty"),
        CheckConstraint(
            "char_length(entity_type) > 0",
            name="entity_type_not_empty",
        ),
        CheckConstraint(
            "prev_hash ~ '^[0-9a-f]{64}$'",
            name="prev_hash_format",
        ),
        CheckConstraint(
            "entry_hash ~ '^[0-9a-f]{64}$'",
            name="entry_hash_format",
        ),
        Index("ix_audit_logs_actor_id", "actor_id"),
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
        Index("ix_audit_logs_timestamp", "timestamp"),
    )

    sequence_number: Mapped[int] = mapped_column(
        BigInteger,
        Identity(always=True),
        nullable=False,
        unique=True,
    )
    actor_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        nullable=False,
    )
    before_state: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True,
    )
    after_state: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True,
    )
    prev_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    entry_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    actor: Mapped[Optional[User]] = relationship(back_populates="audit_logs")


def _reject_audit_mutation(*_: object) -> None:
    raise ValueError("Audit logs are append-only")


event.listen(AuditLog, "before_update", _reject_audit_mutation)
event.listen(AuditLog, "before_delete", _reject_audit_mutation)
