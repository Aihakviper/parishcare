from datetime import datetime, timedelta, timezone
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

import jwt
from jwt import InvalidTokenError
from pwdlib import PasswordHash

from app.core.config import Settings, settings
from app.models.enums import UserRole
from app.schemas.auth import TokenClaims, TokenPair

password_hasher = PasswordHash.recommended()
DUMMY_PASSWORD_HASH = password_hasher.hash("parishcare-dummy-password")


class TokenType(StrEnum):
    ACCESS = "access"
    REFRESH = "refresh"


class TokenValidationError(ValueError):
    """Raised when a JWT is invalid or has the wrong token type."""


def hash_password(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password must contain at least 8 characters")
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)


def _create_token(
    *,
    subject: UUID,
    role: UserRole,
    token_type: TokenType,
    expires_delta: timedelta,
    config: Settings = settings,
) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role.value,
        "type": token_type.value,
        "jti": str(uuid4()),
        "iat": now,
        "exp": now + expires_delta,
        "iss": config.jwt_issuer,
        "aud": config.jwt_audience,
    }
    return jwt.encode(
        payload,
        config.jwt_secret_key,
        algorithm=config.jwt_algorithm,
    )


def create_token_pair(
    *,
    subject: UUID,
    role: UserRole,
    config: Settings = settings,
) -> TokenPair:
    return TokenPair(
        access_token=_create_token(
            subject=subject,
            role=role,
            token_type=TokenType.ACCESS,
            expires_delta=timedelta(
                minutes=config.access_token_expire_minutes
            ),
            config=config,
        ),
        refresh_token=_create_token(
            subject=subject,
            role=role,
            token_type=TokenType.REFRESH,
            expires_delta=timedelta(days=config.refresh_token_expire_days),
            config=config,
        ),
        expires_in=config.access_token_expire_minutes * 60,
    )


def decode_token(
    token: str,
    *,
    expected_type: TokenType,
    config: Settings = settings,
) -> TokenClaims:
    try:
        payload = jwt.decode(
            token,
            config.jwt_secret_key,
            algorithms=[config.jwt_algorithm],
            issuer=config.jwt_issuer,
            audience=config.jwt_audience,
            options={
                "require": [
                    "sub",
                    "role",
                    "type",
                    "jti",
                    "iat",
                    "exp",
                    "iss",
                    "aud",
                ]
            },
        )
        claims = TokenClaims.model_validate(payload)
    except (InvalidTokenError, ValueError) as exc:
        raise TokenValidationError("Invalid or expired token") from exc

    if claims.type != expected_type:
        raise TokenValidationError(
            f"Expected a {expected_type.value} token"
        )
    return claims
