from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import UserRole
from app.models.types import database_enum

if TYPE_CHECKING:
    from app.models.audit import AuditLog
    from app.models.parish import Parish


class User(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role NOT IN ('officer', 'pastor') OR parish_id IS NOT NULL",
            name="parish_required_for_parish_roles",
        ),
        Index("ix_users_parish_id", "parish_id"),
        Index("ix_users_role", "role"),
    )

    name_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    email_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    email_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[UserRole] = mapped_column(
        database_enum(UserRole, "user_role"),
        nullable=False,
    )
    parish_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("parishes.id", ondelete="RESTRICT"),
        nullable=True,
    )
    mfa_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=true(),
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=true(),
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    parish: Mapped[Optional[Parish]] = relationship(back_populates="users")
    audit_logs: Mapped[list[AuditLog]] = relationship(back_populates="actor")
