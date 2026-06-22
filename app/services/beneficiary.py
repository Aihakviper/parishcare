from dataclasses import dataclass
from difflib import SequenceMatcher
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, settings
from app.core.rbac import (
    Permission,
    require_parish_scope,
    require_permission,
)
from app.models.beneficiary import Beneficiary, PhoneHistory
from app.models.enums import VerificationStatus
from app.models.parish import Parish
from app.models.user import User
from app.schemas.beneficiary import BeneficiaryCreate
from app.services.audit import AuditService
from app.services.errors import ResourceConflictError, ResourceNotFoundError
from app.utils.crypto import (
    LookupHasher,
    PIICipher,
    normalize_person_name,
    normalize_phone,
)

BENEFICIARY_NAME_CONTEXT = "beneficiaries.name"
BENEFICIARY_PHONE_CONTEXT = "beneficiaries.phone"


@dataclass(frozen=True)
class BeneficiaryRegistrationResult:
    beneficiary: Beneficiary
    possible_duplicate_count: int


@dataclass(frozen=True)
class BeneficiaryLookupResult:
    outcome: str
    beneficiary: Beneficiary | None
    verification_status: VerificationStatus | None


class BeneficiaryService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        config: Settings = settings,
    ) -> None:
        self._session = session
        self._config = config
        self._cipher = PIICipher(config.pii_encryption_key)
        self._lookup_hasher = LookupHasher(config.pii_lookup_key)
        self._audit = AuditService(session)

    async def register(
        self,
        *,
        actor: User,
        data: BeneficiaryCreate,
    ) -> BeneficiaryRegistrationResult:
        require_permission(actor, Permission.BENEFICIARY_CREATE)
        require_parish_scope(actor, data.home_parish_id)

        try:
            await self._require_active_parish(data.home_parish_id)
            normalized_phone = normalize_phone(data.phone)
            phone_hash = self._lookup_hasher.digest(normalized_phone)
            if await self._find_by_phone_hash(phone_hash) is not None:
                raise ResourceConflictError(
                    "A beneficiary with this phone already exists"
                )

            normalized_name = normalize_person_name(data.name)
            duplicate_count = await self._count_name_candidates(
                normalized_name
            )
            beneficiary = Beneficiary(
                name_encrypted=self._cipher.encrypt(
                    data.name,
                    context=BENEFICIARY_NAME_CONTEXT,
                ),
                name_normalised=normalized_name,
                phone_encrypted=self._cipher.encrypt(
                    normalized_phone,
                    context=BENEFICIARY_PHONE_CONTEXT,
                ),
                phone_hash=phone_hash,
                home_parish_id=data.home_parish_id,
                dependents_count=data.dependents_count,
                verification_status=VerificationStatus.UNVERIFIED,
            )
            self._session.add(beneficiary)
            await self._session.flush()
            await self._audit.record(
                actor_id=actor.id,
                action="beneficiary.created",
                entity_type="beneficiary",
                entity_id=beneficiary.id,
                after_state={
                    "home_parish_id": beneficiary.home_parish_id,
                    "dependents_count": beneficiary.dependents_count,
                    "verification_status": beneficiary.verification_status.value,
                    "possible_duplicate_count": duplicate_count,
                },
            )
            await self._session.commit()
            await self._session.refresh(beneficiary)
            return BeneficiaryRegistrationResult(
                beneficiary=beneficiary,
                possible_duplicate_count=duplicate_count,
            )
        except IntegrityError as exc:
            await self._session.rollback()
            raise ResourceConflictError(
                "A beneficiary with this phone already exists"
            ) from exc
        except Exception:
            await self._session.rollback()
            raise

    async def lookup(
        self,
        *,
        actor: User,
        phone: str,
    ) -> BeneficiaryLookupResult:
        require_permission(actor, Permission.BENEFICIARY_LOOKUP)

        try:
            normalized_phone = normalize_phone(phone)
            phone_hash = self._lookup_hasher.digest(normalized_phone)
            beneficiary = await self._find_by_phone_hash(phone_hash)

            if beneficiary is None:
                outcome = "none"
                visible_beneficiary = None
                verification_status = None
                audit_entity_id = actor.id
                same_parish = False
            elif beneficiary.home_parish_id == actor.parish_id:
                outcome = "match"
                visible_beneficiary = beneficiary
                verification_status = beneficiary.verification_status
                audit_entity_id = beneficiary.id
                same_parish = True
            else:
                outcome = "restricted_match"
                visible_beneficiary = None
                verification_status = beneficiary.verification_status
                audit_entity_id = beneficiary.id
                same_parish = False

            await self._audit.record(
                actor_id=actor.id,
                action="beneficiary.lookup",
                entity_type=(
                    "beneficiary"
                    if beneficiary is not None
                    else "beneficiary_lookup"
                ),
                entity_id=audit_entity_id,
                after_state={
                    "outcome": outcome,
                    "same_parish": same_parish,
                },
            )
            await self._session.commit()
            return BeneficiaryLookupResult(
                outcome=outcome,
                beneficiary=visible_beneficiary,
                verification_status=verification_status,
            )
        except Exception:
            await self._session.rollback()
            raise

    async def get(
        self,
        *,
        actor: User,
        beneficiary_id: UUID,
    ) -> Beneficiary:
        require_permission(actor, Permission.BENEFICIARY_LOOKUP)
        result = await self._session.execute(
            select(Beneficiary).where(
                Beneficiary.id == beneficiary_id,
                Beneficiary.deleted_at.is_(None),
            )
        )
        beneficiary = result.scalar_one_or_none()
        if beneficiary is None:
            raise ResourceNotFoundError("Beneficiary not found")
        require_parish_scope(actor, beneficiary.home_parish_id)
        return beneficiary

    async def _find_by_phone_hash(
        self,
        phone_hash: str,
    ) -> Beneficiary | None:
        current_result = await self._session.execute(
            select(Beneficiary).where(
                Beneficiary.phone_hash == phone_hash,
                Beneficiary.deleted_at.is_(None),
            )
        )
        beneficiary = current_result.scalar_one_or_none()
        if beneficiary is not None:
            return beneficiary

        historical_result = await self._session.execute(
            select(Beneficiary)
            .join(
                PhoneHistory,
                PhoneHistory.beneficiary_id == Beneficiary.id,
            )
            .where(
                PhoneHistory.phone_hash == phone_hash,
                Beneficiary.deleted_at.is_(None),
            )
            .order_by(PhoneHistory.active_from.desc())
            .limit(1)
        )
        return historical_result.scalar_one_or_none()

    async def _count_name_candidates(self, normalized_name: str) -> int:
        first_token = normalized_name.split()[0]
        result = await self._session.execute(
            select(Beneficiary.name_normalised)
            .where(
                Beneficiary.name_normalised.like(f"{first_token}%"),
                Beneficiary.deleted_at.is_(None),
            )
            .limit(self._config.beneficiary_duplicate_candidate_limit)
        )
        return sum(
            SequenceMatcher(
                None,
                normalized_name,
                candidate_name,
            ).ratio()
            >= self._config.beneficiary_name_similarity_threshold
            for candidate_name in result.scalars()
        )

    async def _require_active_parish(self, parish_id: UUID) -> None:
        result = await self._session.execute(
            select(Parish.id).where(
                Parish.id == parish_id,
                Parish.deleted_at.is_(None),
            )
        )
        if result.scalar_one_or_none() is None:
            raise ResourceNotFoundError("Parish not found")
