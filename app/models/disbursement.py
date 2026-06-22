from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import PaymentMethod, SettlementStatus
from app.models.types import database_enum

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.welfare_request import WelfareRequest


class Disbursement(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "disbursements"
    __table_args__ = (
        CheckConstraint("amount_kobo > 0", name="amount_positive"),
        Index("ix_disbursements_welfare_request_id", "welfare_request_id"),
        Index("ix_disbursements_settlement_status", "settlement_status"),
    )

    welfare_request_id: Mapped[UUID] = mapped_column(
        ForeignKey("welfare_requests.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )
    amount_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(
        database_enum(PaymentMethod, "payment_method"),
        nullable=False,
    )
    approved_by: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    paid_by: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    idempotency_key: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        nullable=False,
        unique=True,
    )
    request_fingerprint: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )
    rail_reference: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        unique=True,
    )
    settlement_status: Mapped[SettlementStatus] = mapped_column(
        database_enum(SettlementStatus, "settlement_status"),
        nullable=False,
    )
    paid_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    receipt_url: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True,
    )
    notes_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    welfare_request: Mapped[WelfareRequest] = relationship(
        back_populates="disbursement"
    )
    approver: Mapped[User] = relationship(foreign_keys=[approved_by])
    payer: Mapped[User] = relationship(foreign_keys=[paid_by])
