from app.core.config import Settings, settings
from app.models.beneficiary import Beneficiary
from app.models.parish import Parish
from app.models.user import User
from app.models.welfare_request import WelfareRequest
from app.schemas.parish import ParishResponse
from app.schemas.beneficiary import BeneficiaryResponse
from app.schemas.user import UserResponse
from app.schemas.welfare_request import WelfareRequestResponse
from app.services.parish import CONTACT_NAME_CONTEXT, CONTACT_PHONE_CONTEXT
from app.services.beneficiary import (
    BENEFICIARY_NAME_CONTEXT,
    BENEFICIARY_PHONE_CONTEXT,
)
from app.services.user import USER_EMAIL_CONTEXT, USER_NAME_CONTEXT
from app.services.welfare_request import (
    DECISION_REASON_CONTEXT,
    REQUEST_REASON_CONTEXT,
    RISK_REVIEW_REASON_CONTEXT,
    TRANSITION_REASON_CONTEXT,
)
from app.utils.crypto import PIICipher


def present_parish(
    parish: Parish,
    *,
    config: Settings = settings,
) -> ParishResponse:
    cipher = PIICipher(config.pii_encryption_key)
    return ParishResponse(
        id=parish.id,
        name=parish.name,
        region=parish.region,
        address=parish.address,
        contact_name=cipher.decrypt(
            parish.contact_name_encrypted,
            context=CONTACT_NAME_CONTEXT,
        ),
        contact_phone=cipher.decrypt(
            parish.contact_phone_encrypted,
            context=CONTACT_PHONE_CONTEXT,
        ),
        created_at=parish.created_at,
        updated_at=parish.updated_at,
    )


def present_beneficiary(
    beneficiary: Beneficiary,
    *,
    config: Settings = settings,
) -> BeneficiaryResponse:
    cipher = PIICipher(config.pii_encryption_key)
    return BeneficiaryResponse(
        id=beneficiary.id,
        name=cipher.decrypt(
            beneficiary.name_encrypted,
            context=BENEFICIARY_NAME_CONTEXT,
        ),
        phone=cipher.decrypt(
            beneficiary.phone_encrypted,
            context=BENEFICIARY_PHONE_CONTEXT,
        ),
        home_parish_id=beneficiary.home_parish_id,
        dependents_count=beneficiary.dependents_count,
        verification_status=beneficiary.verification_status,
        created_at=beneficiary.created_at,
        updated_at=beneficiary.updated_at,
    )


def present_user(
    user: User,
    *,
    config: Settings = settings,
) -> UserResponse:
    cipher = PIICipher(config.pii_encryption_key)
    return UserResponse(
        id=user.id,
        name=cipher.decrypt(
            user.name_encrypted,
            context=USER_NAME_CONTEXT,
        ),
        email=cipher.decrypt(
            user.email_encrypted,
            context=USER_EMAIL_CONTEXT,
        ),
        role=user.role,
        parish_id=user.parish_id,
        mfa_enabled=user.mfa_enabled,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def present_welfare_request(
    request: WelfareRequest,
    *,
    config: Settings = settings,
) -> WelfareRequestResponse:
    cipher = PIICipher(config.pii_encryption_key)
    return WelfareRequestResponse(
        id=request.id,
        beneficiary_id=request.beneficiary_id,
        created_by=request.created_by,
        request_type=request.request_type,
        amount_requested_kobo=request.amount_requested_kobo,
        reason=cipher.decrypt(
            request.reason_encrypted,
            context=REQUEST_REASON_CONTEXT,
        ),
        is_urgent=request.is_urgent,
        deadline_at=request.deadline_at,
        status=request.status,
        priority_score=request.priority_score,
        priority_band=request.priority_band,
        scoring_version=request.scoring_version,
        score_breakdown=request.score_breakdown,
        risk_flags=request.risk_flags,
        transition_reason=_decrypt_optional(
            cipher,
            request.transition_reason_encrypted,
            TRANSITION_REASON_CONTEXT,
        ),
        transitioned_by=request.transitioned_by,
        transitioned_at=request.transitioned_at,
        decision_reason=_decrypt_optional(
            cipher,
            request.decision_reason_encrypted,
            DECISION_REASON_CONTEXT,
        ),
        decided_by=request.decided_by,
        decided_at=request.decided_at,
        risk_review_reason=_decrypt_optional(
            cipher,
            request.risk_review_reason_encrypted,
            RISK_REVIEW_REASON_CONTEXT,
        ),
        risk_reviewed_by=request.risk_reviewed_by,
        risk_reviewed_at=request.risk_reviewed_at,
        created_at=request.created_at,
        updated_at=request.updated_at,
    )


def _decrypt_optional(
    cipher: PIICipher,
    value: str | None,
    context: str,
) -> str | None:
    if value is None:
        return None
    return cipher.decrypt(value, context=context)
