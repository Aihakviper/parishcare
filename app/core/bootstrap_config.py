from pydantic import EmailStr, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class BootstrapSettings(BaseSettings):
    enabled: bool
    hq_name: str = Field(min_length=2, max_length=200)
    hq_email: EmailStr
    hq_password: str = Field(min_length=14, max_length=128)
    hq_mfa_enabled: bool

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="PARISHCARE_BOOTSTRAP_",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("hq_password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        character_classes = (
            any(character.islower() for character in value),
            any(character.isupper() for character in value),
            any(character.isdigit() for character in value),
            any(not character.isalnum() for character in value),
        )
        if sum(character_classes) < 3:
            raise ValueError(
                "Bootstrap password must use at least three character classes"
            )
        return value
