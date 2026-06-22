from enum import StrEnum
from uuid import UUID

from app.models.enums import UserRole
from app.models.user import User


class Permission(StrEnum):
    BENEFICIARY_CREATE = "beneficiary:create"
    BENEFICIARY_LOOKUP = "beneficiary:lookup"
    PARISH_CREATE = "parish:create"
    PARISH_UPDATE = "parish:update"
    USER_CREATE = "user:create"
    USER_UPDATE = "user:update"
    AUDIT_VERIFY = "audit:verify"


ROLE_PERMISSIONS: dict[UserRole, frozenset[Permission]] = {
    UserRole.OFFICER: frozenset(
        {
            Permission.BENEFICIARY_CREATE,
            Permission.BENEFICIARY_LOOKUP,
        }
    ),
    UserRole.PASTOR: frozenset(
        {
            Permission.BENEFICIARY_CREATE,
            Permission.BENEFICIARY_LOOKUP,
            Permission.PARISH_UPDATE,
            Permission.USER_CREATE,
            Permission.USER_UPDATE,
        }
    ),
    UserRole.HQ: frozenset(
        {
            Permission.PARISH_CREATE,
            Permission.PARISH_UPDATE,
            Permission.USER_CREATE,
            Permission.USER_UPDATE,
            Permission.AUDIT_VERIFY,
        }
    ),
    UserRole.AUDITOR: frozenset({Permission.AUDIT_VERIFY}),
}


class AuthorizationError(PermissionError):
    """Raised when an actor lacks permission or resource scope."""


def require_permission(actor: User, permission: Permission) -> None:
    if permission not in ROLE_PERMISSIONS[actor.role]:
        raise AuthorizationError(f"Missing permission: {permission.value}")


def require_parish_scope(actor: User, parish_id: UUID) -> None:
    if actor.role == UserRole.HQ:
        return
    if actor.parish_id != parish_id:
        raise AuthorizationError("Resource is outside the actor's parish scope")


def require_user_management_scope(
    actor: User,
    *,
    target_role: UserRole,
    target_parish_id: UUID | None,
) -> None:
    if actor.role == UserRole.HQ:
        return
    if actor.role != UserRole.PASTOR:
        raise AuthorizationError("Role cannot manage users")
    if target_role != UserRole.OFFICER:
        raise AuthorizationError("Pastors can manage officers only")
    if actor.parish_id is None or target_parish_id != actor.parish_id:
        raise AuthorizationError("User is outside the actor's parish scope")
