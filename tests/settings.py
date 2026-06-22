import base64

from app.core.config import Settings

TEST_KEY = base64.urlsafe_b64encode(bytes(range(32))).decode("ascii")


def build_test_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "app_name": "Test ParishCare API",
        "app_env": "testing",
        "debug": False,
        "api_v1_prefix": "/api/v1",
        "cors_allowed_origins": "http://localhost:5173",
        "database_url": "postgresql+asyncpg://test:test@localhost:5432/test",
        "jwt_secret_key": "test-jwt-secret-that-is-at-least-32-characters",
        "jwt_algorithm": "HS256",
        "jwt_issuer": "test-issuer",
        "jwt_audience": "test-audience",
        "access_token_expire_minutes": 15,
        "refresh_token_expire_days": 7,
        "mfa_demo_enabled": False,
        "mfa_demo_code_hash": "0" * 64,
        "pii_encryption_key": TEST_KEY,
        "pii_lookup_key": TEST_KEY,
        "beneficiary_name_similarity_threshold": 0.88,
        "beneficiary_duplicate_candidate_limit": 50,
        "welfare_request_max_amount_kobo": 10_000_000,
        "officer_approval_limit_kobo": 500_000,
        "scoring_version": "v1",
        "scoring_need_school": 15,
        "scoring_need_medical": 30,
        "scoring_need_food": 18,
        "scoring_need_loan": 10,
        "scoring_need_widow": 22,
        "scoring_need_rent": 16,
        "scoring_urgency_points": 15,
        "scoring_deadline_horizon_hours": 168,
        "scoring_dependents_max_points": 20,
        "scoring_dependents_saturation": 4,
        "scoring_verification_points": 20,
        "scoring_recency_penalty": 25,
        "scoring_high_threshold": 70,
        "scoring_medium_threshold": 40,
        "anti_fraud_recent_support_days": 7,
        "anti_fraud_duplicate_request_days": 30,
        "anti_fraud_high_amount_kobo": 1_000_000,
        "verification_voucher_expire_hours": 24,
        "verification_voucher_issuer": "test-verification-issuer",
        "verification_voucher_audience": "test-verification-audience",
        "verification_delivery_channel": "mock",
        "maker_checker_threshold_kobo": 500_000,
        "mock_payment_provider_name": "mercyflow-mock",
        "mock_payment_receipt_base_url": "https://mock.invalid/receipts",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)
