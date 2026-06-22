from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.core.security import (
    TokenType,
    TokenValidationError,
    create_token_pair,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.enums import UserRole
from tests.settings import build_test_settings


def test_settings_require_environment_configuration(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    for field_name in Settings.model_fields:
        monkeypatch.delenv(f"PARISHCARE_{field_name.upper()}", raising=False)

    with pytest.raises(ValidationError, match="Field required"):
        Settings(_env_file=None)


def test_argon2_password_hashing() -> None:
    password_hash = hash_password("correct horse battery staple")

    assert password_hash.startswith("$argon2")
    assert verify_password("correct horse battery staple", password_hash)
    assert not verify_password("wrong password", password_hash)


def test_password_minimum_length() -> None:
    with pytest.raises(ValueError):
        hash_password("short")


def test_create_and_decode_token_pair() -> None:
    config = build_test_settings()
    user_id = uuid4()

    tokens = create_token_pair(
        subject=user_id,
        role=UserRole.HQ,
        config=config,
    )
    access_claims = decode_token(
        tokens.access_token,
        expected_type=TokenType.ACCESS,
        config=config,
    )
    refresh_claims = decode_token(
        tokens.refresh_token,
        expected_type=TokenType.REFRESH,
        config=config,
    )

    assert access_claims.sub == user_id
    assert access_claims.role == UserRole.HQ
    assert access_claims.type == "access"
    assert refresh_claims.type == "refresh"
    assert access_claims.jti != refresh_claims.jti


def test_decode_rejects_wrong_token_type() -> None:
    config = build_test_settings()
    tokens = create_token_pair(
        subject=uuid4(),
        role=UserRole.AUDITOR,
        config=config,
    )

    with pytest.raises(TokenValidationError):
        decode_token(
            tokens.access_token,
            expected_type=TokenType.REFRESH,
            config=config,
        )


def test_settings_reject_invalid_encryption_key() -> None:
    with pytest.raises(ValueError, match="exactly 32 bytes"):
        build_test_settings(pii_encryption_key="dG9vLXNob3J0")
