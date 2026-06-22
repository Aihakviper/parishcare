from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, settings
from app.core.rbac import (
    Permission,
    require_parish_scope,
    require_permission,
)
from app.models.parish import Parish
from app.models.user import User
from app.schemas.parish import ParishCreate, ParishUpdate
from app.services.audit import AuditService
from app.services.errors import ResourceNotFoundError
from app.utils.crypto import LookupHasher, PIICipher, normalize_phone

CONTACT_NAME_CONTEXT = "parishes.contact_name"
CONTACT_PHONE_CONTEXT = "parishes.contact_phone"


class ParishService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        config: Settings = settings,
    ) -> None:
        self._session = session
        self._cipher = PIICipher(config.pii_encryption_key)
        self._lookup_hasher = LookupHasher(config.pii_lookup_key)
        self._audit = AuditService(session)

    async def create(self, *, actor: User, data: ParishCreate) -> Parish:
        require_permission(actor, Permission.PARISH_CREATE)

        try:
            normalized_phone = normalize_phone(data.contact_phone)
            parish = Parish(
                name=data.name,
                region=data.region,
                address=data.address,
                contact_name_encrypted=self._cipher.encrypt(
                    data.contact_name,
                    context=CONTACT_NAME_CONTEXT,
                ),
                contact_phone_encrypted=self._cipher.encrypt(
                    normalized_phone,
                    context=CONTACT_PHONE_CONTEXT,
                ),
                contact_phone_hash=self._lookup_hasher.digest(normalized_phone),
            )
            self._session.add(parish)
            await self._session.flush()
            await self._audit.record(
                actor_id=actor.id,
                action="parish.created",
                entity_type="parish",
                entity_id=parish.id,
                after_state=_audit_state(parish),
            )
            await self._session.commit()
            await self._session.refresh(parish)
            return parish
        except Exception:
            await self._session.rollback()
            raise

    async def get(self, *, actor: User, parish_id: UUID) -> Parish:
        require_permission(actor, Permission.PARISH_VIEW)
        require_parish_scope(actor, parish_id)
        return await self._get_active(parish_id)

    async def update(
        self,
        *,
        actor: User,
        parish_id: UUID,
        data: ParishUpdate,
    ) -> Parish:
        require_permission(actor, Permission.PARISH_UPDATE)
        require_parish_scope(actor, parish_id)

        try:
            parish = await self._get_active(parish_id)
            before_state = _audit_state(parish)

            if "name" in data.model_fields_set:
                parish.name = data.name or ""
            if "region" in data.model_fields_set:
                parish.region = data.region or ""
            if "address" in data.model_fields_set:
                parish.address = data.address
            if "contact_name" in data.model_fields_set:
                parish.contact_name_encrypted = self._cipher.encrypt(
                    data.contact_name or "",
                    context=CONTACT_NAME_CONTEXT,
                )
            if "contact_phone" in data.model_fields_set:
                normalized_phone = normalize_phone(data.contact_phone or "")
                parish.contact_phone_encrypted = self._cipher.encrypt(
                    normalized_phone,
                    context=CONTACT_PHONE_CONTEXT,
                )
                parish.contact_phone_hash = self._lookup_hasher.digest(
                    normalized_phone
                )

            await self._session.flush()
            await self._audit.record(
                actor_id=actor.id,
                action="parish.updated",
                entity_type="parish",
                entity_id=parish.id,
                before_state=before_state,
                after_state=_audit_state(parish),
            )
            await self._session.commit()
            await self._session.refresh(parish)
            return parish
        except Exception:
            await self._session.rollback()
            raise

    async def _get_active(self, parish_id: UUID) -> Parish:
        result = await self._session.execute(
            select(Parish).where(
                Parish.id == parish_id,
                Parish.deleted_at.is_(None),
            )
        )
        parish = result.scalar_one_or_none()
        if parish is None:
            raise ResourceNotFoundError("Parish not found")
        return parish


def _audit_state(parish: Parish) -> dict[str, object]:
    return {
        "name": parish.name,
        "region": parish.region,
        "has_address": parish.address is not None,
        "contact_configured": bool(parish.contact_phone_hash),
        "deleted": parish.deleted_at is not None,
    }
