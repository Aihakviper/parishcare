"""Create welfare requests with scoring and risk metadata.

Revision ID: 20260622_0003
Revises: 20260622_0002
Create Date: 2026-06-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260622_0003"
down_revision: Union[str, Sequence[str], None] = "20260622_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

request_type = postgresql.ENUM(
    "school",
    "medical",
    "food",
    "loan",
    "widow",
    "rent",
    name="welfare_request_type",
    create_type=False,
)
request_status = postgresql.ENUM(
    "pending",
    "verified",
    "approved",
    "paid",
    "rejected",
    name="welfare_request_status",
    create_type=False,
)
priority_band = postgresql.ENUM(
    "low",
    "medium",
    "high",
    name="priority_band",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    request_type.create(bind, checkfirst=True)
    request_status.create(bind, checkfirst=True)
    priority_band.create(bind, checkfirst=True)

    op.create_table(
        "welfare_requests",
        sa.Column("beneficiary_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("request_type", request_type, nullable=False),
        sa.Column("amount_requested_kobo", sa.BigInteger(), nullable=False),
        sa.Column("reason_encrypted", sa.Text(), nullable=False),
        sa.Column(
            "is_urgent",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("deadline_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            request_status,
            server_default="pending",
            nullable=False,
        ),
        sa.Column("priority_score", sa.Integer(), nullable=False),
        sa.Column("priority_band", priority_band, nullable=False),
        sa.Column("scoring_version", sa.String(length=50), nullable=False),
        sa.Column("score_breakdown", postgresql.JSONB(), nullable=False),
        sa.Column(
            "risk_flags",
            postgresql.JSONB(),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("transition_reason_encrypted", sa.Text(), nullable=True),
        sa.Column("transitioned_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("transitioned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision_reason_encrypted", sa.Text(), nullable=True),
        sa.Column("decided_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("risk_review_reason_encrypted", sa.Text(), nullable=True),
        sa.Column("risk_reviewed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("risk_reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "amount_requested_kobo > 0",
            name=op.f("ck_welfare_requests_amount_requested_positive"),
        ),
        sa.CheckConstraint(
            "priority_score BETWEEN 0 AND 100",
            name=op.f("ck_welfare_requests_priority_score_range"),
        ),
        sa.ForeignKeyConstraint(
            ["beneficiary_id"],
            ["beneficiaries.id"],
            name=op.f("fk_welfare_requests_beneficiary_id_beneficiaries"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
            name=op.f("fk_welfare_requests_created_by_users"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["decided_by"],
            ["users.id"],
            name=op.f("fk_welfare_requests_decided_by_users"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["transitioned_by"],
            ["users.id"],
            name=op.f("fk_welfare_requests_transitioned_by_users"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["risk_reviewed_by"],
            ["users.id"],
            name=op.f("fk_welfare_requests_risk_reviewed_by_users"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_welfare_requests")),
    )
    op.create_index(
        "ix_welfare_requests_beneficiary_id",
        "welfare_requests",
        ["beneficiary_id"],
    )
    op.create_index(
        "ix_welfare_requests_created_by",
        "welfare_requests",
        ["created_by"],
    )
    op.create_index(
        "ix_welfare_requests_status",
        "welfare_requests",
        ["status"],
    )
    op.create_index(
        "ix_welfare_requests_created_at",
        "welfare_requests",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_welfare_requests_created_at", table_name="welfare_requests")
    op.drop_index("ix_welfare_requests_status", table_name="welfare_requests")
    op.drop_index("ix_welfare_requests_created_by", table_name="welfare_requests")
    op.drop_index(
        "ix_welfare_requests_beneficiary_id",
        table_name="welfare_requests",
    )
    op.drop_table("welfare_requests")

    bind = op.get_bind()
    priority_band.drop(bind, checkfirst=True)
    request_status.drop(bind, checkfirst=True)
    request_type.drop(bind, checkfirst=True)
