from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.presenters import present_user
from app.core.config import settings
from app.core.security import verify_demo_mfa_code
from app.db.session import AsyncSessionLocal, get_db_session
from app.models.enums import CampRole, UserRole
from app.models.user import User
from app.schemas.auth import RefreshTokenRequest, TokenPair
from app.schemas.errors import ErrorResponse
from app.schemas.user import UserResponse
from app.services.auth import AuthenticationError, AuthenticationService

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
    mfa_code: Annotated[str | None, Header(alias="X-MFA-Code")] = None,
) -> TokenPair:
    if verify_demo_mfa_code(mfa_code):
        return await AuthenticationService(
            session
        ).authenticate_and_issue_tokens(
            form.username,
            form.password,
            mfa_verified=True,
        )
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
    summary="Return the authenticated user or env-gated Camp demo profile",
)
async def current_user(
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    demo_role: str | None = None,
    demo_role_header: Annotated[str | None, Header(alias="X-Camp-Demo-Role")] = None,
) -> UserResponse:
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", maxsplit=1)[1].strip()
        async with AsyncSessionLocal() as session:
            user = await AuthenticationService(session).resolve_access_token(token)
        return present_user(user)
    if settings.camp_mock_auth_bypass:
        return mock_camp_user_response(demo_role_header or demo_role)
    raise AuthenticationError("Invalid authentication credentials")


def mock_camp_user_response(profile: str | None = None) -> UserResponse:
    selected = (profile or settings.camp_mock_default_profile).strip().lower()
    if selected not in MOCK_CAMP_PROFILES:
        selected = settings.camp_mock_default_profile
    return UserResponse(**MOCK_CAMP_PROFILES[selected])


MOCK_CAMP_PROFILES = {
    "member": {
        "id": UUID("11111111-1111-4111-8111-111111111111"),
        "name": "Bisi Oladipo",
        "email": "bisi@camp.rccg",
        "role": UserRole.OFFICER,
        "parish_id": "parish-camp-mowe",
        "camp_role": CampRole.MEMBER,
        "member_id": "member-funmi",
        "artisan_id": None,
        "active_job_id": None,
        "mfa_enabled": False,
        "is_active": True,
        "created_at": "2026-06-01T00:00:00+00:00",
        "updated_at": "2026-06-23T00:00:00+00:00",
    },
    "artisan": {
        "id": UUID("22222222-2222-4222-8222-222222222222"),
        "name": "Tunde Akinwale",
        "email": "tunde@camp.rccg",
        "role": UserRole.ARTISAN,
        "parish_id": "parish-camp-mowe",
        "camp_role": CampRole.ARTISAN,
        "member_id": None,
        "artisan_id": "artisan-tunde-akinwale",
        "active_job_id": "job-hero-generator",
        "mfa_enabled": False,
        "is_active": True,
        "created_at": "2026-06-01T00:00:00+00:00",
        "updated_at": "2026-06-23T00:00:00+00:00",
    },
    "pastor": {
        "id": UUID("33333333-3333-4333-8333-333333333333"),
        "name": "Pastor Adekunle Olatunde",
        "email": "pastor@camp.rccg",
        "role": UserRole.PASTOR,
        "parish_id": "parish-camp-mowe",
        "camp_role": CampRole.PASTOR,
        "member_id": None,
        "artisan_id": None,
        "active_job_id": None,
        "mfa_enabled": False,
        "is_active": True,
        "created_at": "2026-06-01T00:00:00+00:00",
        "updated_at": "2026-06-23T00:00:00+00:00",
    },
    "camp_admin": {
        "id": UUID("44444444-4444-4444-8444-444444444444"),
        "name": "Camp Admin",
        "email": "admin@camp.rccg",
        "role": UserRole.CAMP_ADMIN,
        "parish_id": "parish-camp-mowe",
        "camp_role": CampRole.CAMP_ADMIN,
        "member_id": None,
        "artisan_id": None,
        "active_job_id": None,
        "mfa_enabled": False,
        "is_active": True,
        "created_at": "2026-06-01T00:00:00+00:00",
        "updated_at": "2026-06-23T00:00:00+00:00",
    },
}
