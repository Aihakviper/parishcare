from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import require_permissions
from app.api.presenters import present_beneficiary
from app.core.rbac import Permission
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.beneficiary import (
    BeneficiaryCreate,
    BeneficiaryLookupRequest,
    BeneficiaryLookupResponse,
    BeneficiaryResponse,
    BeneficiaryRegistrationResponse,
)
from app.schemas.errors import ErrorResponse
from app.services.beneficiary import BeneficiaryService

router = APIRouter(prefix="/beneficiaries")

ERROR_RESPONSES = {
    401: {"model": ErrorResponse},
    403: {"model": ErrorResponse},
    404: {"model": ErrorResponse},
    409: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
}


@router.get(
    "/{beneficiary_id}",
    response_model=BeneficiaryResponse,
    responses=ERROR_RESPONSES,
    summary="Get a parish-scoped beneficiary",
)
async def get_beneficiary(
    beneficiary_id: UUID,
    actor: Annotated[
        User,
        Depends(require_permissions(Permission.BENEFICIARY_LOOKUP)),
    ],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> BeneficiaryResponse:
    beneficiary = await BeneficiaryService(session).get(
        actor=actor,
        beneficiary_id=beneficiary_id,
    )
    return present_beneficiary(beneficiary)


@router.post(
    "",
    response_model=BeneficiaryRegistrationResponse,
    status_code=status.HTTP_201_CREATED,
    responses=ERROR_RESPONSES,
    summary="Register a beneficiary",
)
async def register_beneficiary(
    data: BeneficiaryCreate,
    actor: Annotated[
        User,
        Depends(require_permissions(Permission.BENEFICIARY_CREATE)),
    ],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> BeneficiaryRegistrationResponse:
    result = await BeneficiaryService(session).register(
        actor=actor,
        data=data,
    )
    return BeneficiaryRegistrationResponse(
        beneficiary=present_beneficiary(result.beneficiary),
        possible_duplicate=result.possible_duplicate_count > 0,
        possible_duplicate_count=result.possible_duplicate_count,
    )


@router.post(
    "/lookup",
    response_model=BeneficiaryLookupResponse,
    responses=ERROR_RESPONSES,
    summary="Look up a beneficiary by phone",
)
async def lookup_beneficiary(
    data: BeneficiaryLookupRequest,
    actor: Annotated[
        User,
        Depends(require_permissions(Permission.BENEFICIARY_LOOKUP)),
    ],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> BeneficiaryLookupResponse:
    result = await BeneficiaryService(session).lookup(
        actor=actor,
        phone=data.phone,
    )
    if result.outcome == "match" and result.beneficiary is not None:
        return BeneficiaryLookupResponse(
            outcome="match",
            beneficiary=present_beneficiary(result.beneficiary),
            verification_status=result.verification_status,
            message="Beneficiary found in the actor's parish",
        )
    if result.outcome == "restricted_match":
        return BeneficiaryLookupResponse(
            outcome="restricted_match",
            verification_status=result.verification_status,
            message=(
                "A beneficiary match exists outside the actor's parish; "
                "identity details are restricted"
            ),
        )
    return BeneficiaryLookupResponse(
        outcome="none",
        message="No beneficiary match found",
    )
