from datetime import datetime
from typing import Optional
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
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    ArtisanTier,
    DisputeResolution,
    DisputeStatus,
    EscrowStatus,
    JobEventType,
    JobStatus,
    Trade,
)
from app.models.types import database_enum


class ArtisanProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "artisan_profiles"
    __table_args__ = (
        CheckConstraint("trust_score BETWEEN 0 AND 100", name="trust_score"),
        CheckConstraint(
            "average_rating_milli BETWEEN 0 AND 5000",
            name="average_rating_milli",
        ),
        CheckConstraint(
            "identity_score BETWEEN 0 AND 15",
            name="identity_score_range",
        ),
        CheckConstraint("craft_score BETWEEN 0 AND 25", name="craft_score_range"),
        CheckConstraint("voice_score BETWEEN 0 AND 25", name="voice_score_range"),
        CheckConstraint(
            "lineage_score BETWEEN 0 AND 15",
            name="lineage_score_range",
        ),
        CheckConstraint(
            "generosity_score BETWEEN 0 AND 20",
            name="generosity_score_range",
        ),
        Index("ix_artisan_profiles_parish_id", "parish_id"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    trade: Mapped[Trade] = mapped_column(
        database_enum(Trade, "artisan_trade"), nullable=False
    )
    service_area: Mapped[str] = mapped_column(String(200), nullable=False)
    parish_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("parishes.id", ondelete="SET NULL"),
        nullable=True,
    )
    phone_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    phone_hash: Mapped[Optional[str]] = mapped_column(String(64), unique=True)
    bio_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    photo_url: Mapped[Optional[str]] = mapped_column(String(1000))
    years_experience: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    languages: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    vouchers_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tier: Mapped[ArtisanTier] = mapped_column(
        database_enum(ArtisanTier, "artisan_tier"),
        nullable=False,
        default=ArtisanTier.UNVERIFIED,
    )
    trust_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completed_jobs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    average_rating_milli: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    rating_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    nin_verified: Mapped[bool] = mapped_column(nullable=False, default=False)
    bvn_verified: Mapped[bool] = mapped_column(nullable=False, default=False)
    community_vouches: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    peer_endorsements: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    sample_work_score: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    identity_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    craft_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    voice_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    lineage_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    generosity_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_active_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    voice_intro_url: Mapped[Optional[str]] = mapped_column(String(1000))
    sample_work_urls: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list
    )


class Member(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "members"
    __table_args__ = (
        Index("ix_members_parish_id", "parish_id"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    parish_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("parishes.id", ondelete="SET NULL"),
        nullable=True,
    )
    phone_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    phone_hash: Mapped[Optional[str]] = mapped_column(String(64), unique=True)
    address_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    camp_phase: Mapped[Optional[str]] = mapped_column(String(120))
    zone: Mapped[Optional[str]] = mapped_column(String(120))


class ResidentProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "resident_profiles"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    address: Mapped[str] = mapped_column(Text, nullable=False)
    camp_phase: Mapped[str] = mapped_column(String(120), nullable=False)


class Job(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "jobs"
    __table_args__ = (
        CheckConstraint(
            "price_kobo IS NULL OR price_kobo > 0", name="price_positive"
        ),
        Index("ix_jobs_status", "status"),
        Index("ix_jobs_trade", "trade"),
    )

    resident_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    artisan_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    trade: Mapped[Trade] = mapped_column(
        database_enum(Trade, "job_trade"), nullable=False
    )
    description_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    service_area: Mapped[str] = mapped_column(String(200), nullable=False)
    photos: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    status: Mapped[JobStatus] = mapped_column(
        database_enum(JobStatus, "job_status"),
        nullable=False,
        default=JobStatus.REQUESTED,
    )
    price_kobo: Mapped[Optional[int]] = mapped_column(BigInteger)
    escrow_status: Mapped[EscrowStatus] = mapped_column(
        database_enum(EscrowStatus, "escrow_status"),
        nullable=False,
        default=EscrowStatus.PENDING,
    )


class JobEvent(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "job_events"
    __table_args__ = (Index("ix_job_events_job_id", "job_id"),)

    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[JobEventType] = mapped_column(
        database_enum(JobEventType, "job_event_type"), nullable=False
    )
    actor_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    payload: Mapped[dict[str, object]] = mapped_column(
        JSONB, nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class EscrowTransaction(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "escrow_transactions"

    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="RESTRICT"), unique=True, nullable=False
    )
    amount_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    platform_fee_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    artisan_amount_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[EscrowStatus] = mapped_column(
        database_enum(EscrowStatus, "escrow_transaction_status"),
        nullable=False,
    )
    provider_reference: Mapped[str] = mapped_column(
        String(200), unique=True, nullable=False
    )
    funded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    settled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class Review(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint("rating BETWEEN 1 AND 5", name="rating_range"),
    )

    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="RESTRICT"), unique=True, nullable=False
    )
    from_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    to_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    text_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    voice_url: Mapped[Optional[str]] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class Dispute(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "disputes"

    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="RESTRICT"), unique=True, nullable=False
    )
    opener_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    reason_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[DisputeStatus] = mapped_column(
        database_enum(DisputeStatus, "dispute_status"), nullable=False
    )
    resolution: Mapped[Optional[DisputeResolution]] = mapped_column(
        database_enum(DisputeResolution, "dispute_resolution")
    )
    resolution_notes_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    mediator_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
