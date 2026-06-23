from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


TradeLiteral = Literal[
    "generator_tech",
    "plumber",
    "electrician",
    "tailor",
    "mechanic",
    "carpenter",
    "painter",
    "cleaner",
    "security",
    "hair_braider",
    "welder",
    "mason",
    "AC_tech",
    "vulcanizer",
]


class CampJobCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    artisan_id: str = Field(min_length=1)
    trade: TradeLiteral
    description: str = Field(min_length=5, max_length=2000)
    price_kobo: int = Field(gt=0)


class CampJobStatusUpdate(BaseModel):
    status: Literal[
        "requested",
        "quoted",
        "accepted",
        "en_route",
        "working",
        "completed",
        "disputed",
        "closed",
    ]
    photo: Literal["before", "during", "after"] | None = None
    photo_url: str | None = Field(default=None, max_length=1000)


class CampJobReview(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    rating: int = Field(ge=1, le=5)
    text: str | None = Field(default=None, max_length=2000)


class CampDisputeResolve(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    outcome: Literal["release", "refund"]
    note: str = Field(min_length=2, max_length=2000)


class CampConfirmationRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    note: str = Field(min_length=2, max_length=2000)


class CampVouchRequestCreate(BaseModel):
    artisan_id: str = Field(min_length=1)


class CampMentorEnrollmentCreate(BaseModel):
    artisan_id: str = Field(min_length=1)
    trade: TradeLiteral
