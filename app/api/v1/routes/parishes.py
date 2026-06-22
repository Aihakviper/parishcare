from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import require_permissions
from app.api.presenters import present_parish
from app.core.rbac import Permission
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.errors import ErrorResponse
from app.schemas.parish import ParishCreate, ParishResponse, ParishUpdate
from app.services.parish import ParishService

router = APIRouter(prefix="/parishes")

MUTATION_RESPONSES = {
    401: {"model": ErrorResponse},
    403: {"model": ErrorResponse},
    404: {"model": ErrorResponse},
    409: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
}


@router.post(
    "",
    response_model=ParishResponse,
    status_code=status.HTTP_201_CREATED,
    responses=MUTATION_RESPONSES,
    summary="Create a parish",
)
async def create_parish(
    data: ParishCreate,
    actor: Annotated[
        User,
        Depends(require_permissions(Permission.PARISH_CREATE)),
    ],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ParishResponse:
    parish = await ParishService(session).create(actor=actor, data=data)
    return present_parish(parish)


@router.patch(
    "/{parish_id}",
    response_model=ParishResponse,
    responses=MUTATION_RESPONSES,
    summary="Update a parish",
)
async def update_parish(
    parish_id: UUID,
    data: ParishUpdate,
    actor: Annotated[
        User,
        Depends(require_permissions(Permission.PARISH_UPDATE)),
    ],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ParishResponse:
    parish = await ParishService(session).update(
        actor=actor,
        parish_id=parish_id,
        data=data,
    )
    return present_parish(parish)
