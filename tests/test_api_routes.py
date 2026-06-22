from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db_session
from app.main import app
from app.models.enums import UserRole
from app.models.beneficiary import Beneficiary
from app.models.parish import Parish
from app.models.user import User
from app.schemas.auth import TokenPair
from app.services.auth import MFARequiredError
from app.services.errors import ResourceConflictError
from app.services.beneficiary import (
    BeneficiaryLookupResult,
    BeneficiaryRegistrationResult,
)
from app.utils.crypto import PIICipher

client = TestClient(app)


def build_actor(role: UserRole, parish_id=None) -> User:
    return User(
        id=uuid4(),
        name_encrypted="encrypted-name",
        email_encrypted="encrypted-email",
        email_hash="a" * 64,
        password_hash="password-hash",
        role=role,
        parish_id=parish_id,
        mfa_enabled=True,
        is_active=True,
    )


async def override_session():
    yield MagicMock()


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    app.dependency_overrides[get_db_session] = override_session
    yield
    app.dependency_overrides.clear()


def test_openapi_exposes_auth_and_management_routes() -> None:
    response = client.get("/api/v1/openapi.json")
    paths = response.json()["paths"]

    assert "/api/v1/auth/login" in paths
    assert "/api/v1/auth/refresh" in paths
    assert "/api/v1/auth/me" in paths
    assert "/api/v1/beneficiaries" in paths
    assert "/api/v1/beneficiaries/lookup" in paths
    assert "/api/v1/parishes" in paths
    assert "/api/v1/parishes/{parish_id}" in paths
    assert "/api/v1/users" in paths
    assert "/api/v1/users/{user_id}" in paths


def test_login_returns_token_pair() -> None:
    tokens = TokenPair(
        access_token="access-token",
        refresh_token="refresh-token",
        expires_in=900,
    )
    with patch(
        "app.api.v1.routes.auth.AuthenticationService."
        "authenticate_and_issue_tokens",
        new=AsyncMock(return_value=tokens),
    ) as authenticate:
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "admin@example.com",
                "password": "strong-password",
            },
        )

    assert response.status_code == 200
    assert response.json()["access_token"] == "access-token"
    authenticate.assert_awaited_once_with(
        "admin@example.com",
        "strong-password",
    )


def test_login_maps_mfa_required_consistently() -> None:
    with patch(
        "app.api.v1.routes.auth.AuthenticationService."
        "authenticate_and_issue_tokens",
        new=AsyncMock(side_effect=MFARequiredError("MFA verification is required")),
    ):
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "officer@example.com",
                "password": "strong-password",
            },
        )

    assert response.status_code == 428
    assert response.json()["error"]["code"] == "mfa_required"


def test_missing_bearer_token_uses_consistent_error_shape() -> None:
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "authentication_failed"


def test_hq_creates_parish_route() -> None:
    app.dependency_overrides[get_current_user] = lambda: build_actor(UserRole.HQ)
    cipher = PIICipher(settings.pii_encryption_key)
    now = datetime.now(timezone.utc)
    parish = Parish(
        id=uuid4(),
        name="St. Peter Parish",
        region="Lagos",
        address="1 Church Road",
        contact_name_encrypted=cipher.encrypt(
            "Secretary",
            context="parishes.contact_name",
        ),
        contact_phone_encrypted=cipher.encrypt(
            "+2348012345678",
            context="parishes.contact_phone",
        ),
        contact_phone_hash="b" * 64,
        created_at=now,
        updated_at=now,
    )
    with patch(
        "app.api.v1.routes.parishes.ParishService.create",
        new=AsyncMock(return_value=parish),
    ):
        response = client.post(
            "/api/v1/parishes",
            json={
                "name": "St. Peter Parish",
                "region": "Lagos",
                "address": "1 Church Road",
                "contact_name": "Secretary",
                "contact_phone": "+234 801-234-5678",
            },
        )

    assert response.status_code == 201
    assert response.json()["contact_phone"] == "+2348012345678"


def test_officer_cannot_create_parish() -> None:
    app.dependency_overrides[get_current_user] = lambda: build_actor(
        UserRole.OFFICER,
        uuid4(),
    )

    response = client.post(
        "/api/v1/parishes",
        json={
            "name": "St. Peter Parish",
            "region": "Lagos",
            "contact_name": "Secretary",
            "contact_phone": "+2348012345678",
        },
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


def test_user_conflict_uses_consistent_error_shape() -> None:
    app.dependency_overrides[get_current_user] = lambda: build_actor(UserRole.HQ)
    with patch(
        "app.api.v1.routes.users.UserService.create",
        new=AsyncMock(
            side_effect=ResourceConflictError("User email already exists")
        ),
    ):
        response = client.post(
            "/api/v1/users",
            json={
                "name": "HQ User",
                "email": "hq@example.com",
                "password": "strong-password",
                "role": "hq",
                "parish_id": None,
                "mfa_enabled": False,
            },
        )

    assert response.status_code == 409
    assert response.json()["error"] == {
        "code": "conflict",
        "message": "User email already exists",
        "details": None,
    }


def test_request_validation_uses_consistent_error_shape() -> None:
    app.dependency_overrides[get_current_user] = lambda: build_actor(UserRole.HQ)

    response = client.post(
        "/api/v1/parishes",
        json={"name": "x"},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert response.json()["error"]["details"]


def test_register_beneficiary_route_returns_duplicate_warning() -> None:
    parish_id = uuid4()
    actor = build_actor(UserRole.OFFICER, parish_id)
    app.dependency_overrides[get_current_user] = lambda: actor
    cipher = PIICipher(settings.pii_encryption_key)
    now = datetime.now(timezone.utc)
    beneficiary = Beneficiary(
        id=uuid4(),
        name_encrypted=cipher.encrypt(
            "Amina Ibrahim",
            context="beneficiaries.name",
        ),
        name_normalised="amina ibrahim",
        phone_encrypted=cipher.encrypt(
            "+2348012345678",
            context="beneficiaries.phone",
        ),
        phone_hash="c" * 64,
        home_parish_id=parish_id,
        dependents_count=2,
        verification_status="unverified",
        created_at=now,
        updated_at=now,
    )
    with patch(
        "app.api.v1.routes.beneficiaries.BeneficiaryService.register",
        new=AsyncMock(
            return_value=BeneficiaryRegistrationResult(
                beneficiary=beneficiary,
                possible_duplicate_count=1,
            )
        ),
    ):
        response = client.post(
            "/api/v1/beneficiaries",
            json={
                "name": "Amina Ibrahim",
                "phone": "+234 801-234-5678",
                "home_parish_id": str(parish_id),
                "dependents_count": 2,
            },
        )

    assert response.status_code == 201
    assert response.json()["possible_duplicate"] is True
    assert response.json()["beneficiary"]["phone"] == "+2348012345678"


def test_cross_parish_lookup_route_returns_no_identity() -> None:
    app.dependency_overrides[get_current_user] = lambda: build_actor(
        UserRole.OFFICER,
        uuid4(),
    )
    with patch(
        "app.api.v1.routes.beneficiaries.BeneficiaryService.lookup",
        new=AsyncMock(
            return_value=BeneficiaryLookupResult(
                outcome="restricted_match",
                beneficiary=None,
                verification_status="verified",
            )
        ),
    ):
        response = client.post(
            "/api/v1/beneficiaries/lookup",
            json={"phone": "+2348012345678"},
        )

    assert response.status_code == 200
    assert response.json()["outcome"] == "restricted_match"
    assert response.json()["beneficiary"] is None
