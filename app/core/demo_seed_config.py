from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class DemoSeedSettings(BaseSettings):
    enabled: bool
    user_password: str = Field(default="", max_length=128)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="PARISHCARE_DEMO_SEED_",
        case_sensitive=False,
        extra="ignore",
    )

    @model_validator(mode="after")
    def require_password_when_enabled(self) -> "DemoSeedSettings":
        if self.enabled and len(self.user_password) < 12:
            raise ValueError(
                "Demo seed password must contain at least 12 characters"
            )
        return self
