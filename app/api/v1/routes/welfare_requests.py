from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import require_permissions
from app.api.presenters import present_welfare_request
from app.core.rbac import Permission
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.errors import ErrorResponse
from app.schemas.welfare_request import (
    WelfareRequestCreate,
    WelfareRequestResponse,
    WelfareRequestTransition,
    WelfareRiskReview,
)
from app.services.welfare_request import WelfareRequestService

router = APIRouter(prefix="/welfare-requests")

ERROR_RESPONSES = {
    401: {"model": ErrorResponse},
    403: {"model": ErrorResponse},
    404: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
}


@router.post(
    "",
    response_model=WelfareRequestResponse,
    status_code=status.HTTP_201_CREATED,
    responses=ERROR_RESPONSES,
    summary="Create and score a welfare request",
)
async def create_welfare_request(
    data: WelfareRequestCreate,
    actor: Annotated[
        User,
        Depends(require_permissions(Permission.WELFARE_REQUEST_CREATE)),
    ],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> WelfareRequestResponse:
    request = await WelfareRequestService(session).create(
        actor=actor,
        data=data,
    )
    return present_welfare_request(request)


@router.get(
    "/{request_id}",
    response_model=WelfareRequestResponse,
    responses=ERROR_RESPONSES,
    summary="Get a parish-scoped welfare request",
)
async def get_welfare_request(
    request_id: UUID,
    actor: Annotated[
        User,
        Depends(require_permissions(Permission.WELFARE_REQUEST_VIEW)),
    ],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> WelfareRequestResponse:
    request = await WelfareRequestService(session).get(
        actor=actor,
        request_id=request_id,
    )
    return present_welfare_request(request)


@router.post(
    "/{request_id}/transition",
    response_model=WelfareRequestResponse,
    responses=ERROR_RESPONSES,
    summary="Apply a legal welfare request status transition",
)
async def transition_welfare_request(
    request_id: UUID,
    data: WelfareRequestTransition,
    actor: Annotated[
        User,
        Depends(require_permissions(Permission.WELFARE_REQUEST_TRANSITION)),
    ],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> WelfareRequestResponse:
    request = await WelfareRequestService(session).transition(
        actor=actor,
        request_id=request_id,
        data=data,
    )
    return present_welfare_request(request)


@router.post(
    "/{request_id}/risk-review",
    response_model=WelfareRequestResponse,
    responses=ERROR_RESPONSES,
    summary="Clear anti-fraud flags after a documented pastor review",
)
async def review_welfare_request_risk(
    request_id: UUID,
    data: WelfareRiskReview,
    actor: Annotated[
        User,
        Depends(require_permissions(Permission.WELFARE_REQUEST_RISK_REVIEW)),
    ],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> WelfareRequestResponse:
    request = await WelfareRequestService(session).clear_risk_flags(
        actor=actor,
        request_id=request_id,
        data=data,
    )
    return present_welfare_request(request)
