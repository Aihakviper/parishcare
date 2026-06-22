from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import VerificationChannel, VerificationOutcome
from app.models.types import database_enum

if TYPE_CHECKING:
    from app.models.parish import Parish
    from app.models.welfare_request import WelfareRequest


class VerificationRequest(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "verification_requests"
    __table_args__ = (
        Index(
            "ix_verification_requests_welfare_request_id",
            "welfare_request_id",
        ),
        Index(
            "ix_verification_requests_sent_to_parish_id",
            "sent_to_parish_id",
        ),
    )

    welfare_request_id: Mapped[UUID] = mapped_column(
        ForeignKey("welfare_requests.id", ondelete="RESTRICT"),
        nullable=False,
    )
    sent_to_phone_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    sent_to_parish_id: Mapped[UUID] = mapped_column(
        ForeignKey("parishes.id", ondelete="RESTRICT"),
        nullable=False,
    )
    outcome: Mapped[Optional[VerificationOutcome]] = mapped_column(
        database_enum(VerificationOutcome, "verification_outcome"),
        nullable=True,
    )
    responded_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    welfare_request: Mapped[WelfareRequest] = relationship(
        back_populates="verification_requests"
    )
    sent_to_parish: Mapped[Parish] = relationship()
    voucher: Mapped[VerificationVoucher] = relationship(
        back_populates="verification_request",
        cascade="all, delete-orphan",
        uselist=False,
    )


class VerificationVoucher(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "verification_vouchers"
    __table_args__ = (
        Index(
            "ix_verification_vouchers_verification_request_id",
            "verification_request_id",
            unique=True,
        ),
        Index("ix_verification_vouchers_expires_at", "expires_at"),
    )

    verification_request_id: Mapped[UUID] = mapped_column(
        ForeignKey("verification_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
    )
    channel: Mapped[VerificationChannel] = mapped_column(
        database_enum(VerificationChannel, "verification_channel"),
        nullable=False,
    )
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    verification_request: Mapped[VerificationRequest] = relationship(
        back_populates="voucher"
    )
