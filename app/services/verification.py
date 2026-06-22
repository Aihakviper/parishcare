import hashlib
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import jwt
from jwt import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, settings
from app.core.rbac import Permission, require_parish_scope, require_permission
from app.models.beneficiary import Beneficiary
from app.models.enums import (
    PriorityBand,
    VerificationChannel,
    VerificationOutcome,
    VerificationStatus,
    WelfareRequestStatus,
)
from app.models.parish import Parish
from app.models.user import User
from app.models.verification import VerificationRequest, VerificationVoucher
from app.models.welfare_request import WelfareRequest
from app.services.audit import AuditService
from app.services.errors import (
    ResourceConflictError,
    ResourceNotFoundError,
    ServiceValidationError,
    VoucherExpiredError,
    VoucherInvalidError,
    VoucherUsedError,
)
from app.services.parish import CONTACT_PHONE_CONTEXT
from app.utils.crypto import PIICipher

VERIFICATION_PHONE_CONTEXT = "verification_requests.sent_to_phone"
VOUCHER_TOKEN_TYPE = "verification_voucher"


@dataclass(frozen=True)
class VerificationStartResult:
    mode: str
    welfare_request: WelfareRequest
    beneficiary: Beneficiary
    verification_request: VerificationRequest | None = None
    voucher: VerificationVoucher | None = None
    raw_token: str | None = None


@dataclass(frozen=True)
class VerificationResponseResult:
    verification_request: VerificationRequest
    welfare_request: WelfareRequest
    beneficiary: Beneficiary


class VerificationService:
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

    async def start(
        self,
        *,
        actor: User,
        welfare_request_id: UUID,
    ) -> VerificationStartResult:
        require_permission(actor, Permission.VERIFICATION_START)
        try:
            request, beneficiary, parish = await self._load_workflow(
                welfare_request_id
            )
            require_parish_scope(actor, beneficiary.home_parish_id)
            if request.status != WelfareRequestStatus.PENDING:
                raise ServiceValidationError(
                    "Only pending welfare requests can start verification"
                )

            if beneficiary.verification_status == VerificationStatus.VERIFIED:
                request.status = WelfareRequestStatus.VERIFIED
                request.transitioned_by = actor.id
                request.transitioned_at = datetime.now(timezone.utc)
                await self._session.flush()
                await self._audit.record(
                    actor_id=actor.id,
                    action="verification.completed_from_registry",
                    entity_type="welfare_request",
                    entity_id=request.id,
                    after_state={
                        "status": request.status.value,
                        "beneficiary_verification_status": (
                            beneficiary.verification_status.value
                        ),
                    },
                )
                await self._session.commit()
                await self._session.refresh(request)
                return VerificationStartResult(
                    mode="already_verified",
                    welfare_request=request,
                    beneficiary=beneficiary,
                )

            now = datetime.now(timezone.utc)
            await self._expire_stale_vouchers(request.id, now)
            if await self._has_active_voucher(request.id, now):
                raise ResourceConflictError(
                    "An active verification voucher already exists"
                )

            expires_at = now + timedelta(
                hours=self._config.verification_voucher_expire_hours
            )
            verification_request = VerificationRequest(
                welfare_request_id=request.id,
                sent_to_phone_encrypted=self._cipher.encrypt(
                    self._cipher.decrypt(
                        parish.contact_phone_encrypted,
                        context=CONTACT_PHONE_CONTEXT,
                    ),
                    context=VERIFICATION_PHONE_CONTEXT,
                ),
                sent_to_parish_id=parish.id,
            )
            self._session.add(verification_request)
            await self._session.flush()

            raw_token = self._create_voucher_token(
                verification_request_id=verification_request.id,
                parish_id=parish.id,
                expires_at=expires_at,
                now=now,
            )
            voucher = VerificationVoucher(
                verification_request_id=verification_request.id,
                token_hash=_token_hash(raw_token),
                channel=VerificationChannel(
                    self._config.verification_delivery_channel
                ),
                issued_at=now,
                expires_at=expires_at,
            )
            beneficiary.verification_status = VerificationStatus.PENDING
            self._session.add(voucher)
            await self._session.flush()
            await self._audit.record(
                actor_id=actor.id,
                action="verification.voucher_issued",
                entity_type="verification_request",
                entity_id=verification_request.id,
                after_state={
                    "welfare_request_id": request.id,
                    "beneficiary_id": beneficiary.id,
                    "sent_to_parish_id": parish.id,
                    "channel": voucher.channel.value,
                    "expires_at": expires_at,
                },
            )
            await self._session.commit()
            await self._session.refresh(verification_request)
            await self._session.refresh(voucher)
            return VerificationStartResult(
                mode="voucher_issued",
                welfare_request=request,
                beneficiary=beneficiary,
                verification_request=verification_request,
                voucher=voucher,
                raw_token=(
                    raw_token
                    if voucher.channel == VerificationChannel.MOCK
                    else None
                ),
            )
        except Exception:
            await self._session.rollback()
            raise

    async def respond(
        self,
        *,
        token: str,
        outcome: VerificationOutcome,
    ) -> VerificationResponseResult:
        if outcome not in {
            VerificationOutcome.CONFIRMED,
            VerificationOutcome.REJECTED,
        }:
            raise VoucherInvalidError("Invalid verification outcome")
        claims = self._decode_voucher_token(token)
        now = datetime.now(timezone.utc)
        try:
            voucher, verification_request, request, beneficiary = (
                await self._load_voucher_workflow(_token_hash(token))
            )
        except Exception:
            await self._session.rollback()
            raise
        if (
            str(verification_request.id) != claims["verification_request_id"]
            or str(verification_request.sent_to_parish_id) != claims["parish_id"]
        ):
            await self._session.rollback()
            raise VoucherInvalidError("Voucher claims do not match the record")
        if request.status != WelfareRequestStatus.PENDING:
            await self._audit_rejected_response(
                verification_request,
                "welfare_request_not_pending",
            )
            await self._session.commit()
            raise ServiceValidationError(
                "Welfare request is no longer pending verification"
            )

        if voucher.used_at is not None:
            await self._audit_rejected_response(
                verification_request,
                "already_used",
            )
            await self._session.commit()
            raise VoucherUsedError("Verification voucher has already been used")
        if voucher.expires_at <= now:
            voucher.used_at = now
            verification_request.outcome = VerificationOutcome.EXPIRED
            verification_request.responded_at = now
            await self._audit.record(
                actor_id=None,
                action="verification.voucher_expired",
                entity_type="verification_request",
                entity_id=verification_request.id,
                after_state={
                    "welfare_request_id": request.id,
                    "outcome": VerificationOutcome.EXPIRED.value,
                },
            )
            await self._session.commit()
            raise VoucherExpiredError("Verification voucher has expired")

        try:
            voucher.used_at = now
            verification_request.outcome = outcome
            verification_request.responded_at = now
            if outcome == VerificationOutcome.CONFIRMED:
                beneficiary.verification_status = VerificationStatus.VERIFIED
                request.status = WelfareRequestStatus.VERIFIED
                _apply_verification_score(request, self._config)
            else:
                beneficiary.verification_status = VerificationStatus.UNVERIFIED

            await self._session.flush()
            await self._audit.record(
                actor_id=None,
                action="verification.voucher_responded",
                entity_type="verification_request",
                entity_id=verification_request.id,
                after_state={
                    "welfare_request_id": request.id,
                    "beneficiary_id": beneficiary.id,
                    "outcome": outcome.value,
                    "welfare_request_status": request.status.value,
                    "beneficiary_verification_status": (
                        beneficiary.verification_status.value
                    ),
                },
            )
            await self._session.commit()
            return VerificationResponseResult(
                verification_request=verification_request,
                welfare_request=request,
                beneficiary=beneficiary,
            )
        except Exception:
            await self._session.rollback()
            raise

    async def _load_workflow(
        self,
        welfare_request_id: UUID,
    ) -> tuple[WelfareRequest, Beneficiary, Parish]:
        result = await self._session.execute(
            select(WelfareRequest, Beneficiary, Parish)
            .join(
                Beneficiary,
                Beneficiary.id == WelfareRequest.beneficiary_id,
            )
            .join(Parish, Parish.id == Beneficiary.home_parish_id)
            .where(
                WelfareRequest.id == welfare_request_id,
                Beneficiary.deleted_at.is_(None),
                Parish.deleted_at.is_(None),
            )
            .with_for_update(of=WelfareRequest)
        )
        row = result.one_or_none()
        if row is None:
            raise ResourceNotFoundError("Welfare request not found")
        return row[0], row[1], row[2]

    async def _load_voucher_workflow(
        self,
        token_hash: str,
    ) -> tuple[
        VerificationVoucher,
        VerificationRequest,
        WelfareRequest,
        Beneficiary,
    ]:
        result = await self._session.execute(
            select(
                VerificationVoucher,
                VerificationRequest,
                WelfareRequest,
                Beneficiary,
            )
            .join(
                VerificationRequest,
                VerificationRequest.id
                == VerificationVoucher.verification_request_id,
            )
            .join(
                WelfareRequest,
                WelfareRequest.id
                == VerificationRequest.welfare_request_id,
            )
            .join(
                Beneficiary,
                Beneficiary.id == WelfareRequest.beneficiary_id,
            )
            .where(VerificationVoucher.token_hash == token_hash)
            .with_for_update(of=VerificationVoucher)
        )
        row = result.one_or_none()
        if row is None:
            raise VoucherInvalidError("Verification voucher is invalid")
        return row[0], row[1], row[2], row[3]

    async def _has_active_voucher(
        self,
        welfare_request_id: UUID,
        now: datetime,
    ) -> bool:
        result = await self._session.execute(
            select(VerificationVoucher.id)
            .join(
                VerificationRequest,
                VerificationRequest.id
                == VerificationVoucher.verification_request_id,
            )
            .where(
                VerificationRequest.welfare_request_id == welfare_request_id,
                VerificationRequest.outcome.is_(None),
                VerificationVoucher.used_at.is_(None),
                VerificationVoucher.expires_at > now,
            )
            .limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def _expire_stale_vouchers(
        self,
        welfare_request_id: UUID,
        now: datetime,
    ) -> None:
        result = await self._session.execute(
            select(VerificationRequest, VerificationVoucher)
            .join(
                VerificationVoucher,
                VerificationVoucher.verification_request_id
                == VerificationRequest.id,
            )
            .where(
                VerificationRequest.welfare_request_id == welfare_request_id,
                VerificationRequest.outcome.is_(None),
                VerificationVoucher.used_at.is_(None),
                VerificationVoucher.expires_at <= now,
            )
        )
        for verification_request, voucher in result.all():
            verification_request.outcome = VerificationOutcome.EXPIRED
            verification_request.responded_at = now
            voucher.used_at = now
            await self._audit.record(
                actor_id=None,
                action="verification.stale_voucher_expired",
                entity_type="verification_request",
                entity_id=verification_request.id,
                after_state={
                    "welfare_request_id": welfare_request_id,
                    "outcome": VerificationOutcome.EXPIRED.value,
                },
            )

    async def _audit_rejected_response(
        self,
        verification_request: VerificationRequest,
        reason: str,
    ) -> None:
        await self._audit.record(
            actor_id=None,
            action="verification.voucher_response_rejected",
            entity_type="verification_request",
            entity_id=verification_request.id,
            after_state={"reason": reason},
        )

    def _create_voucher_token(
        self,
        *,
        verification_request_id: UUID,
        parish_id: UUID,
        expires_at: datetime,
        now: datetime,
    ) -> str:
        return jwt.encode(
            {
                "type": VOUCHER_TOKEN_TYPE,
                "verification_request_id": str(verification_request_id),
                "parish_id": str(parish_id),
                "jti": str(uuid4()),
                "iat": now,
                "exp": expires_at,
                "iss": self._config.verification_voucher_issuer,
                "aud": self._config.verification_voucher_audience,
            },
            self._config.jwt_secret_key,
            algorithm=self._config.jwt_algorithm,
        )

    def _decode_voucher_token(self, token: str) -> dict[str, str]:
        try:
            payload = jwt.decode(
                token,
                self._config.jwt_secret_key,
                algorithms=[self._config.jwt_algorithm],
                issuer=self._config.verification_voucher_issuer,
                audience=self._config.verification_voucher_audience,
                options={
                    "require": [
                        "type",
                        "verification_request_id",
                        "parish_id",
                        "jti",
                        "iat",
                        "exp",
                        "iss",
                        "aud",
                    ],
                    "verify_exp": False,
                },
            )
        except InvalidTokenError as exc:
            raise VoucherInvalidError(
                "Verification voucher is invalid or expired"
            ) from exc
        if payload.get("type") != VOUCHER_TOKEN_TYPE:
            raise VoucherInvalidError("Verification voucher has wrong type")
        try:
            UUID(str(payload["verification_request_id"]))
            UUID(str(payload["parish_id"]))
            UUID(str(payload["jti"]))
        except (KeyError, ValueError) as exc:
            raise VoucherInvalidError(
                "Verification voucher claims are invalid"
            ) from exc
        return {
            "verification_request_id": str(payload["verification_request_id"]),
            "parish_id": str(payload["parish_id"]),
        }


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _apply_verification_score(
    request: WelfareRequest,
    config: Settings,
) -> None:
    breakdown = deepcopy(request.score_breakdown)
    factors = dict(breakdown.get("factors", {}))
    previous = int(factors.get("verification_strength", 0))
    factors["verification_strength"] = config.scoring_verification_points
    raw_score = int(breakdown.get("raw_score", request.priority_score))
    raw_score += config.scoring_verification_points - previous
    final_score = max(0, min(100, raw_score))
    breakdown["factors"] = factors
    breakdown["raw_score"] = raw_score
    breakdown["final_score"] = final_score
    request.score_breakdown = breakdown
    request.priority_score = final_score
    if final_score >= config.scoring_high_threshold:
        request.priority_band = PriorityBand.HIGH
    elif final_score >= config.scoring_medium_threshold:
        request.priority_band = PriorityBand.MEDIUM
    else:
        request.priority_band = PriorityBand.LOW
