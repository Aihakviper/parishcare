from dataclasses import dataclass
from datetime import datetime, timezone

from app.core.config import Settings
from app.models.enums import (
    PriorityBand,
    VerificationStatus,
    WelfareRequestType,
)


@dataclass(frozen=True)
class ScoreResult:
    score: int
    band: PriorityBand
    breakdown: dict[str, object]


def calculate_priority_score(
    *,
    request_type: WelfareRequestType,
    is_urgent: bool,
    deadline_at: datetime | None,
    dependents_count: int,
    verification_status: VerificationStatus,
    received_recent_support: bool,
    config: Settings,
    now: datetime | None = None,
) -> ScoreResult:
    current_time = now or datetime.now(timezone.utc)
    need_points = {
        WelfareRequestType.SCHOOL: config.scoring_need_school,
        WelfareRequestType.MEDICAL: config.scoring_need_medical,
        WelfareRequestType.FOOD: config.scoring_need_food,
        WelfareRequestType.LOAN: config.scoring_need_loan,
        WelfareRequestType.WIDOW: config.scoring_need_widow,
        WelfareRequestType.RENT: config.scoring_need_rent,
    }[request_type]

    urgency_points = config.scoring_urgency_points if is_urgent else 0
    deadline_points = 0
    if deadline_at is not None:
        remaining_hours = max(
            0.0,
            (deadline_at - current_time).total_seconds() / 3600,
        )
        horizon = config.scoring_deadline_horizon_hours
        deadline_points = round(
            config.scoring_urgency_points
            * max(0.0, 1 - min(remaining_hours, horizon) / horizon)
        )
    urgency_contribution = min(
        config.scoring_urgency_points,
        max(urgency_points, deadline_points),
    )

    dependents_contribution = round(
        config.scoring_dependents_max_points
        * min(dependents_count, config.scoring_dependents_saturation)
        / config.scoring_dependents_saturation
    )
    verification_contribution = (
        config.scoring_verification_points
        if verification_status == VerificationStatus.VERIFIED
        else 0
    )
    recency_penalty = (
        -config.scoring_recency_penalty if received_recent_support else 0
    )
    raw_score = (
        need_points
        + urgency_contribution
        + dependents_contribution
        + verification_contribution
        + recency_penalty
    )
    score = max(0, min(100, raw_score))
    if score >= config.scoring_high_threshold:
        band = PriorityBand.HIGH
    elif score >= config.scoring_medium_threshold:
        band = PriorityBand.MEDIUM
    else:
        band = PriorityBand.LOW

    return ScoreResult(
        score=score,
        band=band,
        breakdown={
            "version": config.scoring_version,
            "factors": {
                "need_severity": need_points,
                "urgency": urgency_contribution,
                "dependents": dependents_contribution,
                "verification_strength": verification_contribution,
                "recency_penalty": recency_penalty,
            },
            "thresholds": {
                "high": config.scoring_high_threshold,
                "medium": config.scoring_medium_threshold,
            },
            "raw_score": raw_score,
            "final_score": score,
        },
    )
