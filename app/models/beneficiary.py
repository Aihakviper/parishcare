from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import VerificationStatus
from app.models.types import database_enum

if TYPE_CHECKING:
    from app.models.parish import Parish
    from app.models.welfare_request import WelfareRequest


class Beneficiary(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "beneficiaries"
    __table_args__ = (
        CheckConstraint(
            "dependents_count >= 0",
            name="dependents_count_non_negative",
        ),
        Index("ix_beneficiaries_home_parish_id", "home_parish_id"),
        Index("ix_beneficiaries_name_normalised", "name_normalised"),
        Index("ix_beneficiaries_verification_status", "verification_status"),
    )

    name_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    name_normalised: Mapped[str] = mapped_column(String(300), nullable=False)
    phone_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    phone_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    home_parish_id: Mapped[UUID] = mapped_column(
        ForeignKey("parishes.id", ondelete="RESTRICT"),
        nullable=False,
    )
    dependents_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    verification_status: Mapped[VerificationStatus] = mapped_column(
        database_enum(VerificationStatus, "verification_status"),
        nullable=False,
        default=VerificationStatus.UNVERIFIED,
        server_default=VerificationStatus.UNVERIFIED.value,
    )

    home_parish: Mapped[Parish] = relationship(back_populates="beneficiaries")
    phone_history: Mapped[list[PhoneHistory]] = relationship(
        back_populates="beneficiary",
        cascade="all, delete-orphan",
        order_by="PhoneHistory.active_from.desc()",
    )
    welfare_requests: Mapped[list[WelfareRequest]] = relationship(
        back_populates="beneficiary"
    )


class PhoneHistory(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "phone_history"
    __table_args__ = (
        CheckConstraint(
            "active_to IS NULL OR active_to >= active_from",
            name="active_period_valid",
        ),
        Index("ix_phone_history_beneficiary_id", "beneficiary_id"),
        Index("ix_phone_history_phone_hash", "phone_hash"),
    )

    beneficiary_id: Mapped[UUID] = mapped_column(
        ForeignKey("beneficiaries.id", ondelete="CASCADE"),
        nullable=False,
    )
    phone_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    phone_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    active_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    active_to: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    beneficiary: Mapped[Beneficiary] = relationship(back_populates="phone_history")
