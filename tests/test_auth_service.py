from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.core.config import Settings
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User
from app.services.auth import (
    AuthenticationError,
    AuthenticationService,
    MFARequiredError,
)
from app.utils.crypto import LookupHasher, normalize_email
from tests.settings import build_test_settings


class ScalarResult:
    def __init__(self, value: User | None) -> None:
        self._value = value

    def scalar_one_or_none(self) -> User | None:
        return self._value


def build_user(
    config: Settings,
    *,
    role: UserRole = UserRole.HQ,
    mfa_enabled: bool = False,
) -> User:
    email = normalize_email("admin@example.com")
    return User(
        id=uuid4(),
        name_encrypted="encrypted-name",
        email_encrypted="encrypted-email",
        email_hash=LookupHasher(config.pii_lookup_key).digest(email),
        password_hash=hash_password("correct horse battery staple"),
        role=role,
        parish_id=None,
        mfa_enabled=mfa_enabled,
        is_active=True,
    )


@pytest.mark.asyncio
async def test_authenticate_and_issue_tokens() -> None:
    config = build_test_settings()
    user = build_user(config)
    session = AsyncMock()
    session.execute.return_value = ScalarResult(user)
    service = AuthenticationService(session, config=config)

    tokens = await service.authenticate_and_issue_tokens(
        " ADMIN@example.com ",
        "correct horse battery staple",
    )

    assert tokens.access_token
    assert tokens.refresh_token
    session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_authenticate_rejects_invalid_credentials() -> None:
    config = build_test_settings()
    session = AsyncMock()
    session.execute.return_value = ScalarResult(None)
    service = AuthenticationService(session, config=config)

    with pytest.raises(AuthenticationError, match="Invalid email or password"):
        await service.authenticate("missing@example.com", "wrong password")


@pytest.mark.asyncio
async def test_authenticate_rejects_empty_email_generically() -> None:
    config = build_test_settings()
    session = AsyncMock()
    service = AuthenticationService(session, config=config)

    with pytest.raises(AuthenticationError, match="Invalid email or password"):
        await service.authenticate(" ", "wrong password")

    session.execute.assert_not_awaited()


@pytest.mark.asyncio
async def test_payment_role_requires_mfa_before_initial_tokens() -> None:
    config = build_test_settings()
    user = build_user(
        config,
        role=UserRole.OFFICER,
        mfa_enabled=True,
    )
    session = AsyncMock()
    session.execute.return_value = ScalarResult(user)
    service = AuthenticationService(session, config=config)

    with pytest.raises(MFARequiredError):
        await service.authenticate_and_issue_tokens(
            "admin@example.com",
            "correct horse battery staple",
        )

    tokens = await service.authenticate_and_issue_tokens(
        "admin@example.com",
        "correct horse battery staple",
        mfa_verified=True,
    )
    assert tokens.access_token


@pytest.mark.asyncio
async def test_refresh_rechecks_user_state() -> None:
    config = build_test_settings()
    user = build_user(config)
    session = AsyncMock()
    session.execute.return_value = ScalarResult(user)
    service = AuthenticationService(session, config=config)
    tokens = await service.issue_tokens(user)

    refreshed = await service.refresh(tokens.refresh_token)

    assert refreshed.access_token != tokens.access_token
