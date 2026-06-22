"""Create idempotent mock disbursements.

Revision ID: 20260622_0005
Revises: 20260622_0004
Create Date: 2026-06-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260622_0005"
down_revision: Union[str, Sequence[str], None] = "20260622_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

payment_method = postgresql.ENUM(
    "mock",
    name="payment_method",
    create_type=False,
)
settlement_status = postgresql.ENUM(
    "pending",
    "settled",
    "failed",
    name="settlement_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    payment_method.create(bind, checkfirst=True)
    settlement_status.create(bind, checkfirst=True)

    op.create_table(
        "disbursements",
        sa.Column(
            "welfare_request_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("amount_kobo", sa.BigInteger(), nullable=False),
        sa.Column("payment_method", payment_method, nullable=False),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("paid_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "idempotency_key",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "request_fingerprint",
            sa.String(length=64),
            nullable=False,
        ),
        sa.Column("rail_reference", sa.String(length=200), nullable=False),
        sa.Column("settlement_status", settlement_status, nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("receipt_url", sa.String(length=1000), nullable=True),
        sa.Column("notes_encrypted", sa.Text(), nullable=True),
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
            "amount_kobo > 0",
            name=op.f("ck_disbursements_amount_positive"),
        ),
        sa.ForeignKeyConstraint(
            ["welfare_request_id"],
            ["welfare_requests.id"],
            name=op.f(
                "fk_disbursements_welfare_request_id_welfare_requests"
            ),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["approved_by"],
            ["users.id"],
            name=op.f("fk_disbursements_approved_by_users"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["paid_by"],
            ["users.id"],
            name=op.f("fk_disbursements_paid_by_users"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_disbursements")),
        sa.UniqueConstraint(
            "welfare_request_id",
            name=op.f("uq_disbursements_welfare_request_id"),
        ),
        sa.UniqueConstraint(
            "idempotency_key",
            name=op.f("uq_disbursements_idempotency_key"),
        ),
        sa.UniqueConstraint(
            "rail_reference",
            name=op.f("uq_disbursements_rail_reference"),
        ),
    )
    op.create_index(
        "ix_disbursements_welfare_request_id",
        "disbursements",
        ["welfare_request_id"],
    )
    op.create_index(
        "ix_disbursements_settlement_status",
        "disbursements",
        ["settlement_status"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_disbursements_settlement_status",
        table_name="disbursements",
    )
    op.drop_index(
        "ix_disbursements_welfare_request_id",
        table_name="disbursements",
    )
    op.drop_table("disbursements")

    bind = op.get_bind()
    settlement_status.drop(bind, checkfirst=True)
    payment_method.drop(bind, checkfirst=True)
