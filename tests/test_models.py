from sqlalchemy import CheckConstraint, UniqueConstraint
from sqlalchemy.orm import configure_mappers

import app.models  # noqa: F401
from app.db.base import Base
from app.models.enums import UserRole, VerificationStatus


def test_phase_two_tables_are_registered() -> None:
    assert set(Base.metadata.tables) == {
        "audit_logs",
        "beneficiaries",
        "disbursements",
        "parishes",
        "phone_history",
        "users",
        "verification_requests",
        "verification_vouchers",
        "welfare_requests",
    }


def test_model_relationships_configure() -> None:
    configure_mappers()


def test_beneficiary_phone_hash_is_unique() -> None:
    table = Base.metadata.tables["beneficiaries"]
    unique_columns = {
        tuple(constraint.columns.keys())
        for constraint in table.constraints
        if isinstance(constraint, UniqueConstraint)
    }

    assert ("phone_hash",) in unique_columns


def test_integrity_checks_are_registered() -> None:
    beneficiary_checks = {
        constraint.name
        for constraint in Base.metadata.tables["beneficiaries"].constraints
        if isinstance(constraint, CheckConstraint)
    }
    user_checks = {
        constraint.name
        for constraint in Base.metadata.tables["users"].constraints
        if isinstance(constraint, CheckConstraint)
    }

    assert "ck_beneficiaries_dependents_count_non_negative" in beneficiary_checks
    assert "ck_users_parish_required_for_parish_roles" in user_checks


def test_role_and_verification_values_match_sdd() -> None:
    assert {role.value for role in UserRole} == {
        "officer",
        "pastor",
        "hq",
        "auditor",
    }
    assert {status.value for status in VerificationStatus} == {
        "unverified",
        "pending",
        "verified",
    }
