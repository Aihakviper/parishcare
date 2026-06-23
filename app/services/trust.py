import math
from dataclasses import dataclass
from datetime import datetime, timezone

from app.models.enums import ArtisanTier
from app.models.marketplace import ArtisanProfile


@dataclass(frozen=True)
class TrustScore:
    score: int
    tier: ArtisanTier
    breakdown: dict[str, int]


def calculate_trust_score(
    profile: ArtisanProfile,
    *,
    open_disputes: int = 0,
    unresolved_disputes: int = 0,
    refunded_jobs: int = 0,
    now: datetime | None = None,
) -> TrustScore:
    now = now or datetime.now(timezone.utc)
    identity = 20 if profile.nin_verified else 0
    skill = min(
        20,
        profile.community_vouches * max(0, profile.sample_work_score),
    )
    volume = min(25, round(math.log(profile.completed_jobs + 1) * 6))
    rating = profile.average_rating_milli / 1000
    quality = min(25, max(0, round((rating - 3.0) * 12.5)))
    created = profile.created_at or now
    months = max(0, (now - created).days // 30)
    tenure = min(10, months)
    penalties = (
        open_disputes * 5
        + unresolved_disputes * 10
        + refunded_jobs * 3
    )
    score = max(0, min(100, identity + skill + volume + quality + tenure - penalties))
    if score < 30:
        tier = ArtisanTier.UNVERIFIED
    elif score <= 55:
        tier = ArtisanTier.VERIFIED
    elif score <= 80:
        tier = ArtisanTier.TRUSTED
    else:
        tier = ArtisanTier.STEWARD
    return TrustScore(
        score=score,
        tier=tier,
        breakdown={
            "identity": identity,
            "skill": skill,
            "volume": volume,
            "quality": quality,
            "tenure": tenure,
            "penalties": penalties,
        },
    )
