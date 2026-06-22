import base64
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

    database_url: str

    jwt_secret_key: str = Field(min_length=32)
    jwt_algorithm: Literal["HS256"]
    jwt_issuer: str
    jwt_audience: str
    access_token_expire_minutes: int = Field(gt=0)
    refresh_token_expire_days: int = Field(gt=0)

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

    @model_validator(mode="after")
    def validate_scoring_thresholds(self) -> "Settings":
        if self.scoring_medium_threshold > self.scoring_high_threshold:
            raise ValueError(
                "Scoring medium threshold cannot exceed high threshold"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
