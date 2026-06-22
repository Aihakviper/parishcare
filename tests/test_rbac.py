from uuid import uuid4

import pytest

from app.core.rbac import (
    AuthorizationError,
    Permission,
    ROLE_PERMISSIONS,
    require_parish_scope,
    require_permission,
    require_user_management_scope,
)
from app.models.enums import UserRole
from app.models.user import User


def build_actor(role: UserRole, parish_id=None) -> User:
    return User(
        id=uuid4(),
        name_encrypted="encrypted-name",
        email_encrypted="encrypted-email",
        email_hash="a" * 64,
        password_hash="password-hash",
        role=role,
        parish_id=parish_id,
        mfa_enabled=True,
        is_active=True,
    )


def test_role_permission_matrix() -> None:
    assert Permission.PARISH_CREATE in ROLE_PERMISSIONS[UserRole.HQ]
    assert Permission.PARISH_CREATE not in ROLE_PERMISSIONS[UserRole.PASTOR]
    assert Permission.USER_CREATE in ROLE_PERMISSIONS[UserRole.PASTOR]
    assert Permission.BENEFICIARY_CREATE in ROLE_PERMISSIONS[UserRole.OFFICER]
    assert Permission.BENEFICIARY_LOOKUP in ROLE_PERMISSIONS[UserRole.OFFICER]
    assert ROLE_PERMISSIONS[UserRole.AUDITOR] == {
        Permission.AUDIT_VERIFY
    }


def test_permission_denial() -> None:
    officer = build_actor(UserRole.OFFICER, uuid4())

    with pytest.raises(AuthorizationError):
        require_permission(officer, Permission.USER_CREATE)


def test_pastor_is_limited_to_own_parish() -> None:
    parish_id = uuid4()
    pastor = build_actor(UserRole.PASTOR, parish_id)

    require_parish_scope(pastor, parish_id)

    with pytest.raises(AuthorizationError):
        require_parish_scope(pastor, uuid4())


def test_pastor_can_manage_only_officers_in_own_parish() -> None:
    parish_id = uuid4()
    pastor = build_actor(UserRole.PASTOR, parish_id)

    require_user_management_scope(
        pastor,
        target_role=UserRole.OFFICER,
        target_parish_id=parish_id,
    )

    with pytest.raises(AuthorizationError):
        require_user_management_scope(
            pastor,
            target_role=UserRole.PASTOR,
            target_parish_id=parish_id,
        )
    with pytest.raises(AuthorizationError):
        require_user_management_scope(
            pastor,
            target_role=UserRole.OFFICER,
            target_parish_id=uuid4(),
        )
