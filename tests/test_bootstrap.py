from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.cli.bootstrap_hq import run_bootstrap
from app.core.bootstrap_config import BootstrapSettings
from app.models.enums import UserRole
from app.services.bootstrap import BootstrapService
from app.services.errors import ResourceConflictError, ServiceValidationError
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


def build_bootstrap(**overrides: object) -> BootstrapSettings:
    values: dict[str, object] = {
        "enabled": True,
        "hq_name": "First HQ Administrator",
        "hq_email": "hq-admin@example.com",
        "hq_password": "Strong-Bootstrap-Password-2026",
        "hq_mfa_enabled": True,
    }
    values.update(overrides)
    return BootstrapSettings(_env_file=None, **values)


@pytest.mark.asyncio
async def test_bootstrap_creates_encrypted_audited_hq_once() -> None:
    events: list[str] = []
    session = build_session()
    session.execute.side_effect = [
        MagicMock(),
        ScalarResult(None),
        ScalarResult(None),
    ]

    async def flush() -> None:
        events.append("flush")
        created_user = session.add.call_args.args[0]
        if created_user.id is None:
            created_user.id = uuid4()

    session.flush.side_effect = flush
    session.commit.side_effect = lambda: events.append("commit")
    service = BootstrapService(session, config=build_test_settings())
    service._audit.record = AsyncMock(
        side_effect=lambda **_: events.append("audit")
    )
    bootstrap = build_bootstrap()

    user = await service.create_first_hq(bootstrap)

    assert user.role == UserRole.HQ
    assert user.parish_id is None
    assert user.name_encrypted != bootstrap.hq_name
    assert user.email_encrypted != str(bootstrap.hq_email)
    assert user.password_hash.startswith("$argon2")
    assert events == ["flush", "audit", "commit"]
    audit_kwargs = service._audit.record.await_args.kwargs
    assert audit_kwargs["actor_id"] is None
    assert audit_kwargs["action"] == "system.hq_bootstrapped"
    assert "email" not in audit_kwargs["after_state"]


@pytest.mark.asyncio
async def test_bootstrap_refuses_when_any_hq_exists() -> None:
    session = build_session()
    session.execute.side_effect = [
        MagicMock(),
        ScalarResult(uuid4()),
    ]
    service = BootstrapService(session, config=build_test_settings())

    with pytest.raises(ResourceConflictError, match="already exists"):
        await service.create_first_hq(build_bootstrap())

    session.rollback.assert_awaited_once()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_bootstrap_requires_environment_enable_switch() -> None:
    session = build_session()
    service = BootstrapService(session, config=build_test_settings())

    with pytest.raises(ServiceValidationError, match="disabled"):
        await service.create_first_hq(build_bootstrap(enabled=False))

    session.execute.assert_not_awaited()


@pytest.mark.asyncio
async def test_cli_reports_success_without_printing_credentials(
    capsys: pytest.CaptureFixture[str],
) -> None:
    user_id = uuid4()
    user = MagicMock()
    user.id = user_id
    session = AsyncMock()
    session_context = MagicMock()
    session_context.__aenter__ = AsyncMock(return_value=session)
    session_context.__aexit__ = AsyncMock(return_value=None)

    with (
        patch(
            "app.cli.bootstrap_hq.BootstrapSettings",
            return_value=build_bootstrap(),
        ),
        patch(
            "app.cli.bootstrap_hq.AsyncSessionLocal",
            return_value=session_context,
        ),
        patch(
            "app.cli.bootstrap_hq.BootstrapService.create_first_hq",
            new=AsyncMock(return_value=user),
        ),
    ):
        exit_code = await run_bootstrap()

    captured = capsys.readouterr()
    assert exit_code == 0
    assert str(user_id) in captured.out
    assert "hq-admin@example.com" not in captured.out
    assert "Strong-Bootstrap-Password-2026" not in captured.out
