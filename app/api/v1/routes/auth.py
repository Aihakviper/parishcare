from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.api.presenters import present_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.auth import RefreshTokenRequest, TokenPair
from app.schemas.errors import ErrorResponse
from app.schemas.user import UserResponse
from app.services.auth import AuthenticationService

router = APIRouter(prefix="/auth")

ERROR_RESPONSES = {
    401: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
    428: {"model": ErrorResponse},
}


@router.post(
    "/login",
    response_model=TokenPair,
    responses=ERROR_RESPONSES,
    summary="Authenticate and issue access and refresh tokens",
)
async def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> TokenPair:
    return await AuthenticationService(session).authenticate_and_issue_tokens(
        form.username,
        form.password,
    )


@router.post(
    "/refresh",
    response_model=TokenPair,
    responses={401: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
    summary="Exchange a refresh token for a new token pair",
)
async def refresh_tokens(
    data: RefreshTokenRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> TokenPair:
    return await AuthenticationService(session).refresh(data.refresh_token)


@router.get(
    "/me",
    response_model=UserResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Return the authenticated user",
)
async def current_user(
    user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    return present_user(user)
