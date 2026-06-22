from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import AuthorizationError
from app.models.beneficiary import Beneficiary
from app.models.enums import UserRole, VerificationStatus
from app.models.user import User
from app.schemas.beneficiary import BeneficiaryCreate
from app.services.beneficiary import BeneficiaryService
from app.services.errors import ResourceConflictError
from app.utils.crypto import normalize_person_name
from tests.settings import build_test_settings


class QueryResult:
    def __init__(self, scalar=None, scalar_values=None) -> None:
        self._scalar = scalar
        self._scalar_values = scalar_values or []

    def scalar_one_or_none(self):
        return self._scalar

    def scalars(self):
        return iter(self._scalar_values)


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
    now = datetime.now(timezone.utc)
    return Beneficiary(
        id=uuid4(),
        name_encrypted="encrypted-name",
        name_normalised="amina ibrahim",
        phone_encrypted="encrypted-phone",
        phone_hash="b" * 64,
        home_parish_id=parish_id,
        dependents_count=2,
        verification_status=VerificationStatus.VERIFIED,
        created_at=now,
        updated_at=now,
    )


def test_name_normalization_handles_diacritics_and_spacing() -> None:
    assert normalize_person_name("  Ámína   Ibráhîm ") == "amina ibrahim"
    assert normalize_person_name("Ibrahim Amina") == "amina ibrahim"


@pytest.mark.asyncio
async def test_registration_encrypts_pii_warns_and_audits() -> None:
    parish_id = uuid4()
    session = build_session()
    session.execute.side_effect = [
        QueryResult(scalar=parish_id),
        QueryResult(scalar=None),
        QueryResult(scalar=None),
        QueryResult(
            scalar_values=["amina ibrahim", "amina ibraheem", "john doe"]
        ),
    ]
    now = datetime.now(timezone.utc)

    async def flush() -> None:
        beneficiary = session.add.call_args.args[0]
        beneficiary.id = beneficiary.id or uuid4()
        beneficiary.created_at = now
        beneficiary.updated_at = now

    session.flush.side_effect = flush
    service = BeneficiaryService(session, config=build_test_settings())
    service._audit.record = AsyncMock()
    data = BeneficiaryCreate(
        name="Amina Ibrahim",
        phone="+234 801-234-5678",
        home_parish_id=parish_id,
        dependents_count=3,
    )

    result = await service.register(
        actor=build_actor(UserRole.OFFICER, parish_id),
        data=data,
    )

    beneficiary = result.beneficiary
    assert beneficiary.name_encrypted != data.name
    assert beneficiary.phone_encrypted != "+2348012345678"
    assert beneficiary.name_normalised == "amina ibrahim"
    assert len(beneficiary.phone_hash) == 64
    assert result.possible_duplicate_count == 2
    service._audit.record.assert_awaited_once()
    audit_state = service._audit.record.await_args.kwargs["after_state"]
    assert "name" not in audit_state
    assert "phone" not in audit_state
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_registration_blocks_current_phone_duplicate() -> None:
    parish_id = uuid4()
    session = build_session()
    session.execute.side_effect = [
        QueryResult(scalar=parish_id),
        QueryResult(scalar=build_beneficiary(parish_id)),
    ]
    service = BeneficiaryService(session, config=build_test_settings())

    with pytest.raises(ResourceConflictError, match="phone already exists"):
        await service.register(
            actor=build_actor(UserRole.OFFICER, parish_id),
            data=BeneficiaryCreate(
                name="Amina Ibrahim",
                phone="+2348012345678",
                home_parish_id=parish_id,
                dependents_count=1,
            ),
        )

    session.rollback.assert_awaited_once()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_registration_denies_cross_parish_actor() -> None:
    service = BeneficiaryService(
        build_session(),
        config=build_test_settings(),
    )

    with pytest.raises(AuthorizationError):
        await service.register(
            actor=build_actor(UserRole.OFFICER, uuid4()),
            data=BeneficiaryCreate(
                name="Amina Ibrahim",
                phone="+2348012345678",
                home_parish_id=uuid4(),
                dependents_count=1,
            ),
        )


@pytest.mark.asyncio
async def test_same_parish_lookup_returns_full_match_and_is_audited() -> None:
    parish_id = uuid4()
    beneficiary = build_beneficiary(parish_id)
    session = build_session()
    session.execute.return_value = QueryResult(scalar=beneficiary)
    service = BeneficiaryService(session, config=build_test_settings())
    service._audit.record = AsyncMock()

    result = await service.lookup(
        actor=build_actor(UserRole.PASTOR, parish_id),
        phone="+2348012345678",
    )

    assert result.outcome == "match"
    assert result.beneficiary is beneficiary
    service._audit.record.assert_awaited_once()
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_cross_parish_lookup_hides_identity() -> None:
    beneficiary = build_beneficiary(uuid4())
    session = build_session()
    session.execute.return_value = QueryResult(scalar=beneficiary)
    service = BeneficiaryService(session, config=build_test_settings())
    service._audit.record = AsyncMock()

    result = await service.lookup(
        actor=build_actor(UserRole.OFFICER, uuid4()),
        phone="+2348012345678",
    )

    assert result.outcome == "restricted_match"
    assert result.beneficiary is None
    assert result.verification_status == VerificationStatus.VERIFIED
    audit_state = service._audit.record.await_args.kwargs["after_state"]
    assert audit_state == {
        "outcome": "restricted_match",
        "same_parish": False,
    }


@pytest.mark.asyncio
async def test_lookup_miss_is_audited() -> None:
    parish_id = uuid4()
    session = build_session()
    session.execute.side_effect = [
        QueryResult(scalar=None),
        QueryResult(scalar=None),
    ]
    service = BeneficiaryService(session, config=build_test_settings())
    service._audit.record = AsyncMock()

    result = await service.lookup(
        actor=build_actor(UserRole.OFFICER, parish_id),
        phone="+2348099999999",
    )

    assert result.outcome == "none"
    assert result.beneficiary is None
    service._audit.record.assert_awaited_once()
    session.commit.assert_awaited_once()
