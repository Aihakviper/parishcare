from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from sqlalchemy import Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.beneficiary import Beneficiary
    from app.models.user import User


class Parish(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "parishes"
    __table_args__ = (
        Index("ix_parishes_contact_phone_hash", "contact_phone_hash"),
        Index("ix_parishes_name", "name"),
        Index("ix_parishes_region", "region"),
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    region: Mapped[str] = mapped_column(String(120), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    contact_name_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    contact_phone_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    contact_phone_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    users: Mapped[list[User]] = relationship(back_populates="parish")
    beneficiaries: Mapped[list[Beneficiary]] = relationship(
        back_populates="home_parish"
    )
