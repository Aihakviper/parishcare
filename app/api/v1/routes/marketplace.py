from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.errors import ErrorResponse
from app.schemas.marketplace import (
    ArtisanProfileCreate,
    ArtisanProfileResponse,
    DisputeCreate,
    DisputeResolve,
    DisputeResponse,
    EscrowResponse,
    JobCreate,
    JobQuote,
    JobResponse,
    JobTransition,
    ReviewCreate,
    PublicArtisanResponse,
    PublicJobFeedResponse,
)
from app.models.enums import ArtisanTier
from app.services.discovery import DiscoveryService
from app.services.marketplace import MarketplaceService, present_job
from app.utils.crypto import PIICipher

router = APIRouter()
ERRORS = {
    401: {"model": ErrorResponse},
    403: {"model": ErrorResponse},
    404: {"model": ErrorResponse},
    409: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
}


def service(session: AsyncSession) -> MarketplaceService:
    return MarketplaceService(session)


def job_response(job) -> JobResponse:
    return JobResponse.model_validate(
        present_job(job, PIICipher(settings.pii_encryption_key))
    )


@router.get(
    "/public/artisans",
    response_model=list[PublicArtisanResponse],
    summary="Discover verified artisans without exposing private contact data",
)
async def discover_artisans(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    query: str | None = None,
    trade: str | None = None,
    tier: ArtisanTier | None = None,
    service_area: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[PublicArtisanResponse]:
    discovery = DiscoveryService(session)
    artisans = await discovery.list_artisans(
        query=query,
        trade=trade,
        tier=tier,
        service_area=service_area,
        limit=limit,
    )
    return [
        PublicArtisanResponse.model_validate(
            discovery.present_artisan(artisan)
        )
        for artisan in artisans
    ]


@router.get(
    "/public/artisans/{artisan_id}",
    response_model=PublicArtisanResponse,
    summary="Get one verified artisan's public profile",
)
async def public_artisan_profile(
    artisan_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> PublicArtisanResponse:
    discovery = DiscoveryService(session)
    return PublicArtisanResponse.model_validate(
        discovery.present_artisan(
            await discovery.get_artisan(artisan_id)
        )
    )


@router.get(
    "/public/jobs/feed",
    response_model=list[PublicJobFeedResponse],
    summary="List anonymized open job requests for artisans",
)
async def public_job_feed(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    trade: str | None = None,
    service_area: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[PublicJobFeedResponse]:
    discovery = DiscoveryService(session)
    jobs = await discovery.job_feed(
        trade=trade,
        service_area=service_area,
        limit=limit,
    )
    return [
        PublicJobFeedResponse.model_validate(discovery.present_job(job))
        for job in jobs
    ]


@router.post(
    "/artisans/profile",
    response_model=ArtisanProfileResponse,
    status_code=status.HTTP_201_CREATED,
    responses=ERRORS,
)
async def create_artisan_profile(
    data: ArtisanProfileCreate,
    actor: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ArtisanProfileResponse:
    return ArtisanProfileResponse.model_validate(
        await service(session).create_artisan_profile(actor=actor, data=data)
    )


@router.post(
    "/jobs",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    responses=ERRORS,
)
async def create_job(
    data: JobCreate,
    actor: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> JobResponse:
    return job_response(await service(session).create_job(actor=actor, data=data))


@router.get("/jobs/{job_id}", response_model=JobResponse, responses=ERRORS)
async def get_job(
    job_id: UUID,
    actor: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> JobResponse:
    return job_response(
        await service(session).get_job(actor=actor, job_id=job_id)
    )


@router.post(
    "/jobs/{job_id}/quote", response_model=JobResponse, responses=ERRORS
)
async def quote_job(
    job_id: UUID,
    data: JobQuote,
    actor: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> JobResponse:
    return job_response(
        await service(session).quote_job(
            actor=actor, job_id=job_id, price_kobo=data.price_kobo
        )
    )


@router.post(
    "/jobs/{job_id}/transition",
    response_model=JobResponse,
    responses=ERRORS,
)
async def transition_job(
    job_id: UUID,
    data: JobTransition,
    actor: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> JobResponse:
    return job_response(
        await service(session).transition_job(
            actor=actor, job_id=job_id, status=data.status
        )
    )


@router.post(
    "/jobs/{job_id}/escrow/fund",
    response_model=EscrowResponse,
    status_code=status.HTTP_201_CREATED,
    responses=ERRORS,
)
async def fund_escrow(
    job_id: UUID,
    actor: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> EscrowResponse:
    return EscrowResponse.model_validate(
        await service(session).fund_escrow(actor=actor, job_id=job_id)
    )


@router.post(
    "/jobs/{job_id}/escrow/release",
    response_model=EscrowResponse,
    responses=ERRORS,
)
async def release_escrow(
    job_id: UUID,
    actor: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> EscrowResponse:
    return EscrowResponse.model_validate(
        await service(session).release_escrow(actor=actor, job_id=job_id)
    )


@router.post(
    "/jobs/{job_id}/reviews",
    status_code=status.HTTP_201_CREATED,
    responses=ERRORS,
)
async def create_review(
    job_id: UUID,
    data: ReviewCreate,
    actor: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict[str, str]:
    review = await service(session).create_review(
        actor=actor, job_id=job_id, data=data
    )
    return {"id": str(review.id)}


@router.post(
    "/jobs/{job_id}/disputes",
    response_model=DisputeResponse,
    status_code=status.HTTP_201_CREATED,
    responses=ERRORS,
)
async def open_dispute(
    job_id: UUID,
    data: DisputeCreate,
    actor: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> DisputeResponse:
    return DisputeResponse.model_validate(
        await service(session).open_dispute(
            actor=actor, job_id=job_id, data=data
        )
    )


@router.post(
    "/disputes/{dispute_id}/resolve",
    response_model=DisputeResponse,
    responses=ERRORS,
)
async def resolve_dispute(
    dispute_id: UUID,
    data: DisputeResolve,
    actor: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> DisputeResponse:
    return DisputeResponse.model_validate(
        await service(session).resolve_dispute(
            actor=actor, dispute_id=dispute_id, data=data
        )
    )
