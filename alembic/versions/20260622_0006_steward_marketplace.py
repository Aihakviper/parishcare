"""Create Steward artisan marketplace core.

Revision ID: 20260622_0006
Revises: 20260622_0005
Create Date: 2026-06-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260622_0006"
down_revision: Union[str, Sequence[str], None] = "20260622_0005"
branch_labels = None
depends_on = None


ENUMS = {
    "artisan_trade": [
        "plumber", "electrician", "generator_technician", "tailor",
        "mechanic", "carpenter", "painter", "cleaner", "security",
    ],
    "job_trade": [
        "plumber", "electrician", "generator_technician", "tailor",
        "mechanic", "carpenter", "painter", "cleaner", "security",
    ],
    "artisan_tier": ["unverified", "verified", "trusted", "steward"],
    "job_status": [
        "requested", "quoted", "accepted", "en_route", "working",
        "completed", "disputed", "closed",
    ],
    "escrow_status": ["pending", "held", "released", "refunded", "frozen"],
    "escrow_transaction_status": [
        "pending", "held", "released", "refunded", "frozen",
    ],
    "job_event_type": [
        "status_change", "photo_uploaded", "voice_note", "payment", "message",
    ],
    "dispute_status": ["open", "mediating", "resolved"],
    "dispute_resolution": ["release", "refund"],
}


def enum(name: str):
    return postgresql.ENUM(*ENUMS[name], name=name, create_type=False)


def upgrade() -> None:
    for role in ("resident", "artisan", "camp_admin", "mediator"):
        op.execute(f"ALTER TYPE user_role ADD VALUE IF NOT EXISTS '{role}'")
    bind = op.get_bind()
    for name, values in ENUMS.items():
        postgresql.ENUM(*values, name=name).create(bind, checkfirst=True)

    op.create_table(
        "artisan_profiles",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("trade", enum("artisan_trade"), nullable=False),
        sa.Column("service_area", sa.String(200), nullable=False),
        sa.Column("tier", enum("artisan_tier"), nullable=False),
        sa.Column("trust_score", sa.Integer(), nullable=False),
        sa.Column("completed_jobs", sa.Integer(), nullable=False),
        sa.Column("average_rating_milli", sa.Integer(), nullable=False),
        sa.Column("rating_count", sa.Integer(), nullable=False),
        sa.Column("nin_verified", sa.Boolean(), nullable=False),
        sa.Column("bvn_verified", sa.Boolean(), nullable=False),
        sa.Column("community_vouches", sa.Integer(), nullable=False),
        sa.Column("peer_endorsements", sa.Integer(), nullable=False),
        sa.Column("sample_work_score", sa.Integer(), nullable=False),
        sa.Column("voice_intro_url", sa.String(1000)),
        sa.Column(
            "sample_work_urls",
            postgresql.JSONB(),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.CheckConstraint(
            "trust_score BETWEEN 0 AND 100",
            name=op.f("ck_artisan_profiles_trust_score"),
        ),
        sa.CheckConstraint(
            "average_rating_milli BETWEEN 0 AND 5000",
            name=op.f("ck_artisan_profiles_average_rating_milli"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_table(
        "resident_profiles",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("camp_phase", sa.String(120), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_table(
        "jobs",
        sa.Column("resident_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("artisan_id", postgresql.UUID(as_uuid=True)),
        sa.Column("trade", enum("job_trade"), nullable=False),
        sa.Column("description_encrypted", sa.Text(), nullable=False),
        sa.Column("service_area", sa.String(200), nullable=False),
        sa.Column(
            "photos", postgresql.JSONB(),
            server_default=sa.text("'[]'::jsonb"), nullable=False,
        ),
        sa.Column("status", enum("job_status"), nullable=False),
        sa.Column("price_kobo", sa.BigInteger()),
        sa.Column("escrow_status", enum("escrow_status"), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.CheckConstraint(
            "price_kobo IS NULL OR price_kobo > 0",
            name=op.f("ck_jobs_price_positive"),
        ),
        sa.ForeignKeyConstraint(["resident_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["artisan_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_jobs_status", "jobs", ["status"])
    op.create_index("ix_jobs_trade", "jobs", ["trade"])
    op.create_table(
        "job_events",
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", enum("job_event_type"), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_job_events_job_id", "job_events", ["job_id"])
    op.create_table(
        "escrow_transactions",
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount_kobo", sa.BigInteger(), nullable=False),
        sa.Column("platform_fee_kobo", sa.BigInteger(), nullable=False),
        sa.Column("artisan_amount_kobo", sa.BigInteger(), nullable=False),
        sa.Column(
            "status", enum("escrow_transaction_status"), nullable=False
        ),
        sa.Column("provider_reference", sa.String(200), nullable=False),
        sa.Column("funded_at", sa.DateTime(timezone=True)),
        sa.Column("settled_at", sa.DateTime(timezone=True)),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_id"),
        sa.UniqueConstraint("provider_reference"),
    )
    op.create_table(
        "reviews",
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("to_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("text_encrypted", sa.Text()),
        sa.Column("voice_url", sa.String(1000)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.CheckConstraint(
            "rating BETWEEN 1 AND 5", name=op.f("ck_reviews_rating_range")
        ),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"]),
        sa.ForeignKeyConstraint(["from_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["to_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_id"),
    )
    op.create_table(
        "disputes",
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("opener_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reason_encrypted", sa.Text(), nullable=False),
        sa.Column("status", enum("dispute_status"), nullable=False),
        sa.Column("resolution", enum("dispute_resolution")),
        sa.Column("resolution_notes_encrypted", sa.Text()),
        sa.Column("mediator_id", postgresql.UUID(as_uuid=True)),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"]),
        sa.ForeignKeyConstraint(["opener_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["mediator_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_id"),
    )


def downgrade() -> None:
    for table in (
        "disputes", "reviews", "escrow_transactions", "job_events",
        "jobs", "resident_profiles", "artisan_profiles",
    ):
        op.drop_table(table)
    bind = op.get_bind()
    for name in reversed(list(ENUMS)):
        postgresql.ENUM(name=name).drop(bind, checkfirst=True)
    # PostgreSQL enum values added to user_role are intentionally retained.
