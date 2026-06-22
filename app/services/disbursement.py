import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, settings
from app.core.rbac import Permission, require_parish_scope, require_permission
from app.models.beneficiary import Beneficiary
from app.models.disbursement import Disbursement
from app.models.enums import (
    PaymentMethod,
    SettlementStatus,
    WelfareRequestStatus,
)
from app.models.user import User
from app.models.welfare_request import WelfareRequest
from app.schemas.disbursement import DisbursementCreate
from app.services.audit import AuditService
from app.services.errors import (
    ResourceConflictError,
    ResourceNotFoundError,
    ServiceValidationError,
)
from app.utils.crypto import PIICipher

DISBURSEMENT_NOTES_CONTEXT = "disbursements.notes"


@dataclass(frozen=True)
class DisbursementResult:
    disbursement: Disbursement
    idempotent_replay: bool


class DisbursementService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        config: Settings = settings,
    ) -> None:
        self._session = session
        self._config = config
        self._cipher = PIICipher(config.pii_encryption_key)
        self._audit = AuditService(session)

    async def execute(
        self,
        *,
        actor: User,
        data: DisbursementCreate,
        idempotency_key: UUID,
    ) -> DisbursementResult:
        require_permission(actor, Permission.DISBURSEMENT_EXECUTE)
        fingerprint = _request_fingerprint(data)

        try:
            existing = await self._find_existing(idempotency_key)
            if existing is not None:
                disbursement, parish_id = existing
                require_parish_scope(actor, parish_id)
                _validate_replay(disbursement, fingerprint)
                return DisbursementResult(disbursement, True)

            request, parish_id = await self._lock_request(
                data.welfare_request_id
            )
            require_parish_scope(actor, parish_id)

            # A concurrent request with the same key may have committed while
            # this transaction waited for the welfare request lock.
            existing = await self._find_existing(idempotency_key)
            if existing is not None:
                disbursement, existing_parish_id = existing
                require_parish_scope(actor, existing_parish_id)
                _validate_replay(disbursement, fingerprint)
                return DisbursementResult(disbursement, True)

            self._validate_new_disbursement(request, actor, data)
            disbursement_id = uuid4()
            paid_at = datetime.now(timezone.utc)
            rail_reference = (
                f"{self._config.mock_payment_provider_name}-"
                f"{disbursement_id.hex}"
            )
            receipt_url = (
                f"{self._config.mock_payment_receipt_base_url.rstrip('/')}/"
                f"{rail_reference}"
            )
            disbursement = Disbursement(
                id=disbursement_id,
                welfare_request_id=request.id,
                amount_kobo=data.amount_kobo,
                payment_method=PaymentMethod.MOCK,
                approved_by=request.decided_by,
                paid_by=actor.id,
                idempotency_key=idempotency_key,
                request_fingerprint=fingerprint,
                rail_reference=rail_reference,
                settlement_status=SettlementStatus.SETTLED,
                paid_at=paid_at,
                receipt_url=receipt_url,
                notes_encrypted=(
                    self._cipher.encrypt(
                        data.notes,
                        context=DISBURSEMENT_NOTES_CONTEXT,
                    )
                    if data.notes
                    else None
                ),
            )
            before_status = request.status
            request.status = WelfareRequestStatus.PAID
            request.transitioned_by = actor.id
            request.transitioned_at = paid_at
            self._session.add(disbursement)
            await self._session.flush()
            await self._audit.record(
                actor_id=actor.id,
                action="disbursement.executed",
                entity_type="disbursement",
                entity_id=disbursement.id,
                after_state={
                    "welfare_request_id": request.id,
                    "amount_kobo": disbursement.amount_kobo,
                    "payment_method": disbursement.payment_method.value,
                    "approved_by": disbursement.approved_by,
                    "paid_by": disbursement.paid_by,
                    "settlement_status": (
                        disbursement.settlement_status.value
                    ),
                    "rail_reference": disbursement.rail_reference,
                    "request_status_before": before_status.value,
                    "request_status_after": request.status.value,
                },
            )
            await self._session.commit()
            await self._session.refresh(disbursement)
            return DisbursementResult(disbursement, False)
        except IntegrityError as exc:
            await self._session.rollback()
            existing = await self._find_existing(idempotency_key)
            if existing is not None:
                disbursement, parish_id = existing
                require_parish_scope(actor, parish_id)
                _validate_replay(disbursement, fingerprint)
                return DisbursementResult(disbursement, True)
            raise ResourceConflictError(
                "Welfare request already has a disbursement"
            ) from exc
        except Exception:
            await self._session.rollback()
            raise

    async def _find_existing(
        self,
        idempotency_key: UUID,
    ) -> tuple[Disbursement, UUID] | None:
        result = await self._session.execute(
            select(Disbursement, Beneficiary.home_parish_id)
            .join(
                WelfareRequest,
                WelfareRequest.id == Disbursement.welfare_request_id,
            )
            .join(
                Beneficiary,
                Beneficiary.id == WelfareRequest.beneficiary_id,
            )
            .where(Disbursement.idempotency_key == idempotency_key)
        )
        row = result.one_or_none()
        if row is None:
            return None
        return row[0], row[1]

    async def _lock_request(
        self,
        request_id: UUID,
    ) -> tuple[WelfareRequest, UUID]:
        result = await self._session.execute(
            select(WelfareRequest, Beneficiary.home_parish_id)
            .join(
                Beneficiary,
                Beneficiary.id == WelfareRequest.beneficiary_id,
            )
            .where(
                WelfareRequest.id == request_id,
                Beneficiary.deleted_at.is_(None),
            )
            .with_for_update(of=WelfareRequest)
        )
        row = result.one_or_none()
        if row is None:
            raise ResourceNotFoundError("Welfare request not found")
        return row[0], row[1]

    def _validate_new_disbursement(
        self,
        request: WelfareRequest,
        actor: User,
        data: DisbursementCreate,
    ) -> None:
        if request.status != WelfareRequestStatus.APPROVED:
            raise ServiceValidationError(
                "Only approved welfare requests can be disbursed"
            )
        if request.risk_flags:
            raise ServiceValidationError(
                "Welfare request has uncleared anti-fraud flags"
            )
        if request.decided_by is None:
            raise ServiceValidationError(
                "Welfare request has no recorded approver"
            )
        if data.amount_kobo != request.amount_requested_kobo:
            raise ServiceValidationError(
                "Disbursement amount must equal the approved request amount"
            )
        if (
            data.amount_kobo > self._config.maker_checker_threshold_kobo
            and request.decided_by == actor.id
        ):
            raise ServiceValidationError(
                "Maker-checker requires a different payer above the threshold"
            )


def _request_fingerprint(data: DisbursementCreate) -> str:
    payload = json.dumps(
        {
            "welfare_request_id": str(data.welfare_request_id),
            "amount_kobo": data.amount_kobo,
            "notes": data.notes,
        },
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _validate_replay(
    disbursement: Disbursement,
    fingerprint: str,
) -> None:
    if disbursement.request_fingerprint != fingerprint:
        raise ResourceConflictError(
            "Idempotency key was already used with different parameters"
        )
