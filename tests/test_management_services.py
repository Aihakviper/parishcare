from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import AuthorizationError
from app.models.enums import UserRole
from app.models.parish import Parish
from app.models.user import User
from app.schemas.parish import ParishCreate, ParishUpdate
from app.schemas.user import UserCreate, UserUpdate
from app.services.parish import ParishService
from app.services.errors import ResourceConflictError
from app.services.user import UserService
from tests.settings import build_test_settings


class ScalarResult:
    def __init__(self, value) -> None:
        self._value = value

    def scalar_one_or_none(self):
        return self._value


def build_session() -> MagicMock:
    session = MagicMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.refresh = AsyncMock()
    return session


def build_actor(role: UserRole, parish_id=None) -> User:
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


@pytest.mark.asyncio
async def test_hq_creates_encrypted_audited_parish() -> None:
    events: list[str] = []
    session = build_session()
    session.flush.side_effect = lambda: events.append("flush")
    session.commit.side_effect = lambda: events.append("commit")
    service = ParishService(session, config=build_test_settings())
    service._audit.record = AsyncMock(
        side_effect=lambda **_: events.append("audit")
    )
    actor = build_actor(UserRole.HQ)
    data = ParishCreate(
        name="St. Peter Parish",
        region="Lagos",
        address="1 Church Road",
        contact_name="Parish Secretary",
        contact_phone="+234 801-234-5678",
    )

    parish = await service.create(actor=actor, data=data)

    assert parish.contact_name_encrypted != data.contact_name
    assert parish.contact_phone_encrypted != "+2348012345678"
    assert len(parish.contact_phone_hash) == 64
    assert events == ["flush", "audit", "commit"]
    audit_state = service._audit.record.await_args.kwargs["after_state"]
    assert "contact_phone_hash" not in audit_state
    assert "contact_name" not in audit_state


@pytest.mark.asyncio
async def test_parish_mutation_rolls_back_when_audit_fails() -> None:
    session = build_session()
    service = ParishService(session, config=build_test_settings())
    service._audit.record = AsyncMock(side_effect=RuntimeError("audit failed"))

    with pytest.raises(RuntimeError, match="audit failed"):
        await service.create(
            actor=build_actor(UserRole.HQ),
            data=ParishCreate(
                name="St. Paul Parish",
                region="Abuja",
                contact_name="Secretary",
                contact_phone="+2348011111111",
            ),
        )

    session.rollback.assert_awaited_once()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_pastor_cannot_update_another_parish() -> None:
    own_parish_id = uuid4()
    service = ParishService(build_session(), config=build_test_settings())

    with pytest.raises(AuthorizationError):
        await service.update(
            actor=build_actor(UserRole.PASTOR, own_parish_id),
            parish_id=uuid4(),
            data=ParishUpdate(name="Unauthorized change"),
        )


@pytest.mark.asyncio
async def test_pastor_updates_own_parish_with_audit() -> None:
    parish_id = uuid4()
    parish = Parish(
        id=parish_id,
        name="Old Name",
        region="Lagos",
        address=None,
        contact_name_encrypted="encrypted-name",
        contact_phone_encrypted="encrypted-phone",
        contact_phone_hash="b" * 64,
    )
    events: list[str] = []
    session = build_session()
    session.execute.return_value = ScalarResult(parish)
    session.flush.side_effect = lambda: events.append("flush")
    session.commit.side_effect = lambda: events.append("commit")
    service = ParishService(session, config=build_test_settings())
    service._audit.record = AsyncMock(
        side_effect=lambda **_: events.append("audit")
    )

    updated = await service.update(
        actor=build_actor(UserRole.PASTOR, parish_id),
        parish_id=parish_id,
        data=ParishUpdate(name="New Name"),
    )

    assert updated.name == "New Name"
    assert events == ["flush", "audit", "commit"]


@pytest.mark.asyncio
async def test_hq_creates_encrypted_audited_user() -> None:
    parish_id = uuid4()
    session = build_session()
    session.execute.side_effect = [
        ScalarResult(parish_id),
        ScalarResult(None),
    ]
    service = UserService(session, config=build_test_settings())
    service._audit.record = AsyncMock()
    data = UserCreate(
        name="Welfare Officer",
        email="Officer@Example.com",
        password="strong-password",
        role=UserRole.OFFICER,
        parish_id=parish_id,
        mfa_enabled=True,
    )

    user = await service.create(actor=build_actor(UserRole.HQ), data=data)

    assert user.name_encrypted != data.name
    assert user.email_encrypted != "officer@example.com"
    assert user.password_hash.startswith("$argon2")
    assert user.email_hash not in service._audit.record.await_args.kwargs[
        "after_state"
    ].values()
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_pastor_cannot_create_pastor_account() -> None:
    parish_id = uuid4()
    service = UserService(build_session(), config=build_test_settings())

    with pytest.raises(AuthorizationError):
        await service.create(
            actor=build_actor(UserRole.PASTOR, parish_id),
            data=UserCreate(
                name="Another Pastor",
                email="pastor@example.com",
                password="strong-password",
                role=UserRole.PASTOR,
                parish_id=parish_id,
                mfa_enabled=True,
            ),
        )


@pytest.mark.asyncio
async def test_duplicate_user_email_rolls_back() -> None:
    parish_id = uuid4()
    session = build_session()
    session.execute.side_effect = [
        ScalarResult(parish_id),
        ScalarResult(uuid4()),
    ]
    service = UserService(session, config=build_test_settings())

    with pytest.raises(ResourceConflictError):
        await service.create(
            actor=build_actor(UserRole.HQ),
            data=UserCreate(
                name="Existing Officer",
                email="existing@example.com",
                password="strong-password",
                role=UserRole.OFFICER,
                parish_id=parish_id,
                mfa_enabled=True,
            ),
        )

    session.rollback.assert_awaited_once()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_pastor_updates_officer_in_own_parish_with_audit() -> None:
    parish_id = uuid4()
    officer = build_actor(UserRole.OFFICER, parish_id)
    session = build_session()
    session.execute.side_effect = [
        ScalarResult(officer),
        ScalarResult(parish_id),
    ]
    service = UserService(session, config=build_test_settings())
    service._audit.record = AsyncMock()

    updated = await service.update(
        actor=build_actor(UserRole.PASTOR, parish_id),
        user_id=officer.id,
        data=UserUpdate(is_active=False),
    )

    assert updated.is_active is False
    service._audit.record.assert_awaited_once()
    session.commit.assert_awaited_once()


def test_payment_capable_user_requires_mfa() -> None:
    with pytest.raises(ValueError, match="require MFA"):
        UserCreate(
            name="Officer",
            email="officer@example.com",
            password="strong-password",
            role=UserRole.OFFICER,
            parish_id=uuid4(),
            mfa_enabled=False,
        )
