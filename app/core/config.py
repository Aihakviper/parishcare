import base64
from binascii import Error as Base64Error
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEVELOPMENT_JWT_SECRET = "replace-with-a-long-random-secret"
DEVELOPMENT_PII_ENCRYPTION_KEY = (
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
)
DEVELOPMENT_PII_LOOKUP_KEY = "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE="


class Settings(BaseSettings):
    app_name: str = "ParishCare MercyFlow API"
    app_env: Literal["development", "testing", "staging", "production"] = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    database_url: str = (
        "postgresql+asyncpg://parishcare:change-me@localhost:5432/parishcare"
    )

    jwt_secret_key: str = Field(
        default=DEVELOPMENT_JWT_SECRET,
        min_length=32,
    )
    jwt_algorithm: Literal["HS256"] = "HS256"
    jwt_issuer: str = "parishcare-mercyflow"
    jwt_audience: str = "parishcare-api"
    access_token_expire_minutes: int = Field(default=15, gt=0)
    refresh_token_expire_days: int = Field(default=7, gt=0)

    pii_encryption_key: str = DEVELOPMENT_PII_ENCRYPTION_KEY
    pii_lookup_key: str = DEVELOPMENT_PII_LOOKUP_KEY

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
    def reject_development_secrets_in_production(self) -> "Settings":
        if self.app_env != "production":
            return self

        insecure_values = {
            "jwt_secret_key": (
                self.jwt_secret_key,
                DEVELOPMENT_JWT_SECRET,
            ),
            "pii_encryption_key": (
                self.pii_encryption_key,
                DEVELOPMENT_PII_ENCRYPTION_KEY,
            ),
            "pii_lookup_key": (
                self.pii_lookup_key,
                DEVELOPMENT_PII_LOOKUP_KEY,
            ),
        }
        insecure_names = [
            name for name, (actual, development) in insecure_values.items()
            if actual == development
        ]
        if insecure_names:
            raise ValueError(
                "Production secrets must be replaced: "
                + ", ".join(insecure_names)
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
