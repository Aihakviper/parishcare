from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.demo_seed_config import DemoSeedSettings
from app.services.demo_seed import DemoSeedService
from app.services.errors import ServiceValidationError
from tests.settings import build_test_settings


class ScalarResult:
    def __init__(self, value=None) -> None:
        self.value = value

    def scalar_one_or_none(self):
        return self.value


def session_mock() -> MagicMock:
    session = MagicMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session


@pytest.mark.asyncio
async def test_demo_seed_is_environment_gated() -> None:
    service = DemoSeedService(
        session_mock(),
        config=build_test_settings(),
    )

    with pytest.raises(ServiceValidationError):
        await service.seed(
            DemoSeedSettings(
                _env_file=None,
                enabled=False,
                user_password="",
            )
        )


@pytest.mark.asyncio
async def test_demo_seed_creates_expected_counts_once() -> None:
    session = session_mock()
    session.execute.side_effect = [ScalarResult(), ScalarResult()]
    service = DemoSeedService(session, config=build_test_settings())
    service._audit_entities = AsyncMock()

    result = await service.seed(
        DemoSeedSettings(
            _env_file=None,
            enabled=True,
            user_password="Demo-Password-2026!",
        )
    )

    assert result.created is True
    assert (result.artisans, result.residents, result.jobs) == (40, 24, 80)
    added_batches = session.add_all.call_args_list
    assert len(added_batches[0].args[0]) == 64
    assert len(added_batches[1].args[0]) == 64
    assert len(added_batches[2].args[0]) > 80
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_demo_seed_rerun_is_idempotent() -> None:
    session = session_mock()
    session.execute.side_effect = [
        ScalarResult(),
        ScalarResult(uuid4()),
    ]
    service = DemoSeedService(session, config=build_test_settings())

    result = await service.seed(
        DemoSeedSettings(
            _env_file=None,
            enabled=True,
            user_password="Demo-Password-2026!",
        )
    )

    assert result.created is False
    session.add_all.assert_not_called()
    session.commit.assert_not_awaited()
