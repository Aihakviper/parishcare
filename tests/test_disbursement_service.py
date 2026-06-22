from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.disbursement import Disbursement
from app.models.enums import (
    PaymentMethod,
    PriorityBand,
    SettlementStatus,
    UserRole,
    WelfareRequestStatus,
    WelfareRequestType,
)
from app.models.user import User
from app.models.welfare_request import WelfareRequest
from app.schemas.disbursement import DisbursementCreate
from app.services.disbursement import (
    DisbursementService,
    _request_fingerprint,
)
from app.services.errors import ResourceConflictError, ServiceValidationError
from tests.settings import build_test_settings


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


def build_actor(parish_id, *, user_id=None) -> User:
    return User(
        id=user_id or uuid4(),
        name_encrypted="encrypted-name",
        email_encrypted="encrypted-email",
        email_hash="a" * 64,
        password_hash="password-hash",
        role=UserRole.OFFICER,
        parish_id=parish_id,
        mfa_enabled=True,
        is_active=True,
    )


def build_request(
    approver_id,
    *,
    amount=800_000,
    status=WelfareRequestStatus.APPROVED,
    risk_flags=None,
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
        status=status,
        priority_score=80,
        priority_band=PriorityBand.HIGH,
        scoring_version="v1",
        score_breakdown={"version": "v1"},
        risk_flags=risk_flags or [],
        decided_by=approver_id,
        decided_at=now,
        created_at=now,
        updated_at=now,
    )


def build_disbursement(
    data: DisbursementCreate,
    key,
    *,
    parish_id,
) -> tuple[Disbursement, object]:
    now = datetime.now(timezone.utc)
    disbursement = Disbursement(
        id=uuid4(),
        welfare_request_id=data.welfare_request_id,
        amount_kobo=data.amount_kobo,
        payment_method=PaymentMethod.MOCK,
        approved_by=uuid4(),
        paid_by=uuid4(),
        idempotency_key=key,
        request_fingerprint=_request_fingerprint(data),
        rail_reference=f"mock-{uuid4().hex}",
        settlement_status=SettlementStatus.SETTLED,
        paid_at=now,
        receipt_url="https://mock.invalid/receipt",
        created_at=now,
        updated_at=now,
    )
    return disbursement, parish_id


@pytest.mark.asyncio
async def test_execute_mock_disbursement_is_audited_and_marks_paid() -> None:
    parish_id = uuid4()
    approver_id = uuid4()
    payer = build_actor(parish_id)
    request = build_request(approver_id)
    data = DisbursementCreate(
        welfare_request_id=request.id,
        amount_kobo=request.amount_requested_kobo,
        notes="Paid after final treasury review",
    )
    session = build_session()
    session.execute.side_effect = [
        RowResult(None),
        RowResult((request, parish_id)),
        RowResult(None),
    ]
    now = datetime.now(timezone.utc)

    async def flush() -> None:
        disbursement = session.add.call_args.args[0]
        disbursement.created_at = now
        disbursement.updated_at = now

    session.flush.side_effect = flush
    service = DisbursementService(session, config=build_test_settings())
    service._audit.record = AsyncMock()

    result = await service.execute(
        actor=payer,
        data=data,
        idempotency_key=uuid4(),
    )

    assert result.idempotent_replay is False
    assert result.disbursement.amount_kobo == 800_000
    assert result.disbursement.payment_method == PaymentMethod.MOCK
    assert result.disbursement.settlement_status == SettlementStatus.SETTLED
    assert result.disbursement.approved_by == approver_id
    assert result.disbursement.paid_by == payer.id
    assert result.disbursement.notes_encrypted != data.notes
    assert request.status == WelfareRequestStatus.PAID
    service._audit.record.assert_awaited_once()
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_exact_idempotent_retry_returns_original_without_mutation() -> None:
    parish_id = uuid4()
    key = uuid4()
    data = DisbursementCreate(
        welfare_request_id=uuid4(),
        amount_kobo=200_000,
        notes=None,
    )
    disbursement, _ = build_disbursement(data, key, parish_id=parish_id)
    session = build_session()
    session.execute.return_value = RowResult((disbursement, parish_id))
    service = DisbursementService(session, config=build_test_settings())
    service._audit.record = AsyncMock()

    result = await service.execute(
        actor=build_actor(parish_id),
        data=data,
        idempotency_key=key,
    )

    assert result.idempotent_replay is True
    assert result.disbursement is disbursement
    service._audit.record.assert_not_awaited()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_reused_key_with_changed_parameters_conflicts() -> None:
    parish_id = uuid4()
    key = uuid4()
    original_data = DisbursementCreate(
        welfare_request_id=uuid4(),
        amount_kobo=200_000,
    )
    disbursement, _ = build_disbursement(
        original_data,
        key,
        parish_id=parish_id,
    )
    session = build_session()
    session.execute.return_value = RowResult((disbursement, parish_id))
    service = DisbursementService(session, config=build_test_settings())

    with pytest.raises(ResourceConflictError, match="different parameters"):
        await service.execute(
            actor=build_actor(parish_id),
            data=DisbursementCreate(
                welfare_request_id=original_data.welfare_request_id,
                amount_kobo=300_000,
            ),
            idempotency_key=key,
        )

    session.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_maker_checker_blocks_same_user_above_threshold() -> None:
    parish_id = uuid4()
    maker_id = uuid4()
    request = build_request(maker_id, amount=800_000)
    data = DisbursementCreate(
        welfare_request_id=request.id,
        amount_kobo=800_000,
    )
    session = build_session()
    session.execute.side_effect = [
        RowResult(None),
        RowResult((request, parish_id)),
        RowResult(None),
    ]
    service = DisbursementService(session, config=build_test_settings())

    with pytest.raises(ServiceValidationError, match="Maker-checker"):
        await service.execute(
            actor=build_actor(parish_id, user_id=maker_id),
            data=data,
            idempotency_key=uuid4(),
        )


@pytest.mark.asyncio
async def test_same_user_allowed_at_threshold_not_above_it() -> None:
    parish_id = uuid4()
    maker_id = uuid4()
    request = build_request(maker_id, amount=500_000)
    data = DisbursementCreate(
        welfare_request_id=request.id,
        amount_kobo=500_000,
    )
    session = build_session()
    session.execute.side_effect = [
        RowResult(None),
        RowResult((request, parish_id)),
        RowResult(None),
    ]
    now = datetime.now(timezone.utc)

    async def flush() -> None:
        disbursement = session.add.call_args.args[0]
        disbursement.created_at = now
        disbursement.updated_at = now

    session.flush.side_effect = flush
    service = DisbursementService(session, config=build_test_settings())
    service._audit.record = AsyncMock()

    result = await service.execute(
        actor=build_actor(parish_id, user_id=maker_id),
        data=data,
        idempotency_key=uuid4(),
    )

    assert result.disbursement.paid_by == maker_id


@pytest.mark.asyncio
async def test_amount_must_match_approved_request() -> None:
    parish_id = uuid4()
    request = build_request(uuid4(), amount=800_000)
    session = build_session()
    session.execute.side_effect = [
        RowResult(None),
        RowResult((request, parish_id)),
        RowResult(None),
    ]
    service = DisbursementService(session, config=build_test_settings())

    with pytest.raises(ServiceValidationError, match="must equal"):
        await service.execute(
            actor=build_actor(parish_id),
            data=DisbursementCreate(
                welfare_request_id=request.id,
                amount_kobo=700_000,
            ),
            idempotency_key=uuid4(),
        )
