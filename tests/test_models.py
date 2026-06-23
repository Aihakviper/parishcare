from sqlalchemy import CheckConstraint, UniqueConstraint
from sqlalchemy.orm import configure_mappers

import app.models  # noqa: F401
from app.db.base import Base
from app.models.enums import CampRole, Trade, UserRole, VerificationStatus


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
        "artisan_profiles",
        "members",
        "resident_profiles",
        "jobs",
        "job_events",
        "escrow_transactions",
        "reviews",
        "disputes",
        "whatsapp_conversations",
        "whatsapp_inbound_events",
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


def test_camp_identity_links_are_registered() -> None:
    users = Base.metadata.tables["users"]
    members = Base.metadata.tables["members"]
    artisan_profiles = Base.metadata.tables["artisan_profiles"]

    assert {"camp_role", "member_id", "artisan_id", "active_job_id"}.issubset(
        users.columns.keys()
    )
    assert {"user_id", "phone_encrypted", "phone_hash", "camp_phase"}.issubset(
        members.columns.keys()
    )
    assert {
        "phone_encrypted",
        "phone_hash",
        "parish_id",
        "years_experience",
        "languages",
        "identity_score",
        "craft_score",
        "voice_score",
        "lineage_score",
        "generosity_score",
    }.issubset(artisan_profiles.columns.keys())


def test_role_and_verification_values_match_sdd() -> None:
    assert {role.value for role in UserRole} == {
        "officer",
        "pastor",
        "hq",
        "auditor",
        "resident",
        "artisan",
        "camp_admin",
        "mediator",
    }
    assert {status.value for status in VerificationStatus} == {
        "unverified",
        "pending",
        "verified",
    }


def test_camp_role_and_frontend_trade_values_are_registered() -> None:
    assert {role.value for role in CampRole} == {
        "member",
        "artisan",
        "pastor",
        "camp_admin",
        "mediator",
    }
    assert {
        "generator_tech",
        "hair_braider",
        "welder",
        "mason",
        "AC_tech",
        "vulcanizer",
    }.issubset({trade.value for trade in Trade})
