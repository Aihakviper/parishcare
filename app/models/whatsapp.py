from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class WhatsAppConversation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "whatsapp_conversations"
    __table_args__ = (
        Index("ix_whatsapp_conversations_user_id", "user_id"),
    )

    phone_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    phone_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True
    )
    user_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    state: Mapped[str] = mapped_column(
        String(50), nullable=False, default="menu"
    )
    context: Mapped[dict[str, object]] = mapped_column(
        JSONB, nullable=False, default=dict
    )
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class WhatsAppInboundEvent(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "whatsapp_inbound_events"
    __table_args__ = (
        Index("ix_whatsapp_inbound_events_conversation_id", "conversation_id"),
        Index("ix_whatsapp_inbound_events_created_at", "created_at"),
    )

    provider_message_id: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True
    )
    conversation_id: Mapped[UUID] = mapped_column(
        ForeignKey("whatsapp_conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    command: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    response_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    error_code: Mapped[Optional[str]] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )
