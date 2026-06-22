from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, settings
from app.core.rbac import Permission, require_permission
from app.models.enums import (
    DisputeResolution,
    DisputeStatus,
    EscrowStatus,
    JobEventType,
    JobStatus,
)
from app.models.marketplace import (
    ArtisanProfile,
    Dispute,
    EscrowTransaction,
    Job,
    JobEvent,
    Review,
)
from app.models.user import User
from app.schemas.marketplace import (
    ArtisanProfileCreate,
    DisputeCreate,
    DisputeResolve,
    JobCreate,
    ReviewCreate,
)
from app.services.audit import AuditService
from app.services.errors import (
    ResourceConflictError,
    ResourceNotFoundError,
    ServiceValidationError,
)
from app.services.trust import calculate_trust_score
from app.utils.crypto import PIICipher

JOB_DESCRIPTION_CONTEXT = "jobs.description"
REVIEW_TEXT_CONTEXT = "reviews.text"
DISPUTE_REASON_CONTEXT = "disputes.reason"
DISPUTE_RESOLUTION_CONTEXT = "disputes.resolution"


class MarketplaceService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        config: Settings = settings,
    ) -> None:
        self._session = session
        self._config = config
        self._cipher = PIICipher(config.pii_encryption_key)
        self._audit = AuditService(session)

    async def create_artisan_profile(
        self, *, actor: User, data: ArtisanProfileCreate
    ) -> ArtisanProfile:
        require_permission(actor, Permission.ARTISAN_PROFILE_CREATE)
        if await self._scalar(
            select(ArtisanProfile).where(ArtisanProfile.user_id == actor.id)
        ):
            raise ResourceConflictError("Artisan profile already exists")
        profile = ArtisanProfile(user_id=actor.id, **data.model_dump())
        score = calculate_trust_score(profile)
        profile.trust_score = score.score
        profile.tier = score.tier
        return await self._save(
            actor, profile, "artisan_profile.created", score.breakdown
        )

    async def create_job(self, *, actor: User, data: JobCreate) -> Job:
        require_permission(actor, Permission.JOB_CREATE)
        job = Job(
            resident_id=actor.id,
            trade=data.trade,
            description_encrypted=self._cipher.encrypt(
                data.description, context=JOB_DESCRIPTION_CONTEXT
            ),
            service_area=data.service_area,
            photos=data.photos,
            status=JobStatus.REQUESTED,
            escrow_status=EscrowStatus.PENDING,
        )
        return await self._save(actor, job, "job.created")

    async def get_job(self, *, actor: User, job_id: UUID) -> Job:
        require_permission(actor, Permission.JOB_VIEW)
        job = await self._get_job(job_id)
        if actor.role.value not in {"camp_admin", "mediator", "auditor"} and (
            actor.id not in {job.resident_id, job.artisan_id}
        ):
            raise ResourceNotFoundError("Job not found")
        return job

    async def quote_job(
        self, *, actor: User, job_id: UUID, price_kobo: int
    ) -> Job:
        require_permission(actor, Permission.JOB_MANAGE)
        job = await self._get_job(job_id, lock=True)
        if job.status != JobStatus.REQUESTED:
            raise ServiceValidationError("Only requested jobs can be quoted")
        profile = await self._artisan(actor.id)
        if profile.tier.value == "unverified":
            raise ServiceValidationError(
                "Unverified artisans cannot accept jobs"
            )
        job.artisan_id = actor.id
        job.price_kobo = price_kobo
        job.status = JobStatus.QUOTED
        return await self._mutate_job(actor, job, "job.quoted")

    async def transition_job(
        self, *, actor: User, job_id: UUID, status: JobStatus
    ) -> Job:
        job = await self._get_job(job_id, lock=True)
        allowed = {
            JobStatus.QUOTED: {JobStatus.ACCEPTED},
            JobStatus.ACCEPTED: {JobStatus.EN_ROUTE},
            JobStatus.EN_ROUTE: {JobStatus.WORKING},
            JobStatus.WORKING: {JobStatus.COMPLETED},
        }
        if status not in allowed.get(job.status, set()):
            raise ServiceValidationError("Illegal job status transition")
        if status == JobStatus.ACCEPTED:
            require_permission(actor, Permission.JOB_CREATE)
            if actor.id != job.resident_id:
                raise ServiceValidationError("Only the resident can accept")
        else:
            require_permission(actor, Permission.JOB_MANAGE)
            if actor.id != job.artisan_id:
                raise ServiceValidationError("Only the assigned artisan can update")
        job.status = status
        return await self._mutate_job(actor, job, "job.transitioned")

    async def fund_escrow(
        self, *, actor: User, job_id: UUID
    ) -> EscrowTransaction:
        require_permission(actor, Permission.ESCROW_MANAGE)
        job = await self._get_job(job_id, lock=True)
        if actor.id != job.resident_id or job.status != JobStatus.ACCEPTED:
            raise ServiceValidationError("Accepted resident job required")
        if job.price_kobo is None:
            raise ServiceValidationError("Job has no agreed price")
        if await self._scalar(
            select(EscrowTransaction).where(EscrowTransaction.job_id == job.id)
        ):
            raise ResourceConflictError("Escrow already exists")
        fee = job.price_kobo * self._config.marketplace_platform_fee_bps // 10_000
        now = datetime.now(timezone.utc)
        escrow = EscrowTransaction(
            job_id=job.id,
            amount_kobo=job.price_kobo,
            platform_fee_kobo=fee,
            artisan_amount_kobo=job.price_kobo - fee,
            status=EscrowStatus.HELD,
            provider_reference=f"steward-mock-{uuid4().hex}",
            funded_at=now,
        )
        job.escrow_status = EscrowStatus.HELD
        return await self._save(actor, escrow, "escrow.funded")

    async def release_escrow(
        self, *, actor: User, job_id: UUID
    ) -> EscrowTransaction:
        require_permission(actor, Permission.ESCROW_MANAGE)
        job = await self._get_job(job_id, lock=True)
        if actor.id != job.resident_id or job.status != JobStatus.COMPLETED:
            raise ServiceValidationError("Completed resident job required")
        escrow = await self._escrow(job.id)
        if escrow.status != EscrowStatus.HELD:
            raise ServiceValidationError("Escrow is not held")
        now = datetime.now(timezone.utc)
        escrow.status = EscrowStatus.RELEASED
        escrow.settled_at = now
        job.escrow_status = EscrowStatus.RELEASED
        job.status = JobStatus.CLOSED
        profile = await self._artisan(job.artisan_id)
        profile.completed_jobs += 1
        score = calculate_trust_score(profile)
        profile.trust_score, profile.tier = score.score, score.tier
        return await self._save(actor, escrow, "escrow.released")

    async def create_review(
        self, *, actor: User, job_id: UUID, data: ReviewCreate
    ) -> Review:
        require_permission(actor, Permission.REVIEW_CREATE)
        job = await self._get_job(job_id)
        if actor.id != job.resident_id or job.status != JobStatus.CLOSED:
            raise ServiceValidationError("Only the resident can review closed jobs")
        profile = await self._artisan(job.artisan_id)
        review = Review(
            job_id=job.id,
            from_id=actor.id,
            to_id=job.artisan_id,
            rating=data.rating,
            text_encrypted=(
                self._cipher.encrypt(data.text, context=REVIEW_TEXT_CONTEXT)
                if data.text
                else None
            ),
            voice_url=data.voice_url,
            created_at=datetime.now(timezone.utc),
        )
        total = profile.average_rating_milli * profile.rating_count
        profile.rating_count += 1
        profile.average_rating_milli = (
            total + data.rating * 1000
        ) // profile.rating_count
        score = calculate_trust_score(profile)
        profile.trust_score, profile.tier = score.score, score.tier
        return await self._save(actor, review, "review.created")

    async def open_dispute(
        self, *, actor: User, job_id: UUID, data: DisputeCreate
    ) -> Dispute:
        require_permission(actor, Permission.DISPUTE_CREATE)
        job = await self._get_job(job_id, lock=True)
        if actor.id not in {job.resident_id, job.artisan_id}:
            raise ResourceNotFoundError("Job not found")
        dispute = Dispute(
            job_id=job.id,
            opener_id=actor.id,
            reason_encrypted=self._cipher.encrypt(
                data.reason, context=DISPUTE_REASON_CONTEXT
            ),
            status=DisputeStatus.OPEN,
        )
        job.status = JobStatus.DISPUTED
        job.escrow_status = EscrowStatus.FROZEN
        escrow = await self._escrow(job.id)
        escrow.status = EscrowStatus.FROZEN
        return await self._save(actor, dispute, "dispute.opened")

    async def resolve_dispute(
        self, *, actor: User, dispute_id: UUID, data: DisputeResolve
    ) -> Dispute:
        require_permission(actor, Permission.DISPUTE_RESOLVE)
        dispute = await self._scalar(
            select(Dispute).where(Dispute.id == dispute_id).with_for_update()
        )
        if dispute is None:
            raise ResourceNotFoundError("Dispute not found")
        job = await self._get_job(dispute.job_id, lock=True)
        escrow = await self._escrow(job.id)
        target = (
            EscrowStatus.RELEASED
            if data.resolution == DisputeResolution.RELEASE
            else EscrowStatus.REFUNDED
        )
        now = datetime.now(timezone.utc)
        dispute.status = DisputeStatus.RESOLVED
        dispute.resolution = data.resolution
        dispute.resolution_notes_encrypted = self._cipher.encrypt(
            data.notes, context=DISPUTE_RESOLUTION_CONTEXT
        )
        dispute.mediator_id = actor.id
        dispute.resolved_at = now
        escrow.status = target
        escrow.settled_at = now
        job.escrow_status = target
        job.status = JobStatus.CLOSED
        return await self._save(actor, dispute, "dispute.resolved")

    async def _mutate_job(self, actor: User, job: Job, action: str) -> Job:
        self._session.add(
            JobEvent(
                job_id=job.id,
                event_type=JobEventType.STATUS_CHANGE,
                actor_id=actor.id,
                payload={"status": job.status.value},
                created_at=datetime.now(timezone.utc),
            )
        )
        return await self._save(actor, job, action)

    async def _save(self, actor: User, entity, action: str, state=None):
        try:
            self._session.add(entity)
            await self._session.flush()
            await self._audit.record(
                actor_id=actor.id,
                action=action,
                entity_type=entity.__tablename__,
                entity_id=entity.id,
                after_state=state or {"recorded": True},
            )
            await self._session.commit()
            await self._session.refresh(entity)
            return entity
        except Exception:
            await self._session.rollback()
            raise

    async def _scalar(self, query):
        return (await self._session.execute(query)).scalar_one_or_none()

    async def _get_job(self, job_id: UUID, lock: bool = False) -> Job:
        query = select(Job).where(Job.id == job_id)
        if lock:
            query = query.with_for_update()
        job = await self._scalar(query)
        if job is None:
            raise ResourceNotFoundError("Job not found")
        return job

    async def _artisan(self, user_id: UUID | None) -> ArtisanProfile:
        if user_id is None:
            raise ServiceValidationError("Job has no artisan")
        profile = await self._scalar(
            select(ArtisanProfile).where(ArtisanProfile.user_id == user_id)
        )
        if profile is None:
            raise ResourceNotFoundError("Artisan profile not found")
        return profile

    async def _escrow(self, job_id: UUID) -> EscrowTransaction:
        escrow = await self._scalar(
            select(EscrowTransaction)
            .where(EscrowTransaction.job_id == job_id)
            .with_for_update()
        )
        if escrow is None:
            raise ResourceNotFoundError("Escrow not found")
        return escrow


def present_job(job: Job, cipher: PIICipher) -> dict[str, object]:
    return {
        "id": job.id,
        "resident_id": job.resident_id,
        "artisan_id": job.artisan_id,
        "trade": job.trade,
        "description": cipher.decrypt(
            job.description_encrypted, context=JOB_DESCRIPTION_CONTEXT
        ),
        "service_area": job.service_area,
        "photos": job.photos,
        "status": job.status,
        "price_kobo": job.price_kobo,
        "escrow_status": job.escrow_status,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
    }
