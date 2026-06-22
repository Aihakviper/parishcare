from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import UserRole


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class TokenClaims(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sub: UUID
    role: UserRole
    type: Literal["access", "refresh"]
    jti: UUID
    iat: int
    exp: int
    iss: str
    aud: str
