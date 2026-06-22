from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, settings
from app.core.demo_seed_config import DemoSeedSettings
from app.core.security import hash_password
from app.models.enums import (
    ArtisanTier,
    DisputeStatus,
    EscrowStatus,
    JobStatus,
    Trade,
    UserRole,
)
from app.models.marketplace import (
    ArtisanProfile,
    Dispute,
    EscrowTransaction,
    Job,
    ResidentProfile,
    Review,
)
from app.models.user import User
from app.services.audit import AuditService
from app.services.errors import ServiceValidationError
from app.services.marketplace import (
    DISPUTE_REASON_CONTEXT,
    JOB_DESCRIPTION_CONTEXT,
    REVIEW_TEXT_CONTEXT,
)
from app.services.trust import calculate_trust_score
from app.services.user import USER_EMAIL_CONTEXT, USER_NAME_CONTEXT
from app.utils.crypto import LookupHasher, PIICipher, normalize_email

DEMO_SEED_LOCK_ID = 1_347_221_093
DEMO_NAMESPACE = uuid5(NAMESPACE_URL, "steward-rccg-camp-demo-v1")
HERO_ARTISAN_EMAIL = "tunde.akinwale@demo.steward.local"

ARTISAN_NAMES = [
    "Tunde Akinwale", "Ibrahim Sani Yusuf", "Chiamaka Nwosu",
    "Aisha Mohammed", "Olumide Adebayo", "Emeka Okonkwo",
    "Bilkisu Garba", "Adeyemi Ogunleye", "Ngozi Eze", "Yusuf Bello",
    "Tope Olafemi", "Hauwa Adamu", "Kemi Balogun", "Samuel Ekanem",
    "Grace Okoro", "Musa Abdullahi", "Folake Adewale", "Peter Udoh",
    "Zainab Lawal", "Chidi Obi", "Ruth Akinyemi", "Abubakar Danjuma",
    "Blessing Okafor", "Dayo Fashola", "Halima Garba", "Victor Eze",
    "Amina Sule", "Kunle Ojo", "Patience Umeh", "Garba Musa",
    "Lola Ajayi", "Ifeanyi Nnamdi", "Maryam Hassan", "Segun Oladipo",
    "Adesuwa Ighodaro", "Biodun Akintola", "Emmanuel Bassey",
    "Toyin Ogunleye", "Usman Ibrahim", "Fatou Diallo",
]
RESIDENT_NAMES = [
    "Funmi Adebanjo", "Adewale Ogunleye", "Mercy Eze", "Joseph Akpan",
    "Fatima Bello", "Chioma Nwosu", "Samuel Adeyemi", "Grace Okonkwo",
    "Ibrahim Musa", "Blessing Okafor", "Emmanuel Bassey", "Patience Umeh",
    "Kunle Ojo", "Maryam Hassan", "Victor Eze", "Folake Adewale",
    "Peter Udoh", "Halima Garba", "Segun Oladipo", "Adesuwa Ighodaro",
    "Toyin Ogunleye", "Usman Ibrahim", "Lola Ajayi", "Ifeanyi Nnamdi",
]
TRADES = list(Trade)
AREAS = [
    "RCCG Camp Phase 1",
    "RCCG Camp Phase 2",
    "RCCG Camp Phase 3",
    "RCCG Camp Phase 4",
    "Mowe-Camp Border",
]
WORK_PHOTOS = [
    "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=900",
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=900",
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=900",
]


@dataclass(frozen=True)
class DemoSeedResult:
    created: bool
    artisans: int
    residents: int
    jobs: int


class DemoSeedService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        config: Settings = settings,
    ) -> None:
        self._session = session
        self._config = config
        self._cipher = PIICipher(config.pii_encryption_key)
        self._hasher = LookupHasher(config.pii_lookup_key)
        self._audit = AuditService(session)

    async def seed(self, seed: DemoSeedSettings) -> DemoSeedResult:
        if not seed.enabled:
            raise ServiceValidationError(
                "Demo seeding is disabled in the environment"
            )
        try:
            await self._session.execute(
                text("SELECT pg_advisory_xact_lock(:lock_id)"),
                {"lock_id": DEMO_SEED_LOCK_ID},
            )
            marker = self._hasher.digest(normalize_email(HERO_ARTISAN_EMAIL))
            existing = await self._session.execute(
                select(User.id).where(User.email_hash == marker).limit(1)
            )
            if existing.scalar_one_or_none() is not None:
                return DemoSeedResult(False, 40, 24, 80)

            now = datetime.now(timezone.utc)
            password_hash = hash_password(seed.user_password)
            artisan_users = [
                self._user(
                    name=name,
                    email=(
                        HERO_ARTISAN_EMAIL
                        if index == 0
                        else f"artisan{index:02d}@demo.steward.local"
                    ),
                    role=UserRole.ARTISAN,
                    password_hash=password_hash,
                    key=f"artisan-user-{index}",
                    created_at=now - timedelta(days=420 - index * 5),
                )
                for index, name in enumerate(ARTISAN_NAMES)
            ]
            resident_users = [
                self._user(
                    name=name,
                    email=f"resident{index:02d}@demo.steward.local",
                    role=UserRole.RESIDENT,
                    password_hash=password_hash,
                    key=f"resident-user-{index}",
                    created_at=now - timedelta(days=180 - index * 3),
                )
                for index, name in enumerate(RESIDENT_NAMES)
            ]
            self._session.add_all([*artisan_users, *resident_users])
            await self._session.flush()

            profiles: list[ArtisanProfile] = []
            for index, user in enumerate(artisan_users):
                profile = ArtisanProfile(
                    id=self._id(f"artisan-profile-{index}"),
                    user_id=user.id,
                    trade=TRADES[index % len(TRADES)],
                    service_area=AREAS[index % len(AREAS)],
                    completed_jobs=31 if index == 0 else 3 + index * 2,
                    average_rating_milli=4800 if index == 0 else 3900 + index % 10 * 100,
                    rating_count=31 if index == 0 else 3 + index,
                    nin_verified=index % 5 != 4,
                    bvn_verified=index % 3 != 2,
                    community_vouches=2 + index % 3,
                    peer_endorsements=index % 4,
                    sample_work_score=5 + index % 4,
                    sample_work_urls=WORK_PHOTOS,
                    created_at=user.created_at,
                    updated_at=now,
                )
                score = calculate_trust_score(profile, now=now)
                profile.trust_score = score.score
                profile.tier = score.tier
                if index == 0:
                    profile.tier = ArtisanTier.TRUSTED
                    profile.trust_score = 78
                profiles.append(profile)

            residents = [
                ResidentProfile(
                    id=self._id(f"resident-profile-{index}"),
                    user_id=user.id,
                    address=(
                        f"RCCG Camp Phase {index % 4 + 1} · "
                        f"Faith Avenue · House {10 + index}"
                    ),
                    camp_phase=f"Phase {index % 4 + 1}",
                    created_at=user.created_at,
                    updated_at=now,
                )
                for index, user in enumerate(resident_users)
            ]
            self._session.add_all([*profiles, *residents])
            await self._session.flush()

            jobs: list[Job] = []
            escrows: list[EscrowTransaction] = []
            reviews: list[Review] = []
            for index in range(80):
                artisan = artisan_users[index % len(artisan_users)]
                resident = resident_users[index % len(resident_users)]
                trade = TRADES[index % len(TRADES)]
                status = (
                    JobStatus.REQUESTED
                    if index % 6 == 5
                    else (
                        JobStatus.CLOSED
                        if index % 3 == 0
                        else JobStatus.WORKING
                    )
                )
                price = 800_000 + (index % 8) * 150_000
                job = Job(
                    id=self._id(f"job-{index}"),
                    resident_id=resident.id,
                    artisan_id=(
                        None if status == JobStatus.REQUESTED else artisan.id
                    ),
                    trade=trade,
                    description_encrypted=self._cipher.encrypt(
                        _job_description(trade, index),
                        context=JOB_DESCRIPTION_CONTEXT,
                    ),
                    service_area=(
                        f"{AREAS[index % len(AREAS)]} · "
                        f"Street {index % 12 + 1}"
                    ),
                    photos=[],
                    status=status,
                    price_kobo=price,
                    escrow_status=(
                        EscrowStatus.PENDING
                        if status == JobStatus.REQUESTED
                        else (
                            EscrowStatus.RELEASED
                            if status == JobStatus.CLOSED
                            else EscrowStatus.HELD
                        )
                    ),
                    created_at=now - timedelta(days=30 - index % 30),
                    updated_at=now - timedelta(days=index % 3),
                )
                jobs.append(job)
                if status != JobStatus.REQUESTED:
                    fee = (
                        price
                        * self._config.marketplace_platform_fee_bps
                        // 10_000
                    )
                    escrow = EscrowTransaction(
                        id=self._id(f"escrow-{index}"),
                        job_id=job.id,
                        amount_kobo=price,
                        platform_fee_kobo=fee,
                        artisan_amount_kobo=price - fee,
                        status=job.escrow_status,
                        provider_reference=f"STW-DEMO-{index:05d}",
                        funded_at=job.created_at,
                        settled_at=(
                            job.updated_at
                            if status == JobStatus.CLOSED
                            else None
                        ),
                        created_at=job.created_at,
                        updated_at=job.updated_at,
                    )
                    escrows.append(escrow)
                if status == JobStatus.CLOSED:
                    reviews.append(
                        Review(
                            id=self._id(f"review-{index}"),
                            job_id=job.id,
                            from_id=resident.id,
                            to_id=artisan.id,
                            rating=4 + index % 2,
                            text_encrypted=self._cipher.encrypt(
                                "Clean work and respectful service.",
                                context=REVIEW_TEXT_CONTEXT,
                            ),
                            created_at=job.updated_at,
                        )
                    )

            dispute_job = jobs[1]
            dispute_job.status = JobStatus.DISPUTED
            dispute_job.escrow_status = EscrowStatus.FROZEN
            for escrow in escrows:
                if escrow.job_id == dispute_job.id:
                    escrow.status = EscrowStatus.FROZEN
                    break
            dispute = Dispute(
                id=self._id("demo-dispute"),
                job_id=dispute_job.id,
                opener_id=dispute_job.resident_id,
                reason_encrypted=self._cipher.encrypt(
                    "The repair did not resolve the original fault.",
                    context=DISPUTE_REASON_CONTEXT,
                ),
                status=DisputeStatus.OPEN,
                created_at=now - timedelta(hours=6),
                updated_at=now - timedelta(hours=6),
            )
            self._session.add_all([*jobs, *escrows, *reviews, dispute])
            await self._session.flush()

            await self._audit_entities(
                [*artisan_users, *resident_users],
                action="demo.user_seeded",
            )
            await self._audit_entities(
                [*profiles, *residents],
                action="demo.profile_seeded",
            )
            await self._audit_entities(jobs, action="demo.job_seeded")
            await self._audit_entities(
                escrows, action="demo.escrow_seeded"
            )
            await self._audit_entities(
                reviews, action="demo.review_seeded"
            )
            await self._audit_entities(
                [dispute], action="demo.dispute_seeded"
            )
            await self._session.commit()
            return DemoSeedResult(True, 40, 24, 80)
        except Exception:
            await self._session.rollback()
            raise

    def _user(
        self,
        *,
        name: str,
        email: str,
        role: UserRole,
        password_hash: str,
        key: str,
        created_at: datetime,
    ) -> User:
        normalized_email = normalize_email(email)
        return User(
            id=self._id(key),
            name_encrypted=self._cipher.encrypt(
                name, context=USER_NAME_CONTEXT
            ),
            email_encrypted=self._cipher.encrypt(
                normalized_email, context=USER_EMAIL_CONTEXT
            ),
            email_hash=self._hasher.digest(normalized_email),
            password_hash=password_hash,
            role=role,
            parish_id=None,
            mfa_enabled=False,
            is_active=True,
            created_at=created_at,
            updated_at=created_at,
        )

    async def _audit_entities(self, entities: list, *, action: str) -> None:
        for entity in entities:
            await self._audit.record(
                actor_id=None,
                action=action,
                entity_type=entity.__tablename__,
                entity_id=entity.id,
                after_state={"demo_seed": True},
            )

    @staticmethod
    def _id(key: str) -> UUID:
        return uuid5(DEMO_NAMESPACE, key)


def _job_description(trade: Trade, index: int) -> str:
    descriptions = {
        Trade.GENERATOR_TECHNICIAN: "Generator does not start before Sunday service.",
        Trade.PLUMBER: "Kitchen pipe is leaking and needs urgent repair.",
        Trade.ELECTRICIAN: "Bedroom socket sparks whenever an appliance is connected.",
        Trade.TAILOR: "Choir uniform needs adjustment before the weekend service.",
        Trade.MECHANIC: "Vehicle struggles to start in the morning.",
        Trade.CARPENTER: "The main door hinge and wooden frame need repair.",
        Trade.PAINTER: "Living room requires repainting before family arrives.",
        Trade.CLEANER: "Home needs a complete post-renovation cleanup.",
        Trade.SECURITY: "Temporary event gate security is required.",
    }
    return f"{descriptions[trade]} Request {index + 1}."
