"""Create verification requests and single-use vouchers.

Revision ID: 20260622_0004
Revises: 20260622_0003
Create Date: 2026-06-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260622_0004"
down_revision: Union[str, Sequence[str], None] = "20260622_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

verification_outcome = postgresql.ENUM(
    "confirmed",
    "rejected",
    "expired",
    name="verification_outcome",
    create_type=False,
)
verification_channel = postgresql.ENUM(
    "mock",
    "whatsapp",
    "sms",
    name="verification_channel",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    verification_outcome.create(bind, checkfirst=True)
    verification_channel.create(bind, checkfirst=True)

    op.create_table(
        "verification_requests",
        sa.Column(
            "welfare_request_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("sent_to_phone_encrypted", sa.Text(), nullable=False),
        sa.Column(
            "sent_to_parish_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("outcome", verification_outcome, nullable=True),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["welfare_request_id"],
            ["welfare_requests.id"],
            name=op.f(
                "fk_verification_requests_welfare_request_id_welfare_requests"
            ),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["sent_to_parish_id"],
            ["parishes.id"],
            name=op.f(
                "fk_verification_requests_sent_to_parish_id_parishes"
            ),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_verification_requests")),
    )
    op.create_index(
        "ix_verification_requests_welfare_request_id",
        "verification_requests",
        ["welfare_request_id"],
    )
    op.create_index(
        "ix_verification_requests_sent_to_parish_id",
        "verification_requests",
        ["sent_to_parish_id"],
    )

    op.create_table(
        "verification_vouchers",
        sa.Column(
            "verification_request_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("channel", verification_channel, nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["verification_request_id"],
            ["verification_requests.id"],
            name=op.f(
                "fk_verification_vouchers_verification_request_id_"
                "verification_requests"
            ),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_verification_vouchers")),
        sa.UniqueConstraint(
            "token_hash",
            name=op.f("uq_verification_vouchers_token_hash"),
        ),
    )
    op.create_index(
        "ix_verification_vouchers_verification_request_id",
        "verification_vouchers",
        ["verification_request_id"],
        unique=True,
    )
    op.create_index(
        "ix_verification_vouchers_expires_at",
        "verification_vouchers",
        ["expires_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_verification_vouchers_expires_at",
        table_name="verification_vouchers",
    )
    op.drop_index(
        "ix_verification_vouchers_verification_request_id",
        table_name="verification_vouchers",
    )
    op.drop_table("verification_vouchers")
    op.drop_index(
        "ix_verification_requests_sent_to_parish_id",
        table_name="verification_requests",
    )
    op.drop_index(
        "ix_verification_requests_welfare_request_id",
        table_name="verification_requests",
    )
    op.drop_table("verification_requests")

    bind = op.get_bind()
    verification_channel.drop(bind, checkfirst=True)
    verification_outcome.drop(bind, checkfirst=True)
