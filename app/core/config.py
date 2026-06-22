import base64
from binascii import Error as Base64Error
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
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


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
