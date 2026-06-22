from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import (
    ArtisanTier,
    EscrowStatus,
    JobStatus,
    Trade,
    UserRole,
)
from app.models.marketplace import ArtisanProfile, Job
from app.models.user import User
from app.schemas.marketplace import JobCreate
from app.services.marketplace import MarketplaceService
from app.services.trust import calculate_trust_score
from tests.settings import build_test_settings


class ScalarResult:
    def __init__(self, value) -> None:
        self.value = value

    def scalar_one_or_none(self):
        return self.value


def session_mock() -> MagicMock:
    session = MagicMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.refresh = AsyncMock()
    return session


def actor(role: UserRole) -> User:
    return User(
        id=uuid4(),
        name_encrypted="name",
        email_encrypted="email",
        email_hash="a" * 64,
        password_hash="hash",
        role=role,
        mfa_enabled=False,
        is_active=True,
    )


def test_trust_score_promotes_diligent_artisan() -> None:
    profile = ArtisanProfile(
        user_id=uuid4(),
        trade=Trade.ELECTRICIAN,
        service_area="Phase 2",
        nin_verified=True,
        community_vouches=3,
        sample_work_score=10,
        completed_jobs=50,
        average_rating_milli=4800,
        rating_count=50,
        peer_endorsements=3,
        trust_score=0,
        tier=ArtisanTier.UNVERIFIED,
        sample_work_urls=[],
        created_at=datetime.now(timezone.utc) - timedelta(days=400),
    )

    score = calculate_trust_score(profile)

    assert score.score >= 81
    assert score.tier == ArtisanTier.STEWARD


@pytest.mark.asyncio
async def test_job_creation_encrypts_and_audits() -> None:
    resident = actor(UserRole.RESIDENT)
    session = session_mock()
    now = datetime.now(timezone.utc)

    async def flush() -> None:
        job = session.add.call_args.args[0]
        job.id = job.id or uuid4()
        job.created_at = now
        job.updated_at = now

    session.flush.side_effect = flush
    service = MarketplaceService(session, config=build_test_settings())
    service._audit.record = AsyncMock()

    job = await service.create_job(
        actor=resident,
        data=JobCreate(
            trade=Trade.GENERATOR_TECHNICIAN,
            description="Generator does not start before Sunday service",
            service_area="Camp Phase 2",
        ),
    )

    assert "Generator does not start" not in job.description_encrypted
    assert job.status == JobStatus.REQUESTED
    service._audit.record.assert_awaited_once()
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_mock_escrow_uses_integer_kobo_and_five_percent_fee() -> None:
    resident = actor(UserRole.RESIDENT)
    job = Job(
        id=uuid4(),
        resident_id=resident.id,
        artisan_id=uuid4(),
        trade=Trade.GENERATOR_TECHNICIAN,
        description_encrypted="encrypted",
        service_area="Phase 2",
        status=JobStatus.ACCEPTED,
        price_kobo=1_850_000,
        escrow_status=EscrowStatus.PENDING,
        photos=[],
    )
    session = session_mock()
    session.execute.side_effect = [
        ScalarResult(job),
        ScalarResult(None),
    ]

    async def flush() -> None:
        escrow = session.add.call_args.args[0]
        escrow.id = escrow.id or uuid4()

    session.flush.side_effect = flush
    service = MarketplaceService(session, config=build_test_settings())
    service._audit.record = AsyncMock()

    escrow = await service.fund_escrow(actor=resident, job_id=job.id)

    assert escrow.amount_kobo == 1_850_000
    assert escrow.platform_fee_kobo == 92_500
    assert escrow.artisan_amount_kobo == 1_757_500
    assert escrow.status == EscrowStatus.HELD
    assert job.escrow_status == EscrowStatus.HELD
