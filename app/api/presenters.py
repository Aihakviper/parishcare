from app.core.config import Settings, settings
from app.models.parish import Parish
from app.models.user import User
from app.schemas.parish import ParishResponse
from app.schemas.user import UserResponse
from app.services.parish import CONTACT_NAME_CONTEXT, CONTACT_PHONE_CONTEXT
from app.services.user import USER_EMAIL_CONTEXT, USER_NAME_CONTEXT
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
