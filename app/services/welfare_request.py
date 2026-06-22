from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, settings
from app.core.rbac import (
    Permission,
    require_parish_scope,
    require_permission,
)
from app.models.beneficiary import Beneficiary
from app.models.enums import UserRole, WelfareRequestStatus, WelfareRequestType
from app.models.user import User
from app.models.welfare_request import WelfareRequest
from app.schemas.welfare_request import (
    WelfareRequestCreate,
    WelfareRequestTransition,
    WelfareRiskReview,
)
from app.services.audit import AuditService
from app.services.errors import ResourceNotFoundError, ServiceValidationError
from app.services.scoring import calculate_priority_score
from app.utils.crypto import PIICipher

REQUEST_REASON_CONTEXT = "welfare_requests.reason"
TRANSITION_REASON_CONTEXT = "welfare_requests.transition_reason"
DECISION_REASON_CONTEXT = "welfare_requests.decision_reason"
RISK_REVIEW_REASON_CONTEXT = "welfare_requests.risk_review_reason"

ACTIVE_REQUEST_STATUSES = {
    WelfareRequestStatus.PENDING,
    WelfareRequestStatus.VERIFIED,
    WelfareRequestStatus.APPROVED,
}
LEGAL_TRANSITIONS = {
    WelfareRequestStatus.PENDING: {
        WelfareRequestStatus.VERIFIED,
        WelfareRequestStatus.REJECTED,
    },
    WelfareRequestStatus.VERIFIED: {
        WelfareRequestStatus.APPROVED,
        WelfareRequestStatus.REJECTED,
    },
}


class WelfareRequestService:
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

    async def create(
        self,
        *,
        actor: User,
        data: WelfareRequestCreate,
    ) -> WelfareRequest:
        require_permission(actor, Permission.WELFARE_REQUEST_CREATE)
        if data.amount_requested_kobo > self._config.welfare_request_max_amount_kobo:
            raise ServiceValidationError(
                "Requested amount exceeds the configured maximum"
            )

        try:
            beneficiary = await self._get_beneficiary(data.beneficiary_id)
            require_parish_scope(actor, beneficiary.home_parish_id)
            now = datetime.now(timezone.utc)
            received_recent_support = await self._has_recent_paid_support(
                beneficiary.id,
                now,
            )
            has_duplicate_active_request = await self._has_duplicate_active_request(
                beneficiary.id,
                data.request_type,
                now,
            )
            risk_flags = self._build_risk_flags(
                amount_requested_kobo=data.amount_requested_kobo,
                received_recent_support=received_recent_support,
                has_duplicate_active_request=has_duplicate_active_request,
            )
            score = calculate_priority_score(
                request_type=data.request_type,
                is_urgent=data.is_urgent,
                deadline_at=data.deadline_at,
                dependents_count=beneficiary.dependents_count,
                verification_status=beneficiary.verification_status,
                received_recent_support=received_recent_support,
                config=self._config,
                now=now,
            )
            request = WelfareRequest(
                beneficiary_id=beneficiary.id,
                created_by=actor.id,
                request_type=data.request_type,
                amount_requested_kobo=data.amount_requested_kobo,
                reason_encrypted=self._cipher.encrypt(
                    data.reason,
                    context=REQUEST_REASON_CONTEXT,
                ),
                is_urgent=data.is_urgent,
                deadline_at=data.deadline_at,
                status=WelfareRequestStatus.PENDING,
                priority_score=score.score,
                priority_band=score.band,
                scoring_version=self._config.scoring_version,
                score_breakdown=score.breakdown,
                risk_flags=risk_flags,
            )
            self._session.add(request)
            await self._session.flush()
            await self._audit.record(
                actor_id=actor.id,
                action="welfare_request.created",
                entity_type="welfare_request",
                entity_id=request.id,
                after_state=_audit_state(request),
            )
            await self._session.commit()
            await self._session.refresh(request)
            return request
        except Exception:
            await self._session.rollback()
            raise

    async def get(
        self,
        *,
        actor: User,
        request_id: UUID,
    ) -> WelfareRequest:
        require_permission(actor, Permission.WELFARE_REQUEST_VIEW)
        request, parish_id = await self._get_request_with_parish(request_id)
        require_parish_scope(actor, parish_id)
        return request

    async def list_requests(
        self,
        *,
        actor: User,
        status: WelfareRequestStatus | None = None,
    ) -> list[WelfareRequest]:
        require_permission(actor, Permission.WELFARE_REQUEST_VIEW)
        query = (
            select(WelfareRequest)
            .join(
                Beneficiary,
                Beneficiary.id == WelfareRequest.beneficiary_id,
            )
            .where(Beneficiary.deleted_at.is_(None))
            .order_by(WelfareRequest.created_at.desc())
        )
        if actor.role != UserRole.HQ:
            if actor.parish_id is None:
                return []
            query = query.where(
                Beneficiary.home_parish_id == actor.parish_id
            )
        if status is not None:
            query = query.where(WelfareRequest.status == status)
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def transition(
        self,
        *,
        actor: User,
        request_id: UUID,
        data: WelfareRequestTransition,
    ) -> WelfareRequest:
        require_permission(actor, Permission.WELFARE_REQUEST_TRANSITION)
        try:
            request, parish_id = await self._get_request_with_parish(request_id)
            require_parish_scope(actor, parish_id)
            allowed = LEGAL_TRANSITIONS.get(request.status, set())
            if data.status not in allowed:
                raise ServiceValidationError(
                    f"Illegal transition: {request.status.value} -> "
                    f"{data.status.value}"
                )
            if data.status == WelfareRequestStatus.APPROVED:
                if request.risk_flags:
                    raise ServiceValidationError(
                        "Request has uncleared anti-fraud flags"
                    )
                if (
                    actor.role == UserRole.OFFICER
                    and request.amount_requested_kobo
                    > self._config.officer_approval_limit_kobo
                ):
                    raise ServiceValidationError(
                        "Requested amount exceeds the officer approval limit"
                    )

            before_state = _audit_state(request)
            request.status = data.status
            request.transition_reason_encrypted = self._cipher.encrypt(
                data.reason,
                context=TRANSITION_REASON_CONTEXT,
            )
            request.transitioned_by = actor.id
            request.transitioned_at = datetime.now(timezone.utc)
            if data.status in {
                WelfareRequestStatus.APPROVED,
                WelfareRequestStatus.REJECTED,
            }:
                request.decision_reason_encrypted = self._cipher.encrypt(
                    data.reason,
                    context=DECISION_REASON_CONTEXT,
                )
                request.decided_by = actor.id
                request.decided_at = datetime.now(timezone.utc)

            await self._session.flush()
            await self._audit.record(
                actor_id=actor.id,
                action="welfare_request.transitioned",
                entity_type="welfare_request",
                entity_id=request.id,
                before_state=before_state,
                after_state={
                    **_audit_state(request),
                    "transition_reason_recorded": True,
                },
            )
            await self._session.commit()
            await self._session.refresh(request)
            return request
        except Exception:
            await self._session.rollback()
            raise

    async def clear_risk_flags(
        self,
        *,
        actor: User,
        request_id: UUID,
        data: WelfareRiskReview,
    ) -> WelfareRequest:
        require_permission(actor, Permission.WELFARE_REQUEST_RISK_REVIEW)
        try:
            request, parish_id = await self._get_request_with_parish(request_id)
            require_parish_scope(actor, parish_id)
            if request.status not in {
                WelfareRequestStatus.PENDING,
                WelfareRequestStatus.VERIFIED,
            }:
                raise ServiceValidationError(
                    "Risk flags can only be reviewed before a final decision"
                )
            if not request.risk_flags:
                raise ServiceValidationError(
                    "Request has no anti-fraud flags to clear"
                )

            before_state = _audit_state(request)
            cleared_codes = [
                str(flag.get("code", "unknown")) for flag in request.risk_flags
            ]
            request.risk_flags = []
            request.risk_review_reason_encrypted = self._cipher.encrypt(
                data.reason,
                context=RISK_REVIEW_REASON_CONTEXT,
            )
            request.risk_reviewed_by = actor.id
            request.risk_reviewed_at = datetime.now(timezone.utc)

            await self._session.flush()
            await self._audit.record(
                actor_id=actor.id,
                action="welfare_request.risk_flags_cleared",
                entity_type="welfare_request",
                entity_id=request.id,
                before_state=before_state,
                after_state={
                    **_audit_state(request),
                    "cleared_flag_codes": cleared_codes,
                    "review_reason_recorded": True,
                },
            )
            await self._session.commit()
            await self._session.refresh(request)
            return request
        except Exception:
            await self._session.rollback()
            raise

    async def _get_beneficiary(self, beneficiary_id: UUID) -> Beneficiary:
        result = await self._session.execute(
            select(Beneficiary).where(
                Beneficiary.id == beneficiary_id,
                Beneficiary.deleted_at.is_(None),
            )
        )
        beneficiary = result.scalar_one_or_none()
        if beneficiary is None:
            raise ResourceNotFoundError("Beneficiary not found")
        return beneficiary

    async def _get_request_with_parish(
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
        )
        row = result.one_or_none()
        if row is None:
            raise ResourceNotFoundError("Welfare request not found")
        return row[0], row[1]

    async def _has_recent_paid_support(
        self,
        beneficiary_id: UUID,
        now: datetime,
    ) -> bool:
        cutoff = now - timedelta(
            days=self._config.anti_fraud_recent_support_days
        )
        result = await self._session.execute(
            select(func.count())
            .select_from(WelfareRequest)
            .where(
                WelfareRequest.beneficiary_id == beneficiary_id,
                WelfareRequest.status == WelfareRequestStatus.PAID,
                WelfareRequest.updated_at >= cutoff,
            )
        )
        return int(result.scalar_one()) > 0

    async def _has_duplicate_active_request(
        self,
        beneficiary_id: UUID,
        request_type: WelfareRequestType,
        now: datetime,
    ) -> bool:
        cutoff = now - timedelta(
            days=self._config.anti_fraud_duplicate_request_days
        )
        result = await self._session.execute(
            select(func.count())
            .select_from(WelfareRequest)
            .where(
                WelfareRequest.beneficiary_id == beneficiary_id,
                WelfareRequest.request_type == request_type,
                WelfareRequest.status.in_(ACTIVE_REQUEST_STATUSES),
                WelfareRequest.created_at >= cutoff,
            )
        )
        return int(result.scalar_one()) > 0

    def _build_risk_flags(
        self,
        *,
        amount_requested_kobo: int,
        received_recent_support: bool,
        has_duplicate_active_request: bool,
    ) -> list[dict[str, object]]:
        flags: list[dict[str, object]] = []
        if received_recent_support:
            flags.append(
                {
                    "code": "recent_support",
                    "severity": "high",
                    "evidence": {
                        "window_days": self._config.anti_fraud_recent_support_days
                    },
                }
            )
        if has_duplicate_active_request:
            flags.append(
                {
                    "code": "duplicate_active_request",
                    "severity": "high",
                    "evidence": {
                        "window_days": (
                            self._config.anti_fraud_duplicate_request_days
                        )
                    },
                }
            )
        if amount_requested_kobo >= self._config.anti_fraud_high_amount_kobo:
            flags.append(
                {
                    "code": "high_amount",
                    "severity": "medium",
                    "evidence": {
                        "threshold_kobo": (
                            self._config.anti_fraud_high_amount_kobo
                        )
                    },
                }
            )
        return flags


def _audit_state(request: WelfareRequest) -> dict[str, object]:
    return {
        "beneficiary_id": request.beneficiary_id,
        "request_type": request.request_type.value,
        "amount_requested_kobo": request.amount_requested_kobo,
        "status": request.status.value,
        "priority_score": request.priority_score,
        "priority_band": request.priority_band.value,
        "scoring_version": request.scoring_version,
        "risk_flag_codes": [
            str(flag.get("code", "unknown")) for flag in request.risk_flags
        ],
    }
