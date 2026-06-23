from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.schemas.camp import (
    CampConfirmationRequest,
    CampDisputeResolve,
    CampJobCreate,
    CampJobReview,
    CampJobStatusUpdate,
    CampMentorEnrollmentCreate,
    CampVouchRequestCreate,
)
from app.schemas.errors import ErrorResponse
from app.services.auth import AuthenticationError, AuthenticationService
from app.services.camp_mock import CampMockService

router = APIRouter(prefix="/camp")

ERRORS = {
    401: {"model": ErrorResponse},
    403: {"model": ErrorResponse},
    404: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
}


async def get_camp_actor(
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> User | None:
    if authorization is None and settings.camp_mock_auth_bypass:
        return None
    if authorization is None or not authorization.lower().startswith("bearer "):
        raise AuthenticationError("Invalid authentication credentials")
    token = authorization.split(" ", maxsplit=1)[1].strip()
    async with AsyncSessionLocal() as session:
        return await AuthenticationService(session).resolve_access_token(token)


def service() -> CampMockService:
    return CampMockService()


@router.get(
    "/artisans",
    response_model=list[dict[str, Any]],
    responses=ERRORS,
    summary="List Camp artisans from mock demo data",
)
async def list_artisans(
    actor: Annotated[User | None, Depends(get_camp_actor)],
    trade: str | None = None,
    tier: str | None = None,
    near: str | None = None,
    q: str | None = None,
) -> list[dict[str, Any]]:
    return service().list_artisans(trade=trade, tier=tier, near=near, q=q)


@router.get(
    "/artisans/{artisan_id}",
    response_model=dict[str, Any],
    responses=ERRORS,
    summary="Get one Camp artisan profile from mock demo data",
)
async def get_artisan(
    artisan_id: str,
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> dict[str, Any]:
    return service().get_artisan(artisan_id)


@router.get(
    "/artisans/{artisan_id}/lineage",
    response_model=list[dict[str, Any]],
    responses=ERRORS,
    summary="Get artisan lineage graph from mock demo data",
)
async def get_lineage(
    artisan_id: str,
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> list[dict[str, Any]]:
    return service().get_lineage(artisan_id)


@router.get(
    "/jobs",
    response_model=list[dict[str, Any]],
    responses=ERRORS,
    summary="List Camp jobs from mock demo data",
)
async def list_jobs(
    actor: Annotated[User | None, Depends(get_camp_actor)],
    member_id: str | None = None,
    artisan_id: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    return service().list_jobs(
        member_id=member_id,
        artisan_id=artisan_id,
        status=status,
    )


@router.get(
    "/jobs/{job_id}",
    response_model=dict[str, Any],
    responses=ERRORS,
    summary="Get one Camp job from mock demo data",
)
async def get_job(
    job_id: str,
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> dict[str, Any]:
    return service().get_job(job_id)


@router.post(
    "/jobs",
    response_model=dict[str, Any],
    responses=ERRORS,
    summary="Create a mock Camp job",
)
async def create_job(
    data: CampJobCreate,
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> dict[str, Any]:
    payload = data.model_dump()
    if actor is not None and actor.member_id is not None:
        payload["member_id"] = str(actor.member_id)
    return service().create_job(payload)


@router.post(
    "/jobs/{job_id}/accept",
    response_model=dict[str, Any],
    responses=ERRORS,
    summary="Accept a mock Camp job",
)
async def accept_job(
    job_id: str,
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> dict[str, Any]:
    return service().accept_job(job_id)


@router.post(
    "/jobs/{job_id}/status",
    response_model=dict[str, Any],
    responses=ERRORS,
    summary="Update mock Camp job status",
)
async def update_job_status(
    job_id: str,
    data: CampJobStatusUpdate,
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> dict[str, Any]:
    return service().update_job_status(
        job_id,
        status=data.status,
        photo=data.photo,
        photo_url=data.photo_url,
    )


@router.post(
    "/jobs/{job_id}/fund-escrow",
    response_model=dict[str, Any],
    responses=ERRORS,
    summary="Fund mock escrow and credit Stewards Fund",
)
async def fund_escrow(
    job_id: str,
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> dict[str, Any]:
    return service().fund_escrow(job_id)


@router.post(
    "/jobs/{job_id}/release-escrow",
    response_model=dict[str, Any],
    responses=ERRORS,
    summary="Release mock escrow",
)
async def release_escrow(
    job_id: str,
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> dict[str, Any]:
    return service().release_escrow(job_id)


@router.post(
    "/jobs/{job_id}/review",
    response_model=dict[str, Any],
    responses=ERRORS,
    summary="Review a mock Camp job",
)
async def review_job(
    job_id: str,
    data: CampJobReview,
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> dict[str, Any]:
    return service().review_job(job_id, rating=data.rating, text=data.text)


@router.get("/disputes", response_model=list[dict[str, Any]], responses=ERRORS)
async def list_disputes(
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> list[dict[str, Any]]:
    return service().list_disputes()


@router.get("/disputes/{dispute_id}", response_model=dict[str, Any], responses=ERRORS)
async def get_dispute(
    dispute_id: str,
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> dict[str, Any]:
    return service().get_dispute(dispute_id)


@router.post(
    "/disputes/{dispute_id}/resolve",
    response_model=dict[str, Any],
    responses=ERRORS,
)
async def resolve_dispute(
    dispute_id: str,
    data: CampDisputeResolve,
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> dict[str, Any]:
    return service().resolve_dispute(
        dispute_id,
        outcome=data.outcome,
        note=data.note,
    )


@router.get("/stats", response_model=dict[str, Any], responses=ERRORS)
async def get_stats(
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> dict[str, Any]:
    return service().stats()


@router.get("/patterns", response_model=list[dict[str, Any]], responses=ERRORS)
async def get_patterns(
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> list[dict[str, Any]]:
    return service().patterns()


@router.get("/parishes", response_model=list[dict[str, Any]], responses=ERRORS)
async def list_parishes(
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> list[dict[str, Any]]:
    return service().parishes()


@router.get(
    "/apprenticeships",
    response_model=list[dict[str, Any]],
    responses=ERRORS,
)
async def list_apprenticeships(
    actor: Annotated[User | None, Depends(get_camp_actor)],
    master_id: str | None = None,
    member_id: str | None = None,
) -> list[dict[str, Any]]:
    return service().apprenticeships(master_id=master_id, member_id=member_id)


@router.get(
    "/pastoral-confirmations",
    response_model=list[dict[str, Any]],
    responses=ERRORS,
)
async def list_pastoral_confirmations(
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> list[dict[str, Any]]:
    return service().pastoral_confirmations()


@router.post(
    "/pastoral-confirmations/{confirmation_id}/confirm",
    response_model=dict[str, Any],
    responses=ERRORS,
)
async def confirm_standing(
    confirmation_id: str,
    data: CampConfirmationRequest,
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> dict[str, Any]:
    return service().confirm_standing(confirmation_id, note=data.note)


@router.get("/generosity", response_model=list[dict[str, Any]], responses=ERRORS)
async def list_generosity(
    actor: Annotated[User | None, Depends(get_camp_actor)],
    actor_id: str | None = None,
) -> list[dict[str, Any]]:
    return service().generosity(actor_id=actor_id)


@router.get("/stewards-fund", response_model=dict[str, Any], responses=ERRORS)
async def get_stewards_fund(
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> dict[str, Any]:
    return service().stewards_fund()


@router.post("/vouch-requests", response_model=dict[str, Any], responses=ERRORS)
async def request_vouch(
    data: CampVouchRequestCreate,
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> dict[str, Any]:
    return service().request_vouch(artisan_id=data.artisan_id)


@router.post(
    "/vouch-requests/{request_id}/confirm",
    response_model=dict[str, Any],
    responses=ERRORS,
)
async def confirm_vouch(
    request_id: str,
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> dict[str, Any]:
    return service().confirm_vouch(request_id)


@router.post(
    "/mentor-enrollments",
    response_model=dict[str, Any],
    responses=ERRORS,
)
async def enroll_mentor(
    data: CampMentorEnrollmentCreate,
    actor: Annotated[User | None, Depends(get_camp_actor)],
) -> dict[str, Any]:
    return service().enroll_mentor(artisan_id=data.artisan_id, trade=data.trade)
