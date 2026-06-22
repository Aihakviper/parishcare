import base64
import re
from binascii import Error as Base64Error
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str
    app_env: Literal["development", "testing", "staging", "production"]
    debug: bool
    api_v1_prefix: str
    cors_allowed_origins: str

    database_url: str

    jwt_secret_key: str = Field(min_length=32)
    jwt_algorithm: Literal["HS256"]
    jwt_issuer: str
    jwt_audience: str
    access_token_expire_minutes: int = Field(gt=0)
    refresh_token_expire_days: int = Field(gt=0)
    mfa_demo_enabled: bool
    mfa_demo_code_hash: str = Field(min_length=64, max_length=64)

    pii_encryption_key: str
    pii_lookup_key: str
    beneficiary_name_similarity_threshold: float = Field(ge=0, le=1)
    beneficiary_duplicate_candidate_limit: int = Field(gt=0, le=500)

    welfare_request_max_amount_kobo: int = Field(gt=0)
    officer_approval_limit_kobo: int = Field(gt=0)
    scoring_version: str = Field(min_length=1, max_length=50)
    scoring_need_school: int = Field(ge=0, le=30)
    scoring_need_medical: int = Field(ge=0, le=30)
    scoring_need_food: int = Field(ge=0, le=30)
    scoring_need_loan: int = Field(ge=0, le=30)
    scoring_need_widow: int = Field(ge=0, le=30)
    scoring_need_rent: int = Field(ge=0, le=30)
    scoring_urgency_points: int = Field(ge=0, le=30)
    scoring_deadline_horizon_hours: int = Field(gt=0)
    scoring_dependents_max_points: int = Field(ge=0, le=30)
    scoring_dependents_saturation: int = Field(gt=0)
    scoring_verification_points: int = Field(ge=0, le=30)
    scoring_recency_penalty: int = Field(ge=0, le=50)
    scoring_high_threshold: int = Field(ge=0, le=100)
    scoring_medium_threshold: int = Field(ge=0, le=100)
    anti_fraud_recent_support_days: int = Field(gt=0)
    anti_fraud_duplicate_request_days: int = Field(gt=0)
    anti_fraud_high_amount_kobo: int = Field(gt=0)

    verification_voucher_expire_hours: int = Field(gt=0)
    verification_voucher_issuer: str = Field(min_length=1)
    verification_voucher_audience: str = Field(min_length=1)
    verification_delivery_channel: Literal["mock"]

    maker_checker_threshold_kobo: int = Field(gt=0)
    mock_payment_provider_name: str = Field(min_length=1, max_length=50)
    mock_payment_receipt_base_url: str = Field(min_length=1, max_length=500)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="PARISHCARE_",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("pii_encryption_key", "pii_lookup_key")
    @classmethod
    def validate_32_byte_base64_key(cls, value: str) -> str:
        try:
            decoded = base64.b64decode(
                value.encode("ascii"),
                altchars=b"-_",
                validate=True,
            )
        except (Base64Error, UnicodeEncodeError, ValueError) as exc:
            raise ValueError("Key must be valid URL-safe base64") from exc
        if len(decoded) != 32:
            raise ValueError("Key must decode to exactly 32 bytes")
        return value

    @field_validator("mfa_demo_code_hash")
    @classmethod
    def validate_sha256_hash(cls, value: str) -> str:
        normalized = value.lower()
        if not re.fullmatch(r"[0-9a-f]{64}", normalized):
            raise ValueError("MFA demo code hash must be a SHA-256 hex digest")
        return normalized

    @model_validator(mode="after")
    def validate_scoring_thresholds(self) -> "Settings":
        if self.scoring_medium_threshold > self.scoring_high_threshold:
            raise ValueError(
                "Scoring medium threshold cannot exceed high threshold"
            )
        if self.app_env == "production" and self.mfa_demo_enabled:
            raise ValueError("Demo MFA cannot be enabled in production")
        return self

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_allowed_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
