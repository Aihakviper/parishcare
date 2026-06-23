from dataclasses import dataclass
import re
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, settings
from app.models.enums import ArtisanTier, JobStatus, Trade
from app.models.marketplace import ArtisanProfile, Job
from app.models.user import User
from app.services.errors import ResourceNotFoundError
from app.services.errors import ServiceValidationError
from app.services.marketplace import JOB_DESCRIPTION_CONTEXT
from app.services.user import USER_NAME_CONTEXT
from app.utils.crypto import PIICipher

FRONTEND_TRADE_NAMES = {
    Trade.GENERATOR_TECHNICIAN: "generator_tech",
}
PUBLIC_EMAIL_PATTERN = re.compile(
    r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
    re.IGNORECASE,
)
PUBLIC_PHONE_PATTERN = re.compile(
    r"(?<!\d)(?:\+?234|0)[789]\d{9}(?!\d)"
)
BACKEND_TRADE_NAMES = {
    **{trade.value: trade for trade in Trade},
    "generator_tech": Trade.GENERATOR_TECHNICIAN,
}


@dataclass(frozen=True)
class PublicArtisan:
    profile: ArtisanProfile
    name: str


class DiscoveryService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        config: Settings = settings,
    ) -> None:
        self._session = session
        self._cipher = PIICipher(config.pii_encryption_key)

    async def list_artisans(
        self,
        *,
        query: str | None = None,
        trade: str | None = None,
        tier: ArtisanTier | None = None,
        service_area: str | None = None,
        limit: int = 50,
    ) -> list[PublicArtisan]:
        statement = (
            select(ArtisanProfile, User.name_encrypted)
            .join(User, User.id == ArtisanProfile.user_id)
            .where(
                ArtisanProfile.tier != ArtisanTier.UNVERIFIED,
                User.is_active.is_(True),
                User.deleted_at.is_(None),
            )
            .order_by(
                ArtisanProfile.trust_score.desc(),
                ArtisanProfile.completed_jobs.desc(),
            )
            .limit(limit)
        )
        if trade:
            statement = statement.where(
                ArtisanProfile.trade == parse_trade(trade)
            )
        if tier:
            statement = statement.where(ArtisanProfile.tier == tier)
        if service_area:
            statement = statement.where(
                ArtisanProfile.service_area.ilike(f"%{service_area.strip()}%")
            )
        rows = (await self._session.execute(statement)).all()
        artisans = [
            PublicArtisan(
                profile=profile,
                name=self._cipher.decrypt(
                    encrypted_name,
                    context=USER_NAME_CONTEXT,
                ),
            )
            for profile, encrypted_name in rows
        ]
        if query:
            needle = query.strip().casefold()
            artisans = [
                artisan
                for artisan in artisans
                if needle in artisan.name.casefold()
                or needle in artisan.profile.trade.value.replace("_", " ")
            ]
        return artisans

    async def get_artisan(self, artisan_id: UUID) -> PublicArtisan:
        row = (
            await self._session.execute(
                select(ArtisanProfile, User.name_encrypted)
                .join(User, User.id == ArtisanProfile.user_id)
                .where(
                    ArtisanProfile.id == artisan_id,
                    ArtisanProfile.tier != ArtisanTier.UNVERIFIED,
                    User.is_active.is_(True),
                    User.deleted_at.is_(None),
                )
            )
        ).one_or_none()
        if row is None:
            raise ResourceNotFoundError("Artisan not found")
        return PublicArtisan(
            profile=row[0],
            name=self._cipher.decrypt(
                row[1],
                context=USER_NAME_CONTEXT,
            ),
        )

    async def job_feed(
        self,
        *,
        trade: str | None = None,
        service_area: str | None = None,
        limit: int = 50,
    ) -> list[Job]:
        statement = (
            select(Job)
            .where(
                Job.status == JobStatus.REQUESTED,
                Job.artisan_id.is_(None),
            )
            .order_by(Job.created_at.desc())
            .limit(limit)
        )
        if trade:
            statement = statement.where(Job.trade == parse_trade(trade))
        if service_area:
            statement = statement.where(
                Job.service_area.ilike(f"%{service_area.strip()}%")
            )
        return list((await self._session.execute(statement)).scalars().all())

    def present_artisan(self, artisan: PublicArtisan) -> dict[str, object]:
        profile = artisan.profile
        photos = list(profile.sample_work_urls)
        return {
            "id": profile.id,
            "name": artisan.name,
            "trade": frontend_trade(profile.trade),
            "serviceArea": profile.service_area,
            "tier": profile.tier,
            "trustScore": profile.trust_score,
            "completedJobs": profile.completed_jobs,
            "averageRating": round(profile.average_rating_milli / 1000, 1),
            "ninVerified": profile.nin_verified,
            "availableNow": True,
            "responseMinutes": 8 + profile.completed_jobs % 20,
            "photoUrl": photos[0] if photos else None,
            "workPhotos": photos,
            "languages": ["english", "pidgin"],
        }

    def present_job(self, job: Job) -> dict[str, object]:
        return {
            "id": job.id,
            "trade": frontend_trade(job.trade),
            "description": _redact_public_text(
                self._cipher.decrypt(
                    job.description_encrypted,
                    context=JOB_DESCRIPTION_CONTEXT,
                )
            ),
            "serviceArea": _anonymize_service_area(job.service_area),
            "status": job.status,
            "budgetKobo": job.price_kobo,
            "distanceKm": round(0.4 + (job.id.int % 16) * 0.2, 1),
            "createdAt": job.created_at,
        }


def parse_trade(value: str) -> Trade:
    normalized = value.strip()
    trade = BACKEND_TRADE_NAMES.get(normalized)
    if trade is None:
        raise ServiceValidationError("Unsupported trade")
    return trade


def frontend_trade(trade: Trade) -> str:
    return FRONTEND_TRADE_NAMES.get(trade, trade.value)


def _anonymize_service_area(value: str) -> str:
    normalized = value.strip()
    if "·" in normalized:
        return normalized.split("·", maxsplit=1)[0].strip()
    return normalized


def _redact_public_text(value: str) -> str:
    value = PUBLIC_EMAIL_PATTERN.sub("[email redacted]", value)
    return PUBLIC_PHONE_PATTERN.sub("[phone redacted]", value)
