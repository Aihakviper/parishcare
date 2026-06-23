from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


client = TestClient(app)


def test_camp_routes_require_auth_by_default() -> None:
    original = settings.camp_mock_auth_bypass
    settings.camp_mock_auth_bypass = False
    try:
        response = client.get("/api/v1/camp/artisans")
    finally:
        settings.camp_mock_auth_bypass = original

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "authentication_failed"


def test_camp_mock_artisan_discovery_with_env_bypass() -> None:
    original = settings.camp_mock_auth_bypass
    settings.camp_mock_auth_bypass = True
    try:
        response = client.get("/api/v1/camp/artisans?trade=generator_tech")
    finally:
        settings.camp_mock_auth_bypass = original

    assert response.status_code == 200
    data = response.json()
    assert data[0]["id"] == "artisan-tunde-akinwale"
    assert data[0]["trade"] == "generator_tech"


def test_camp_mock_job_lifecycle_with_env_bypass() -> None:
    original = settings.camp_mock_auth_bypass
    settings.camp_mock_auth_bypass = True
    try:
        create = client.post(
            "/api/v1/camp/jobs",
            json={
                "artisan_id": "artisan-tunde-akinwale",
                "trade": "generator_tech",
                "description": "Generator no dey start",
                "price_kobo": 1850000,
            },
        )
        assert create.status_code == 200
        job_id = create.json()["id"]

        fund = client.post(f"/api/v1/camp/jobs/{job_id}/fund-escrow")
        review = client.post(
            f"/api/v1/camp/jobs/{job_id}/review",
            json={"rating": 5, "text": "Fixed quickly."},
        )
    finally:
        settings.camp_mock_auth_bypass = original

    assert fund.status_code == 200
    assert fund.json()["escrow_status"] == "held"
    assert review.status_code == 200
    assert review.json()["rating"] == 5


def test_auth_me_returns_default_mock_member_profile_with_env_bypass() -> None:
    original = settings.camp_mock_auth_bypass
    settings.camp_mock_auth_bypass = True
    try:
        response = client.get("/api/v1/auth/me")
    finally:
        settings.camp_mock_auth_bypass = original

    assert response.status_code == 200
    body = response.json()
    assert body["camp_role"] == "member"
    assert body["member_id"] == "member-funmi"


def test_auth_me_switches_mock_profile_with_header() -> None:
    original = settings.camp_mock_auth_bypass
    settings.camp_mock_auth_bypass = True
    try:
        response = client.get(
            "/api/v1/auth/me?demo_role=member",
            headers={"X-Camp-Demo-Role": "artisan"},
        )
    finally:
        settings.camp_mock_auth_bypass = original

    assert response.status_code == 200
    body = response.json()
    assert body["camp_role"] == "artisan"
    assert body["artisan_id"] == "artisan-tunde-akinwale"
    assert body["active_job_id"] == "job-hero-generator"
