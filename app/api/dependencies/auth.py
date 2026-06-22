from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Permission, ROLE_PERMISSIONS
from app.db.session import get_db_session
from app.models.enums import UserRole
from app.models.user import User
from app.services.auth import AuthenticationError, AuthenticationService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    try:
        return await AuthenticationService(session).resolve_access_token(token)
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def require_roles(
    *allowed_roles: UserRole,
) -> Callable[..., User]:
    allowed = frozenset(allowed_roles)

    async def dependency(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return dependency


def require_permissions(
    *required_permissions: Permission,
) -> Callable[..., User]:
    required = frozenset(required_permissions)

    async def dependency(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if not required.issubset(ROLE_PERMISSIONS[current_user.role]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return dependency
