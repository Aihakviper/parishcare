from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.beneficiary import Beneficiary
from app.models.enums import (
    PriorityBand,
    UserRole,
    VerificationStatus,
    WelfareRequestStatus,
    WelfareRequestType,
)
from app.models.user import User
from app.models.welfare_request import WelfareRequest
from app.schemas.welfare_request import (
    WelfareRequestCreate,
    WelfareRequestTransition,
    WelfareRiskReview,
)
from app.services.errors import ServiceValidationError
from app.services.welfare_request import WelfareRequestService
from tests.settings import build_test_settings


class ScalarResult:
    def __init__(self, value) -> None:
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def scalar_one(self):
        return self._value


class RowResult:
    def __init__(self, row) -> None:
        self._row = row

    def one_or_none(self):
        return self._row


def build_session() -> MagicMock:
    session = MagicMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.refresh = AsyncMock()
    return session


def build_actor(role: UserRole, parish_id) -> User:
    return User(
        id=uuid4(),
        name_encrypted="encrypted-name",
        email_encrypted="encrypted-email",
        email_hash="a" * 64,
        password_hash="password-hash",
        role=role,
        parish_id=parish_id,
        mfa_enabled=True,
        is_active=True,
    )


def build_beneficiary(parish_id) -> Beneficiary:
    return Beneficiary(
        id=uuid4(),
        name_encrypted="encrypted-name",
        name_normalised="amina ibrahim",
        phone_encrypted="encrypted-phone",
        phone_hash="b" * 64,
        home_parish_id=parish_id,
        dependents_count=4,
        verification_status=VerificationStatus.VERIFIED,
    )


def build_request(
    parish_id,
    *,
    status=WelfareRequestStatus.PENDING,
    risk_flags=None,
    amount=200_000,
) -> WelfareRequest:
    now = datetime.now(timezone.utc)
    return WelfareRequest(
        id=uuid4(),
        beneficiary_id=uuid4(),
        created_by=uuid4(),
        request_type=WelfareRequestType.MEDICAL,
        amount_requested_kobo=amount,
        reason_encrypted="encrypted-reason",
        is_urgent=True,
        deadline_at=now + timedelta(hours=4),
        status=status,
        priority_score=85,
        priority_band=PriorityBand.HIGH,
        scoring_version="v1",
        score_breakdown={"version": "v1"},
        risk_flags=risk_flags or [],
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
async def test_create_scores_flags_encrypts_and_audits() -> None:
    parish_id = uuid4()
    beneficiary = build_beneficiary(parish_id)
    session = build_session()
    session.execute.side_effect = [
        ScalarResult(beneficiary),
        ScalarResult(1),
        ScalarResult(1),
    ]
    now = datetime.now(timezone.utc)

    async def flush() -> None:
        request = session.add.call_args.args[0]
        request.id = request.id or uuid4()
        request.created_at = now
        request.updated_at = now

    session.flush.side_effect = flush
    service = WelfareRequestService(session, config=build_test_settings())
    service._audit.record = AsyncMock()
    data = WelfareRequestCreate(
        beneficiary_id=beneficiary.id,
        request_type=WelfareRequestType.MEDICAL,
        amount_requested_kobo=1_500_000,
        reason="Urgent surgery and hospital treatment required",
        is_urgent=True,
        deadline_at=now + timedelta(hours=6),
    )

    request = await service.create(
        actor=build_actor(UserRole.OFFICER, parish_id),
        data=data,
    )

    assert request.reason_encrypted != data.reason
    assert request.priority_score == 60
    assert request.priority_band == PriorityBand.MEDIUM
    assert {flag["code"] for flag in request.risk_flags} == {
        "recent_support",
        "duplicate_active_request",
        "high_amount",
    }
    assert request.amount_requested_kobo == 1_500_000
    service._audit.record.assert_awaited_once()
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_creation_rejects_amount_above_configured_maximum() -> None:
    parish_id = uuid4()
    service = WelfareRequestService(
        build_session(),
        config=build_test_settings(welfare_request_max_amount_kobo=100_000),
    )

    with pytest.raises(ServiceValidationError, match="maximum"):
        await service.create(
            actor=build_actor(UserRole.OFFICER, parish_id),
            data=WelfareRequestCreate(
                beneficiary_id=uuid4(),
                request_type=WelfareRequestType.FOOD,
                amount_requested_kobo=100_001,
                reason="Emergency household food support required",
                is_urgent=False,
            ),
        )


@pytest.mark.asyncio
async def test_approval_is_blocked_by_uncleared_flags() -> None:
    parish_id = uuid4()
    request = build_request(
        parish_id,
        status=WelfareRequestStatus.VERIFIED,
        risk_flags=[{"code": "recent_support"}],
    )
    session = build_session()
    session.execute.return_value = RowResult((request, parish_id))
    service = WelfareRequestService(session, config=build_test_settings())

    with pytest.raises(ServiceValidationError, match="uncleared"):
        await service.transition(
            actor=build_actor(UserRole.PASTOR, parish_id),
            request_id=request.id,
            data=WelfareRequestTransition(
                status=WelfareRequestStatus.APPROVED,
                reason="Reviewed and approved after verification",
            ),
        )

    session.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_officer_cannot_approve_above_limit() -> None:
    parish_id = uuid4()
    request = build_request(
        parish_id,
        status=WelfareRequestStatus.VERIFIED,
        amount=600_000,
    )
    session = build_session()
    session.execute.return_value = RowResult((request, parish_id))
    service = WelfareRequestService(session, config=build_test_settings())

    with pytest.raises(ServiceValidationError, match="officer approval limit"):
        await service.transition(
            actor=build_actor(UserRole.OFFICER, parish_id),
            request_id=request.id,
            data=WelfareRequestTransition(
                status=WelfareRequestStatus.APPROVED,
                reason="Approval attempted above assigned limit",
            ),
        )


@pytest.mark.asyncio
async def test_manual_paid_transition_is_illegal() -> None:
    parish_id = uuid4()
    request = build_request(
        parish_id,
        status=WelfareRequestStatus.APPROVED,
    )
    session = build_session()
    session.execute.return_value = RowResult((request, parish_id))
    service = WelfareRequestService(session, config=build_test_settings())

    with pytest.raises(ServiceValidationError, match="Illegal transition"):
        await service.transition(
            actor=build_actor(UserRole.PASTOR, parish_id),
            request_id=request.id,
            data=WelfareRequestTransition(
                status=WelfareRequestStatus.PAID,
                reason="Attempting manual payment status",
            ),
        )


@pytest.mark.asyncio
async def test_pastor_clears_flags_with_encrypted_review_and_audit() -> None:
    parish_id = uuid4()
    request = build_request(
        parish_id,
        risk_flags=[{"code": "high_amount"}],
    )
    session = build_session()
    session.execute.return_value = RowResult((request, parish_id))
    service = WelfareRequestService(session, config=build_test_settings())
    service._audit.record = AsyncMock()

    reviewed = await service.clear_risk_flags(
        actor=build_actor(UserRole.PASTOR, parish_id),
        request_id=request.id,
        data=WelfareRiskReview(
            reason="Supporting documents reviewed with the parish committee"
        ),
    )

    assert reviewed.risk_flags == []
    assert reviewed.risk_review_reason_encrypted is not None
    service._audit.record.assert_awaited_once()
    session.commit.assert_awaited_once()
