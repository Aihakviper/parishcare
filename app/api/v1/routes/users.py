from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import require_permissions
from app.api.presenters import present_user
from app.core.rbac import Permission
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.errors import ErrorResponse
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.user import UserService

router = APIRouter(prefix="/users")

MUTATION_RESPONSES = {
    401: {"model": ErrorResponse},
    403: {"model": ErrorResponse},
    404: {"model": ErrorResponse},
    409: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
}


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    responses=MUTATION_RESPONSES,
    summary="Create a user",
)
async def create_user(
    data: UserCreate,
    actor: Annotated[
        User,
        Depends(require_permissions(Permission.USER_CREATE)),
    ],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> UserResponse:
    user = await UserService(session).create(actor=actor, data=data)
    return present_user(user)


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    responses=MUTATION_RESPONSES,
    summary="Update a user",
)
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    actor: Annotated[
        User,
        Depends(require_permissions(Permission.USER_UPDATE)),
    ],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> UserResponse:
    user = await UserService(session).update(
        actor=actor,
        user_id=user_id,
        data=data,
    )
    return present_user(user)
