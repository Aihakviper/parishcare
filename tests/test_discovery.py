from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ArtisanTier, EscrowStatus, JobStatus, Trade
from app.models.marketplace import ArtisanProfile, Job
from app.services.discovery import (
    DiscoveryService,
    PublicArtisan,
    frontend_trade,
    parse_trade,
)
from app.services.marketplace import JOB_DESCRIPTION_CONTEXT
from app.utils.crypto import PIICipher
from tests.settings import build_test_settings


def test_frontend_generator_trade_alias_is_supported() -> None:
    assert parse_trade("generator_tech") == Trade.GENERATOR_TECHNICIAN
    assert frontend_trade(Trade.GENERATOR_TECHNICIAN) == "generator_tech"


def test_public_artisan_does_not_expose_phone_or_email() -> None:
    now = datetime.now(timezone.utc)
    profile = ArtisanProfile(
        id=uuid4(),
        user_id=uuid4(),
        trade=Trade.ELECTRICIAN,
        service_area="RCCG Camp Phase 2",
        tier=ArtisanTier.TRUSTED,
        trust_score=72,
        completed_jobs=31,
        average_rating_milli=4800,
        rating_count=31,
        nin_verified=True,
        bvn_verified=True,
        community_vouches=3,
        peer_endorsements=1,
        sample_work_score=8,
        sample_work_urls=["https://example.test/work.jpg"],
        created_at=now,
        updated_at=now,
    )
    service = DiscoveryService(
        MagicMock(spec=AsyncSession),
        config=build_test_settings(),
    )

    result = service.present_artisan(
        PublicArtisan(profile=profile, name="Tunde Akinwale")
    )

    assert result["name"] == "Tunde Akinwale"
    assert result["averageRating"] == 4.8
    assert "phone" not in result
    assert "email" not in result
    assert "user_id" not in result


def test_public_job_feed_anonymizes_exact_location_and_resident() -> None:
    config = build_test_settings()
    cipher = PIICipher(config.pii_encryption_key)
    now = datetime.now(timezone.utc)
    job = Job(
        id=uuid4(),
        resident_id=uuid4(),
        artisan_id=None,
        trade=Trade.GENERATOR_TECHNICIAN,
        description_encrypted=cipher.encrypt(
            (
                "Generator does not start. Call +2348012345678 or email "
                "resident@example.com."
            ),
            context=JOB_DESCRIPTION_CONTEXT,
        ),
        service_area="RCCG Camp Phase 2 · Faith Avenue · House 14",
        photos=[],
        status=JobStatus.REQUESTED,
        price_kobo=1_850_000,
        escrow_status=EscrowStatus.PENDING,
        created_at=now,
        updated_at=now,
    )
    service = DiscoveryService(
        MagicMock(spec=AsyncSession),
        config=config,
    )

    result = service.present_job(job)

    assert result["trade"] == "generator_tech"
    assert result["serviceArea"] == "RCCG Camp Phase 2"
    assert "resident_id" not in result
    assert "Faith Avenue" not in str(result)
    assert "+2348012345678" not in str(result)
    assert "resident@example.com" not in str(result)


@pytest.mark.asyncio
async def test_job_feed_only_returns_unassigned_requested_jobs() -> None:
    session = MagicMock(spec=AsyncSession)
    result = MagicMock()
    result.scalars.return_value.all.return_value = []
    session.execute = AsyncMock(return_value=result)
    service = DiscoveryService(session, config=build_test_settings())

    assert await service.job_feed(trade="generator_tech") == []

    statement = session.execute.await_args.args[0]
    compiled = str(statement)
    assert "jobs.status" in compiled
    assert "jobs.artisan_id IS NULL" in compiled
