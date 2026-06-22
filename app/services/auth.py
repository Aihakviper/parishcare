from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, settings
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    TokenType,
    TokenValidationError,
    create_token_pair,
    decode_token,
    verify_password,
)
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.auth import TokenPair
from app.utils.crypto import LookupHasher, normalize_email


class AuthenticationError(ValueError):
    """Raised for invalid credentials or inactive accounts."""


class MFARequiredError(AuthenticationError):
    """Raised when an MFA-enabled user has not completed MFA."""


PAYMENT_CAPABLE_ROLES = {UserRole.OFFICER, UserRole.PASTOR}


class AuthenticationService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        config: Settings = settings,
    ) -> None:
        self._session = session
        self._config = config
        self._lookup_hasher = LookupHasher(config.pii_lookup_key)

    async def authenticate(self, email: str, password: str) -> User:
        try:
            user = await self._find_user_by_email(email)
        except ValueError:
            verify_password(password, DUMMY_PASSWORD_HASH)
            raise AuthenticationError("Invalid email or password") from None
        password_hash = (
            user.password_hash if user is not None else DUMMY_PASSWORD_HASH
        )
        password_is_valid = verify_password(password, password_hash)
        if (
            user is None
            or not user.is_active
            or user.deleted_at is not None
            or not password_is_valid
        ):
            raise AuthenticationError("Invalid email or password")
        return user

    async def issue_tokens(
        self,
        user: User,
        *,
        mfa_verified: bool = False,
    ) -> TokenPair:
        if not user.is_active or user.deleted_at is not None:
            raise AuthenticationError("User account is inactive")
        if (
            user.role in PAYMENT_CAPABLE_ROLES
            and user.mfa_enabled
            and not mfa_verified
        ):
            raise MFARequiredError("MFA verification is required")
        return create_token_pair(
            subject=user.id,
            role=user.role,
            config=self._config,
        )

    async def authenticate_and_issue_tokens(
        self,
        email: str,
        password: str,
        *,
        mfa_verified: bool = False,
    ) -> TokenPair:
        user = await self.authenticate(email, password)
        return await self.issue_tokens(user, mfa_verified=mfa_verified)

    async def refresh(self, refresh_token: str) -> TokenPair:
        try:
            claims = decode_token(
                refresh_token,
                expected_type=TokenType.REFRESH,
                config=self._config,
            )
        except TokenValidationError as exc:
            raise AuthenticationError("Invalid refresh token") from exc

        user = await self._find_active_user_by_id(claims.sub)
        if user is None:
            raise AuthenticationError("Invalid refresh token")
        return create_token_pair(
            subject=user.id,
            role=user.role,
            config=self._config,
        )

    async def resolve_access_token(self, access_token: str) -> User:
        try:
            claims = decode_token(
                access_token,
                expected_type=TokenType.ACCESS,
                config=self._config,
            )
        except TokenValidationError as exc:
            raise AuthenticationError("Invalid access token") from exc

        user = await self._find_active_user_by_id(claims.sub)
        if user is None or user.role != claims.role:
            raise AuthenticationError("Invalid access token")
        return user

    async def _find_user_by_email(self, email: str) -> User | None:
        email_hash = self._lookup_hasher.digest(normalize_email(email))
        result = await self._session.execute(
            select(User).where(User.email_hash == email_hash)
        )
        return result.scalar_one_or_none()

    async def _find_active_user_by_id(self, user_id: UUID) -> User | None:
        result = await self._session.execute(
            select(User).where(
                User.id == user_id,
                User.is_active.is_(True),
                User.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()
