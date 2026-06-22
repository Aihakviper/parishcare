from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
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
)
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
