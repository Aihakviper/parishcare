import base64

from app.core.config import Settings

TEST_KEY = base64.urlsafe_b64encode(bytes(range(32))).decode("ascii")


def build_test_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "app_name": "Test ParishCare API",
        "app_env": "testing",
        "debug": False,
        "api_v1_prefix": "/api/v1",
        "database_url": "postgresql+asyncpg://test:test@localhost:5432/test",
        "jwt_secret_key": "test-jwt-secret-that-is-at-least-32-characters",
        "jwt_algorithm": "HS256",
        "jwt_issuer": "test-issuer",
        "jwt_audience": "test-audience",
        "access_token_expire_minutes": 15,
        "refresh_token_expire_days": 7,
        "pii_encryption_key": TEST_KEY,
        "pii_lookup_key": TEST_KEY,
        "beneficiary_name_similarity_threshold": 0.88,
        "beneficiary_duplicate_candidate_limit": 50,
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)
