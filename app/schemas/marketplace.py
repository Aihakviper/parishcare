from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictInt

from app.models.enums import (
    ArtisanTier,
    DisputeResolution,
    DisputeStatus,
    EscrowStatus,
    JobStatus,
    Trade,
)


class ArtisanProfileCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    trade: Trade
    service_area: str = Field(min_length=2, max_length=200)
    community_vouches: int = Field(default=0, ge=0, le=100)
    sample_work_score: int = Field(default=0, ge=0, le=20)
    nin_verified: bool = False
    bvn_verified: bool = False
    sample_work_urls: list[str] = Field(default_factory=list, max_length=20)


class ArtisanProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    trade: Trade
    service_area: str
    tier: ArtisanTier
    trust_score: int
    completed_jobs: int
    average_rating_milli: int
    rating_count: int
    nin_verified: bool
    bvn_verified: bool
    community_vouches: int
    sample_work_score: int
    sample_work_urls: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JobCreate(BaseModel):
    trade: Trade
    description: str = Field(min_length=10, max_length=4000)
    service_area: str = Field(min_length=2, max_length=200)
    photos: list[str] = Field(default_factory=list, max_length=10)


class JobQuote(BaseModel):
    price_kobo: StrictInt = Field(gt=0)


class JobTransition(BaseModel):
    status: JobStatus


class JobResponse(BaseModel):
    id: UUID
    resident_id: UUID
    artisan_id: UUID | None
    trade: Trade
    description: str
    service_area: str
    photos: list[str]
    status: JobStatus
    price_kobo: int | None
    escrow_status: EscrowStatus
    created_at: datetime
    updated_at: datetime


class EscrowResponse(BaseModel):
    id: UUID
    job_id: UUID
    amount_kobo: int
    platform_fee_kobo: int
    artisan_amount_kobo: int
    status: EscrowStatus
    provider_reference: str
    funded_at: datetime | None
    settled_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str | None = Field(default=None, max_length=2000)
    voice_url: str | None = Field(default=None, max_length=1000)


class DisputeCreate(BaseModel):
    reason: str = Field(min_length=10, max_length=4000)


class DisputeResolve(BaseModel):
    resolution: DisputeResolution
    notes: str = Field(min_length=10, max_length=4000)


class DisputeResponse(BaseModel):
    id: UUID
    job_id: UUID
    opener_id: UUID
    status: DisputeStatus
    resolution: DisputeResolution | None
    mediator_id: UUID | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
