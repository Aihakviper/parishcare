"""Add WhatsApp marketplace conversations and inbound idempotency.

Revision ID: 20260623_0007
Revises: 20260622_0006
Create Date: 2026-06-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260623_0007"
down_revision: Union[str, Sequence[str], None] = "20260622_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "whatsapp_conversations",
        sa.Column("phone_encrypted", sa.Text(), nullable=False),
        sa.Column("phone_hash", sa.String(64), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True)),
        sa.Column(
            "state",
            sa.String(50),
            server_default="menu",
            nullable=False,
        ),
        sa.Column(
            "context",
            postgresql.JSONB(),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=False),
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
            ["user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("phone_hash"),
    )
    op.create_index(
        "ix_whatsapp_conversations_user_id",
        "whatsapp_conversations",
        ["user_id"],
    )
    op.create_table(
        "whatsapp_inbound_events",
        sa.Column("provider_message_id", sa.String(255), nullable=False),
        sa.Column(
            "conversation_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("command", sa.String(50), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("response_encrypted", sa.Text()),
        sa.Column("error_code", sa.String(100)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True)),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["conversation_id"],
            ["whatsapp_conversations.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_message_id"),
    )
    op.create_index(
        "ix_whatsapp_inbound_events_conversation_id",
        "whatsapp_inbound_events",
        ["conversation_id"],
    )
    op.create_index(
        "ix_whatsapp_inbound_events_created_at",
        "whatsapp_inbound_events",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_table("whatsapp_inbound_events")
    op.drop_table("whatsapp_conversations")
