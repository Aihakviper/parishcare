from datetime import datetime, timedelta, timezone

from app.models.enums import (
    PriorityBand,
    VerificationStatus,
    WelfareRequestType,
)
from app.services.scoring import calculate_priority_score
from tests.settings import build_test_settings


def test_scoring_is_bounded_explainable_and_versioned() -> None:
    config = build_test_settings()
    now = datetime.now(timezone.utc)

    result = calculate_priority_score(
        request_type=WelfareRequestType.MEDICAL,
        is_urgent=True,
        deadline_at=now + timedelta(hours=2),
        dependents_count=5,
        verification_status=VerificationStatus.VERIFIED,
        received_recent_support=False,
        config=config,
        now=now,
    )

    assert result.score == 85
    assert result.band == PriorityBand.HIGH
    assert result.breakdown["version"] == "v1"
    assert result.breakdown["factors"] == {
        "need_severity": 30,
        "urgency": 15,
        "dependents": 20,
        "verification_strength": 20,
        "recency_penalty": 0,
    }


def test_recent_support_penalty_never_produces_negative_score() -> None:
    config = build_test_settings()

    result = calculate_priority_score(
        request_type=WelfareRequestType.LOAN,
        is_urgent=False,
        deadline_at=None,
        dependents_count=0,
        verification_status=VerificationStatus.UNVERIFIED,
        received_recent_support=True,
        config=config,
    )

    assert result.score == 0
    assert result.band == PriorityBand.LOW
