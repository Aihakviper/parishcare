from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.bootstrap_config import BootstrapSettings
from app.core.config import Settings, settings
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User
from app.services.audit import AuditService
from app.services.errors import ResourceConflictError, ServiceValidationError
from app.services.user import USER_EMAIL_CONTEXT, USER_NAME_CONTEXT
from app.utils.crypto import LookupHasher, PIICipher, normalize_email

BOOTSTRAP_LOCK_ID = 1_347_221_092


class BootstrapService:
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

    async def create_first_hq(
        self,
        bootstrap: BootstrapSettings,
    ) -> User:
        if not bootstrap.enabled:
            raise ServiceValidationError(
                "HQ bootstrap is disabled in the environment"
            )

        try:
            await self._session.execute(
                text("SELECT pg_advisory_xact_lock(:lock_id)"),
                {"lock_id": BOOTSTRAP_LOCK_ID},
            )
            existing_hq = await self._session.execute(
                select(User.id).where(User.role == UserRole.HQ).limit(1)
            )
            if existing_hq.scalar_one_or_none() is not None:
                raise ResourceConflictError(
                    "An HQ administrator already exists"
                )

            normalized_email = normalize_email(str(bootstrap.hq_email))
            email_hash = self._lookup_hasher.digest(normalized_email)
            existing_email = await self._session.execute(
                select(User.id).where(User.email_hash == email_hash).limit(1)
            )
            if existing_email.scalar_one_or_none() is not None:
                raise ResourceConflictError("User email already exists")

            user = User(
                name_encrypted=self._cipher.encrypt(
                    bootstrap.hq_name,
                    context=USER_NAME_CONTEXT,
                ),
                email_encrypted=self._cipher.encrypt(
                    normalized_email,
                    context=USER_EMAIL_CONTEXT,
                ),
                email_hash=email_hash,
                password_hash=hash_password(bootstrap.hq_password),
                role=UserRole.HQ,
                parish_id=None,
                mfa_enabled=bootstrap.hq_mfa_enabled,
                is_active=True,
            )
            self._session.add(user)
            await self._session.flush()
            await self._audit.record(
                actor_id=None,
                action="system.hq_bootstrapped",
                entity_type="user",
                entity_id=user.id,
                after_state={
                    "role": UserRole.HQ.value,
                    "parish_id": None,
                    "mfa_enabled": user.mfa_enabled,
                    "is_active": user.is_active,
                    "bootstrap": True,
                },
            )
            await self._session.commit()
            await self._session.refresh(user)
            return user
        except IntegrityError as exc:
            await self._session.rollback()
            raise ResourceConflictError(
                "HQ bootstrap conflicted with an existing user"
            ) from exc
        except Exception:
            await self._session.rollback()
            raise
