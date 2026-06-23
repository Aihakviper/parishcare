from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.beneficiary import Beneficiary
from app.models.enums import (
    PriorityBand,
    UserRole,
    VerificationChannel,
    VerificationOutcome,
    VerificationStatus,
    WelfareRequestStatus,
    WelfareRequestType,
)
from app.models.parish import Parish
from app.models.user import User
from app.models.verification import VerificationRequest, VerificationVoucher
from app.models.welfare_request import WelfareRequest
from app.services.errors import VoucherExpiredError, VoucherUsedError
from app.services.parish import CONTACT_PHONE_CONTEXT
from app.services.verification import VerificationService, _token_hash
from app.utils.crypto import PIICipher
from tests.settings import build_test_settings


class Result:
    def __init__(self, *, row=None, scalar=None, rows=None) -> None:
        self._row = row
        self._scalar = scalar
        self._rows = rows or []

    def one_or_none(self):
        return self._row

    def scalar_one_or_none(self):
        return self._scalar

    def all(self):
        return self._rows


def build_session() -> MagicMock:
    session = MagicMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.refresh = AsyncMock()
    return session


def build_actor(parish_id) -> User:
    return User(
        id=uuid4(),
        name_encrypted="encrypted-name",
        email_encrypted="encrypted-email",
        email_hash="a" * 64,
        password_hash="password-hash",
        role=UserRole.OFFICER,
        parish_id=parish_id,
        mfa_enabled=True,
        is_active=True,
    )


def build_workflow(status=VerificationStatus.UNVERIFIED):
    config = build_test_settings()
    cipher = PIICipher(config.pii_encryption_key)
    parish_id = uuid4()
    beneficiary = Beneficiary(
        id=uuid4(),
        name_encrypted="encrypted-name",
        name_normalised="amina ibrahim",
        phone_encrypted="encrypted-phone",
        phone_hash="b" * 64,
        home_parish_id=parish_id,
        dependents_count=2,
        verification_status=status,
    )
    request = WelfareRequest(
        id=uuid4(),
        beneficiary_id=beneficiary.id,
        created_by=uuid4(),
        request_type=WelfareRequestType.MEDICAL,
        amount_requested_kobo=200_000,
        reason_encrypted="encrypted-reason",
        is_urgent=True,
        status=WelfareRequestStatus.PENDING,
        priority_score=45,
        priority_band=PriorityBand.MEDIUM,
        scoring_version="v1",
        score_breakdown={
            "version": "v1",
            "factors": {
                "verification_strength": 0,
            },
            "raw_score": 45,
            "final_score": 45,
        },
        risk_flags=[],
    )
    parish = Parish(
        id=parish_id,
        name="St. Peter",
        region="Lagos",
        contact_name_encrypted="encrypted-contact",
        contact_phone_encrypted=cipher.encrypt(
            "+2348012345678",
            context=CONTACT_PHONE_CONTEXT,
        ),
        contact_phone_hash="c" * 64,
    )
    return config, request, beneficiary, parish


@pytest.mark.asyncio
async def test_verified_beneficiary_uses_registry_fast_path() -> None:
    config, request, beneficiary, parish = build_workflow(
        VerificationStatus.VERIFIED
    )
    session = build_session()
    session.execute.return_value = Result(
        row=(request, beneficiary, parish)
    )
    service = VerificationService(session, config=config)
    service._audit.record = AsyncMock()

    result = await service.start(
        actor=build_actor(parish.id),
        welfare_request_id=request.id,
    )

    assert result.mode == "already_verified"
    assert request.status == WelfareRequestStatus.VERIFIED
    assert result.raw_token is None
    service._audit.record.assert_awaited_once()
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_start_issues_single_use_mock_token_without_storing_raw() -> None:
    config, request, beneficiary, parish = build_workflow()
    session = build_session()
    session.execute.side_effect = [
        Result(row=(request, beneficiary, parish)),
        Result(rows=[]),
        Result(scalar=None),
    ]

    async def flush() -> None:
        added = session.add.call_args.args[0]
        if added.id is None:
            added.id = uuid4()

    session.flush.side_effect = flush
    service = VerificationService(session, config=config)
    service._audit.record = AsyncMock()

    result = await service.start(
        actor=build_actor(parish.id),
        welfare_request_id=request.id,
    )

    assert result.mode == "voucher_issued"
    assert result.raw_token
    assert result.voucher.channel == VerificationChannel.MOCK
    assert result.voucher.token_hash == _token_hash(result.raw_token)
    assert result.raw_token != result.voucher.token_hash
    assert beneficiary.verification_status == VerificationStatus.PENDING
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_start_delivers_whatsapp_token_without_returning_it() -> None:
    base_config, request, beneficiary, parish = build_workflow()
    config = build_test_settings(
        verification_delivery_channel="whatsapp",
        whatsapp_phone_number_id="123456789",
        whatsapp_access_token="access-token",
        whatsapp_webhook_verify_token="verify-token",
        whatsapp_app_secret="app-secret",
    )
    session = build_session()
    session.execute.side_effect = [
        Result(row=(request, beneficiary, parish)),
        Result(rows=[]),
        Result(scalar=None),
    ]

    async def flush() -> None:
        added = session.add.call_args.args[0]
        if added.id is None:
            added.id = uuid4()

    session.flush.side_effect = flush
    whatsapp = MagicMock()
    whatsapp.send_verification_voucher = AsyncMock(
        return_value="wamid.presentation"
    )
    service = VerificationService(
        session,
        config=config,
        whatsapp=whatsapp,
    )
    service._audit.record = AsyncMock()

    result = await service.start(
        actor=build_actor(parish.id),
        welfare_request_id=request.id,
    )

    assert result.voucher.channel == VerificationChannel.WHATSAPP
    assert result.raw_token is None
    whatsapp.send_verification_voucher.assert_awaited_once()
    kwargs = whatsapp.send_verification_voucher.await_args.kwargs
    assert kwargs["recipient_phone"] == "+2348012345678"
    assert kwargs["token"]
    audit_state = service._audit.record.await_args.kwargs["after_state"]
    assert audit_state["delivery_message_id"] == "wamid.presentation"


@pytest.mark.asyncio
async def test_confirm_burns_token_and_verifies_request_and_beneficiary() -> None:
    config, request, beneficiary, parish = build_workflow()
    service = VerificationService(build_session(), config=config)
    now = datetime.now(timezone.utc)
    verification_request = VerificationRequest(
        id=uuid4(),
        welfare_request_id=request.id,
        sent_to_phone_encrypted="encrypted-phone",
        sent_to_parish_id=parish.id,
    )
    token = service._create_voucher_token(
        verification_request_id=verification_request.id,
        parish_id=parish.id,
        expires_at=now + timedelta(hours=1),
        now=now,
    )
    voucher = VerificationVoucher(
        id=uuid4(),
        verification_request_id=verification_request.id,
        token_hash=_token_hash(token),
        channel=VerificationChannel.MOCK,
        issued_at=now,
        expires_at=now + timedelta(hours=1),
    )
    session = service._session
    session.execute.return_value = Result(
        row=(voucher, verification_request, request, beneficiary)
    )
    service._audit.record = AsyncMock()

    result = await service.respond(
        token=token,
        outcome=VerificationOutcome.CONFIRMED,
    )

    assert voucher.used_at is not None
    assert result.verification_request.outcome == VerificationOutcome.CONFIRMED
    assert beneficiary.verification_status == VerificationStatus.VERIFIED
    assert request.status == WelfareRequestStatus.VERIFIED
    assert request.priority_score == 65
    assert request.score_breakdown["factors"]["verification_strength"] == 20
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_reused_voucher_is_rejected_and_audited() -> None:
    config, request, beneficiary, parish = build_workflow()
    service = VerificationService(build_session(), config=config)
    now = datetime.now(timezone.utc)
    verification_request = VerificationRequest(
        id=uuid4(),
        welfare_request_id=request.id,
        sent_to_phone_encrypted="encrypted-phone",
        sent_to_parish_id=parish.id,
    )
    token = service._create_voucher_token(
        verification_request_id=verification_request.id,
        parish_id=parish.id,
        expires_at=now + timedelta(hours=1),
        now=now,
    )
    voucher = VerificationVoucher(
        id=uuid4(),
        verification_request_id=verification_request.id,
        token_hash=_token_hash(token),
        channel=VerificationChannel.MOCK,
        issued_at=now,
        expires_at=now + timedelta(hours=1),
        used_at=now,
    )
    service._session.execute.return_value = Result(
        row=(voucher, verification_request, request, beneficiary)
    )
    service._audit.record = AsyncMock()

    with pytest.raises(VoucherUsedError):
        await service.respond(
            token=token,
            outcome=VerificationOutcome.CONFIRMED,
        )

    service._audit.record.assert_awaited_once()
    service._session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_expired_voucher_is_burned_and_audited() -> None:
    config, request, beneficiary, parish = build_workflow()
    service = VerificationService(build_session(), config=config)
    now = datetime.now(timezone.utc)
    verification_request = VerificationRequest(
        id=uuid4(),
        welfare_request_id=request.id,
        sent_to_phone_encrypted="encrypted-phone",
        sent_to_parish_id=parish.id,
    )
    token = service._create_voucher_token(
        verification_request_id=verification_request.id,
        parish_id=parish.id,
        expires_at=now - timedelta(minutes=1),
        now=now - timedelta(hours=1),
    )
    voucher = VerificationVoucher(
        id=uuid4(),
        verification_request_id=verification_request.id,
        token_hash=_token_hash(token),
        channel=VerificationChannel.MOCK,
        issued_at=now - timedelta(hours=1),
        expires_at=now - timedelta(minutes=1),
    )
    service._session.execute.return_value = Result(
        row=(voucher, verification_request, request, beneficiary)
    )
    service._audit.record = AsyncMock()

    with pytest.raises(VoucherExpiredError):
        await service.respond(
            token=token,
            outcome=VerificationOutcome.REJECTED,
        )

    assert voucher.used_at is not None
    assert verification_request.outcome == VerificationOutcome.EXPIRED
    service._audit.record.assert_awaited_once()
    service._session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_rejection_burns_token_and_leaves_request_pending() -> None:
    config, request, beneficiary, parish = build_workflow()
    service = VerificationService(build_session(), config=config)
    now = datetime.now(timezone.utc)
    verification_request = VerificationRequest(
        id=uuid4(),
        welfare_request_id=request.id,
        sent_to_phone_encrypted="encrypted-phone",
        sent_to_parish_id=parish.id,
    )
    token = service._create_voucher_token(
        verification_request_id=verification_request.id,
        parish_id=parish.id,
        expires_at=now + timedelta(hours=1),
        now=now,
    )
    voucher = VerificationVoucher(
        id=uuid4(),
        verification_request_id=verification_request.id,
        token_hash=_token_hash(token),
        channel=VerificationChannel.MOCK,
        issued_at=now,
        expires_at=now + timedelta(hours=1),
    )
    service._session.execute.return_value = Result(
        row=(voucher, verification_request, request, beneficiary)
    )
    service._audit.record = AsyncMock()

    result = await service.respond(
        token=token,
        outcome=VerificationOutcome.REJECTED,
    )

    assert voucher.used_at is not None
    assert result.verification_request.outcome == VerificationOutcome.REJECTED
    assert beneficiary.verification_status == VerificationStatus.UNVERIFIED
    assert request.status == WelfareRequestStatus.PENDING
