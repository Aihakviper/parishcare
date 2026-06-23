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
from app.models.disbursement import Disbursement
from app.models.parish import Parish
from app.models.user import User
from app.models.welfare_request import WelfareRequest
from app.models.verification import VerificationRequest, VerificationVoucher
from app.schemas.auth import TokenPair
from app.services.auth import MFARequiredError
from app.services.errors import ResourceConflictError
from app.services.beneficiary import (
    BeneficiaryLookupResult,
    BeneficiaryRegistrationResult,
)
from app.models.enums import (
    PriorityBand,
    PaymentMethod,
    SettlementStatus,
    VerificationStatus,
    WelfareRequestStatus,
    WelfareRequestType,
    VerificationChannel,
    VerificationOutcome,
)
from app.services.verification import (
    VerificationResponseResult,
    VerificationStartResult,
)
from app.services.whatsapp import WhatsAppCommand
from app.services.disbursement import DisbursementResult
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
    assert "/api/v1/welfare-requests" in paths
    assert "/api/v1/welfare-requests/{request_id}" in paths
    assert "/api/v1/welfare-requests/{request_id}/transition" in paths
    assert "/api/v1/welfare-requests/{request_id}/risk-review" in paths
    assert "/api/v1/welfare-requests/{request_id}/verify" in paths
    assert "/api/v1/verification-vouchers/respond" in paths
    assert "/api/v1/disbursements" in paths
    assert "/api/v1/artisans/profile" in paths
    assert "/api/v1/jobs" in paths
    assert "/api/v1/jobs/{job_id}" in paths
    assert "/api/v1/jobs/{job_id}/quote" in paths
    assert "/api/v1/jobs/{job_id}/transition" in paths
    assert "/api/v1/jobs/{job_id}/escrow/fund" in paths
    assert "/api/v1/jobs/{job_id}/escrow/release" in paths
    assert "/api/v1/jobs/{job_id}/reviews" in paths
    assert "/api/v1/jobs/{job_id}/disputes" in paths
    assert "/api/v1/disputes/{dispute_id}/resolve" in paths
    assert "/api/v1/public/artisans" in paths
    assert "/api/v1/public/artisans/{artisan_id}" in paths
    assert "/api/v1/public/jobs/feed" in paths


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


def test_login_accepts_environment_verified_demo_mfa_code() -> None:
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
            headers={"X-MFA-Code": "246810"},
            data={
                "username": "officer@example.com",
                "password": "strong-password",
            },
        )

    assert response.status_code == 200
    authenticate.assert_awaited_once_with(
        "officer@example.com",
        "strong-password",
        mfa_verified=True,
    )


def test_missing_bearer_token_uses_consistent_error_shape() -> None:
    original = settings.camp_mock_auth_bypass
    settings.camp_mock_auth_bypass = False
    try:
        response = client.get("/api/v1/auth/me")
    finally:
        settings.camp_mock_auth_bypass = original

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


def build_welfare_request(parish_id) -> WelfareRequest:
    cipher = PIICipher(settings.pii_encryption_key)
    now = datetime.now(timezone.utc)
    return WelfareRequest(
        id=uuid4(),
        beneficiary_id=uuid4(),
        created_by=uuid4(),
        request_type=WelfareRequestType.MEDICAL,
        amount_requested_kobo=1_500_000,
        reason_encrypted=cipher.encrypt(
            "Urgent surgery and hospital treatment required",
            context="welfare_requests.reason",
        ),
        is_urgent=True,
        deadline_at=now.replace(microsecond=0),
        status=WelfareRequestStatus.PENDING,
        priority_score=60,
        priority_band=PriorityBand.MEDIUM,
        scoring_version="v1",
        score_breakdown={
            "version": "v1",
            "factors": {"need_severity": 30},
        },
        risk_flags=[
            {"code": "recent_support", "severity": "high"},
        ],
        created_at=now,
        updated_at=now,
    )


def test_create_welfare_request_returns_score_and_risk_flags() -> None:
    parish_id = uuid4()
    app.dependency_overrides[get_current_user] = lambda: build_actor(
        UserRole.OFFICER,
        parish_id,
    )
    request = build_welfare_request(parish_id)
    with patch(
        "app.api.v1.routes.welfare_requests.WelfareRequestService.create",
        new=AsyncMock(return_value=request),
    ):
        response = client.post(
            "/api/v1/welfare-requests",
            json={
                "beneficiary_id": str(request.beneficiary_id),
                "request_type": "medical",
                "amount_requested_kobo": 1_500_000,
                "reason": "Urgent surgery and hospital treatment required",
                "is_urgent": True,
            },
        )

    assert response.status_code == 201
    assert response.json()["amount_requested_kobo"] == 1_500_000
    assert response.json()["priority_score"] == 60
    assert response.json()["risk_flags"][0]["code"] == "recent_support"


def test_welfare_request_amount_rejects_float() -> None:
    parish_id = uuid4()
    app.dependency_overrides[get_current_user] = lambda: build_actor(
        UserRole.OFFICER,
        parish_id,
    )

    response = client.post(
        "/api/v1/welfare-requests",
        json={
            "beneficiary_id": str(uuid4()),
            "request_type": "food",
            "amount_requested_kobo": 1500.50,
            "reason": "Emergency household food support required",
            "is_urgent": False,
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_welfare_request_amount_rejects_numeric_string() -> None:
    parish_id = uuid4()
    app.dependency_overrides[get_current_user] = lambda: build_actor(
        UserRole.OFFICER,
        parish_id,
    )

    response = client.post(
        "/api/v1/welfare-requests",
        json={
            "beneficiary_id": str(uuid4()),
            "request_type": "food",
            "amount_requested_kobo": "150000",
            "reason": "Emergency household food support required",
            "is_urgent": False,
        },
    )

    assert response.status_code == 422


def test_officer_cannot_clear_welfare_risk_flags() -> None:
    parish_id = uuid4()
    app.dependency_overrides[get_current_user] = lambda: build_actor(
        UserRole.OFFICER,
        parish_id,
    )

    response = client.post(
        f"/api/v1/welfare-requests/{uuid4()}/risk-review",
        json={
            "reason": "Supporting documents reviewed with parish committee"
        },
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


def test_start_verification_returns_mock_token_once() -> None:
    parish_id = uuid4()
    app.dependency_overrides[get_current_user] = lambda: build_actor(
        UserRole.OFFICER,
        parish_id,
    )
    request = build_welfare_request(parish_id)
    beneficiary = Beneficiary(
        id=request.beneficiary_id,
        name_encrypted="encrypted-name",
        name_normalised="amina ibrahim",
        phone_encrypted="encrypted-phone",
        phone_hash="d" * 64,
        home_parish_id=parish_id,
        dependents_count=2,
        verification_status=VerificationStatus.PENDING,
    )
    now = datetime.now(timezone.utc)
    verification_request = VerificationRequest(
        id=uuid4(),
        welfare_request_id=request.id,
        sent_to_phone_encrypted="encrypted-phone",
        sent_to_parish_id=parish_id,
    )
    voucher = VerificationVoucher(
        id=uuid4(),
        verification_request_id=verification_request.id,
        token_hash="e" * 64,
        channel=VerificationChannel.MOCK,
        issued_at=now,
        expires_at=now.replace(microsecond=0),
    )
    with patch(
        "app.api.v1.routes.verification.VerificationService.start",
        new=AsyncMock(
            return_value=VerificationStartResult(
                mode="voucher_issued",
                welfare_request=request,
                beneficiary=beneficiary,
                verification_request=verification_request,
                voucher=voucher,
                raw_token="signed-token",
            )
        ),
    ):
        response = client.post(
            f"/api/v1/welfare-requests/{request.id}/verify"
        )

    assert response.status_code == 200
    assert response.json()["mode"] == "voucher_issued"
    assert response.json()["voucher_token"] == "signed-token"


def test_public_voucher_confirmation_response() -> None:
    parish_id = uuid4()
    request = build_welfare_request(parish_id)
    request.status = WelfareRequestStatus.VERIFIED
    beneficiary = Beneficiary(
        id=request.beneficiary_id,
        name_encrypted="encrypted-name",
        name_normalised="amina ibrahim",
        phone_encrypted="encrypted-phone",
        phone_hash="f" * 64,
        home_parish_id=parish_id,
        dependents_count=2,
        verification_status=VerificationStatus.VERIFIED,
    )
    now = datetime.now(timezone.utc)
    verification_request = VerificationRequest(
        id=uuid4(),
        welfare_request_id=request.id,
        sent_to_phone_encrypted="encrypted-phone",
        sent_to_parish_id=parish_id,
        outcome=VerificationOutcome.CONFIRMED,
        responded_at=now,
    )
    with patch(
        "app.api.v1.routes.verification.VerificationService.respond",
        new=AsyncMock(
            return_value=VerificationResponseResult(
                verification_request=verification_request,
                welfare_request=request,
                beneficiary=beneficiary,
            )
        ),
    ):
        response = client.post(
            "/api/v1/verification-vouchers/respond",
            json={"token": "signed-token", "outcome": "confirmed"},
        )

    assert response.status_code == 200
    assert response.json()["outcome"] == "confirmed"
    assert response.json()["welfare_request_status"] == "verified"


def test_whatsapp_webhook_challenge() -> None:
    service = MagicMock()
    service.verify_webhook_challenge.return_value = True
    with patch(
        "app.api.v1.routes.verification.WhatsAppService",
        return_value=service,
    ):
        response = client.get(
            "/api/v1/webhooks/whatsapp",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": "verify-token",
                "hub.challenge": "challenge-value",
            },
        )

    assert response.status_code == 200
    assert response.text == "challenge-value"


def test_signed_whatsapp_reply_processes_voucher() -> None:
    whatsapp = MagicMock()
    whatsapp.verify_webhook_signature.return_value = True
    whatsapp.extract_commands.return_value = [
        WhatsAppCommand(
            outcome=VerificationOutcome.CONFIRMED,
            token="signed-token",
        )
    ]
    with (
        patch(
            "app.api.v1.routes.verification.WhatsAppService",
            return_value=whatsapp,
        ),
        patch(
            "app.api.v1.routes.verification.VerificationService.respond",
            new=AsyncMock(),
        ) as respond,
    ):
        response = client.post(
            "/api/v1/webhooks/whatsapp",
            headers={"X-Hub-Signature-256": "sha256=signed"},
            json={
                "entry": [
                    {
                        "changes": [
                            {
                                "value": {
                                    "messages": [
                                        {
                                            "text": {
                                                "body": (
                                                    "CONFIRM signed-token"
                                                )
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                ]
            },
        )

    assert response.status_code == 200
    assert response.json()["processed_commands"] == 1
    respond.assert_awaited_once_with(
        token="signed-token",
        outcome=VerificationOutcome.CONFIRMED,
    )


def build_disbursement(
    *,
    welfare_request_id,
    approved_by,
    paid_by,
    idempotency_key,
) -> Disbursement:
    cipher = PIICipher(settings.pii_encryption_key)
    now = datetime.now(timezone.utc)
    return Disbursement(
        id=uuid4(),
        welfare_request_id=welfare_request_id,
        amount_kobo=1_500_000,
        payment_method=PaymentMethod.MOCK,
        approved_by=approved_by,
        paid_by=paid_by,
        idempotency_key=idempotency_key,
        request_fingerprint="f" * 64,
        rail_reference="mercyflow-mock-reference",
        settlement_status=SettlementStatus.SETTLED,
        paid_at=now,
        receipt_url="https://mock.invalid/receipts/reference",
        notes_encrypted=cipher.encrypt(
            "Mock transfer completed",
            context="disbursements.notes",
        ),
        created_at=now,
        updated_at=now,
    )


def test_execute_disbursement_returns_created_then_replay_status() -> None:
    parish_id = uuid4()
    actor = build_actor(UserRole.OFFICER, parish_id)
    app.dependency_overrides[get_current_user] = lambda: actor
    request_id = uuid4()
    idempotency_key = uuid4()
    disbursement = build_disbursement(
        welfare_request_id=request_id,
        approved_by=uuid4(),
        paid_by=actor.id,
        idempotency_key=idempotency_key,
    )

    with patch(
        "app.api.v1.routes.disbursements.DisbursementService.execute",
        new=AsyncMock(
            side_effect=[
                DisbursementResult(disbursement, False),
                DisbursementResult(disbursement, True),
            ]
        ),
    ):
        created = client.post(
            "/api/v1/disbursements",
            headers={"Idempotency-Key": str(idempotency_key)},
            json={
                "welfare_request_id": str(request_id),
                "amount_kobo": 1_500_000,
                "notes": "Mock transfer completed",
            },
        )
        replay = client.post(
            "/api/v1/disbursements",
            headers={"Idempotency-Key": str(idempotency_key)},
            json={
                "welfare_request_id": str(request_id),
                "amount_kobo": 1_500_000,
                "notes": "Mock transfer completed",
            },
        )

    assert created.status_code == 201
    assert created.json()["idempotent_replay"] is False
    assert created.json()["amount_kobo"] == 1_500_000
    assert created.json()["notes"] == "Mock transfer completed"
    assert replay.status_code == 200
    assert replay.json()["idempotent_replay"] is True
    assert replay.json()["id"] == created.json()["id"]


def test_disbursement_requires_valid_idempotency_key() -> None:
    parish_id = uuid4()
    app.dependency_overrides[get_current_user] = lambda: build_actor(
        UserRole.OFFICER,
        parish_id,
    )

    response = client.post(
        "/api/v1/disbursements",
        headers={"Idempotency-Key": "not-a-uuid"},
        json={
            "welfare_request_id": str(uuid4()),
            "amount_kobo": 1_500_000,
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_disbursement_amount_rejects_float() -> None:
    parish_id = uuid4()
    app.dependency_overrides[get_current_user] = lambda: build_actor(
        UserRole.OFFICER,
        parish_id,
    )

    response = client.post(
        "/api/v1/disbursements",
        headers={"Idempotency-Key": str(uuid4())},
        json={
            "welfare_request_id": str(uuid4()),
            "amount_kobo": 1_500_000.50,
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
