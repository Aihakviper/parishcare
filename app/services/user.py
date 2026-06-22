from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, settings
from app.core.rbac import (
    Permission,
    AuthorizationError,
    require_permission,
    require_user_management_scope,
)
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.parish import Parish
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services.audit import AuditService
from app.services.errors import (
    ResourceConflictError,
    ResourceNotFoundError,
    ServiceValidationError,
)
from app.utils.crypto import LookupHasher, PIICipher, normalize_email

USER_NAME_CONTEXT = "users.name"
USER_EMAIL_CONTEXT = "users.email"
PAYMENT_CAPABLE_ROLES = {UserRole.OFFICER, UserRole.PASTOR}


class UserService:
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

    async def create(self, *, actor: User, data: UserCreate) -> User:
        require_permission(actor, Permission.USER_CREATE)
        require_user_management_scope(
            actor,
            target_role=data.role,
            target_parish_id=data.parish_id,
        )
        try:
            await self._require_valid_parish(data.parish_id)
            normalized_email = normalize_email(str(data.email))
            await self._require_email_available(normalized_email)
            user = User(
                name_encrypted=self._cipher.encrypt(
                    data.name,
                    context=USER_NAME_CONTEXT,
                ),
                email_encrypted=self._cipher.encrypt(
                    normalized_email,
                    context=USER_EMAIL_CONTEXT,
                ),
                email_hash=self._lookup_hasher.digest(normalized_email),
                password_hash=hash_password(data.password),
                role=data.role,
                parish_id=data.parish_id,
                mfa_enabled=data.mfa_enabled,
                is_active=True,
            )
            self._session.add(user)
            await self._session.flush()
            await self._audit.record(
                actor_id=actor.id,
                action="user.created",
                entity_type="user",
                entity_id=user.id,
                after_state=_audit_state(user),
            )
            await self._session.commit()
            await self._session.refresh(user)
            return user
        except IntegrityError as exc:
            await self._session.rollback()
            raise ResourceConflictError("User email already exists") from exc
        except Exception:
            await self._session.rollback()
            raise

    async def update(
        self,
        *,
        actor: User,
        user_id: UUID,
        data: UserUpdate,
    ) -> User:
        require_permission(actor, Permission.USER_UPDATE)
        try:
            user = await self._get_active(user_id)
            effective_role = (
                data.role if "role" in data.model_fields_set else user.role
            )
            effective_parish_id = (
                data.parish_id
                if "parish_id" in data.model_fields_set
                else user.parish_id
            )
            require_user_management_scope(
                actor,
                target_role=effective_role,
                target_parish_id=effective_parish_id,
            )
            _validate_assignment(effective_role, effective_parish_id)
            await self._require_valid_parish(effective_parish_id)

            if actor.id == user.id:
                if data.is_active is False:
                    raise AuthorizationError(
                        "Users cannot deactivate themselves"
                    )
                if (
                    "role" in data.model_fields_set
                    or "parish_id" in data.model_fields_set
                ):
                    raise AuthorizationError(
                        "Users cannot change their own role or parish"
                    )

            effective_mfa = (
                data.mfa_enabled
                if "mfa_enabled" in data.model_fields_set
                else user.mfa_enabled
            )
            if effective_role in PAYMENT_CAPABLE_ROLES and not effective_mfa:
                raise ServiceValidationError(
                    "Payment-capable roles require MFA"
                )

            before_state = _audit_state(user)
            if "name" in data.model_fields_set:
                user.name_encrypted = self._cipher.encrypt(
                    data.name or "",
                    context=USER_NAME_CONTEXT,
                )
            if "email" in data.model_fields_set:
                normalized_email = normalize_email(str(data.email))
                email_hash = self._lookup_hasher.digest(normalized_email)
                if email_hash != user.email_hash:
                    await self._require_email_available(normalized_email)
                    user.email_encrypted = self._cipher.encrypt(
                        normalized_email,
                        context=USER_EMAIL_CONTEXT,
                    )
                    user.email_hash = email_hash
            if "password" in data.model_fields_set:
                user.password_hash = hash_password(data.password or "")
            if "role" in data.model_fields_set:
                user.role = effective_role
            if "parish_id" in data.model_fields_set:
                user.parish_id = effective_parish_id
            if "mfa_enabled" in data.model_fields_set:
                user.mfa_enabled = bool(data.mfa_enabled)
            if "is_active" in data.model_fields_set:
                user.is_active = bool(data.is_active)

            await self._session.flush()
            await self._audit.record(
                actor_id=actor.id,
                action="user.updated",
                entity_type="user",
                entity_id=user.id,
                before_state=before_state,
                after_state=_audit_state(user),
            )
            await self._session.commit()
            await self._session.refresh(user)
            return user
        except IntegrityError as exc:
            await self._session.rollback()
            raise ResourceConflictError("User email already exists") from exc
        except Exception:
            await self._session.rollback()
            raise

    async def _get_active(self, user_id: UUID) -> User:
        result = await self._session.execute(
            select(User).where(
                User.id == user_id,
                User.deleted_at.is_(None),
            )
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise ResourceNotFoundError("User not found")
        return user

    async def _require_email_available(self, normalized_email: str) -> None:
        email_hash = self._lookup_hasher.digest(normalized_email)
        result = await self._session.execute(
            select(User.id).where(User.email_hash == email_hash)
        )
        if result.scalar_one_or_none() is not None:
            raise ResourceConflictError("User email already exists")

    async def _require_valid_parish(self, parish_id: UUID | None) -> None:
        if parish_id is None:
            return
        result = await self._session.execute(
            select(Parish.id).where(
                Parish.id == parish_id,
                Parish.deleted_at.is_(None),
            )
        )
        if result.scalar_one_or_none() is None:
            raise ResourceNotFoundError("Parish not found")


def _validate_assignment(
    role: UserRole,
    parish_id: UUID | None,
) -> None:
    if role in PAYMENT_CAPABLE_ROLES and parish_id is None:
        raise ServiceValidationError("Parish roles require a parish")
    if role in {UserRole.HQ, UserRole.AUDITOR} and parish_id is not None:
        raise ServiceValidationError(
            "HQ and auditor users cannot belong to a parish"
        )


def _audit_state(user: User) -> dict[str, object]:
    return {
        "role": user.role.value,
        "parish_id": user.parish_id,
        "mfa_enabled": user.mfa_enabled,
        "is_active": user.is_active,
        "deleted": user.deleted_at is not None,
    }
