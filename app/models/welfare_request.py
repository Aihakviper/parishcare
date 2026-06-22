from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    false,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    PriorityBand,
    WelfareRequestStatus,
    WelfareRequestType,
)
from app.models.types import database_enum

if TYPE_CHECKING:
    from app.models.beneficiary import Beneficiary
    from app.models.user import User
    from app.models.verification import VerificationRequest


class WelfareRequest(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "welfare_requests"
    __table_args__ = (
        CheckConstraint(
            "amount_requested_kobo > 0",
            name="amount_requested_positive",
        ),
        CheckConstraint(
            "priority_score BETWEEN 0 AND 100",
            name="priority_score_range",
        ),
        Index("ix_welfare_requests_beneficiary_id", "beneficiary_id"),
        Index("ix_welfare_requests_created_by", "created_by"),
        Index("ix_welfare_requests_status", "status"),
        Index("ix_welfare_requests_created_at", "created_at"),
    )

    beneficiary_id: Mapped[UUID] = mapped_column(
        ForeignKey("beneficiaries.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_by: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    request_type: Mapped[WelfareRequestType] = mapped_column(
        database_enum(WelfareRequestType, "welfare_request_type"),
        nullable=False,
    )
    amount_requested_kobo: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    reason_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    is_urgent: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=false(),
    )
    deadline_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    status: Mapped[WelfareRequestStatus] = mapped_column(
        database_enum(WelfareRequestStatus, "welfare_request_status"),
        nullable=False,
        default=WelfareRequestStatus.PENDING,
        server_default=WelfareRequestStatus.PENDING.value,
    )
    priority_score: Mapped[int] = mapped_column(Integer, nullable=False)
    priority_band: Mapped[PriorityBand] = mapped_column(
        database_enum(PriorityBand, "priority_band"),
        nullable=False,
    )
    scoring_version: Mapped[str] = mapped_column(String(50), nullable=False)
    score_breakdown: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
    )
    risk_flags: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default=text("'[]'::jsonb"),
    )
    transition_reason_encrypted: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    transitioned_by: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )
    transitioned_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    decision_reason_encrypted: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    decided_by: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )
    decided_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    risk_review_reason_encrypted: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    risk_reviewed_by: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )
    risk_reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    beneficiary: Mapped[Beneficiary] = relationship(
        back_populates="welfare_requests"
    )
    creator: Mapped[User] = relationship(
        foreign_keys=[created_by],
        back_populates="created_welfare_requests",
    )
    decision_maker: Mapped[Optional[User]] = relationship(
        foreign_keys=[decided_by],
    )
    transition_actor: Mapped[Optional[User]] = relationship(
        foreign_keys=[transitioned_by],
    )
    risk_reviewer: Mapped[Optional[User]] = relationship(
        foreign_keys=[risk_reviewed_by],
    )
    verification_requests: Mapped[list[VerificationRequest]] = relationship(
        back_populates="welfare_request"
    )
