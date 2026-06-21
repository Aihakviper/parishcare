"""Create users, roles, parishes, and beneficiaries.

Revision ID: 20260621_0001
Revises:
Create Date: 2026-06-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260621_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

user_role = postgresql.ENUM(
    "officer",
    "pastor",
    "hq",
    "auditor",
    name="user_role",
    create_type=False,
)
verification_status = postgresql.ENUM(
    "unverified",
    "pending",
    "verified",
    name="verification_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    user_role.create(bind, checkfirst=True)
    verification_status.create(bind, checkfirst=True)

    op.create_table(
        "parishes",
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("region", sa.String(length=120), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("contact_name_encrypted", sa.Text(), nullable=False),
        sa.Column("contact_phone_encrypted", sa.Text(), nullable=False),
        sa.Column("contact_phone_hash", sa.String(length=64), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_parishes")),
    )
    op.create_index(
        "ix_parishes_contact_phone_hash",
        "parishes",
        ["contact_phone_hash"],
        unique=False,
    )
    op.create_index("ix_parishes_name", "parishes", ["name"], unique=False)
    op.create_index("ix_parishes_region", "parishes", ["region"], unique=False)

    op.create_table(
        "users",
        sa.Column("name_encrypted", sa.Text(), nullable=False),
        sa.Column("email_encrypted", sa.Text(), nullable=False),
        sa.Column("email_hash", sa.String(length=64), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("parish_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "mfa_enabled",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "role NOT IN ('officer', 'pastor') OR parish_id IS NOT NULL",
            name=op.f("ck_users_parish_required_for_parish_roles"),
        ),
        sa.ForeignKeyConstraint(
            ["parish_id"],
            ["parishes.id"],
            name=op.f("fk_users_parish_id_parishes"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email_hash", name=op.f("uq_users_email_hash")),
    )
    op.create_index("ix_users_parish_id", "users", ["parish_id"], unique=False)
    op.create_index("ix_users_role", "users", ["role"], unique=False)

    op.create_table(
        "beneficiaries",
        sa.Column("name_encrypted", sa.Text(), nullable=False),
        sa.Column("name_normalised", sa.String(length=300), nullable=False),
        sa.Column("phone_encrypted", sa.Text(), nullable=False),
        sa.Column("phone_hash", sa.String(length=64), nullable=False),
        sa.Column("home_parish_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "dependents_count",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "verification_status",
            verification_status,
            server_default="unverified",
            nullable=False,
        ),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "dependents_count >= 0",
            name=op.f("ck_beneficiaries_dependents_count_non_negative"),
        ),
        sa.ForeignKeyConstraint(
            ["home_parish_id"],
            ["parishes.id"],
            name=op.f("fk_beneficiaries_home_parish_id_parishes"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_beneficiaries")),
        sa.UniqueConstraint(
            "phone_hash",
            name=op.f("uq_beneficiaries_phone_hash"),
        ),
    )
    op.create_index(
        "ix_beneficiaries_home_parish_id",
        "beneficiaries",
        ["home_parish_id"],
        unique=False,
    )
    op.create_index(
        "ix_beneficiaries_name_normalised",
        "beneficiaries",
        ["name_normalised"],
        unique=False,
    )
    op.create_index(
        "ix_beneficiaries_verification_status",
        "beneficiaries",
        ["verification_status"],
        unique=False,
    )

    op.create_table(
        "phone_history",
        sa.Column("beneficiary_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("phone_encrypted", sa.Text(), nullable=False),
        sa.Column("phone_hash", sa.String(length=64), nullable=False),
        sa.Column("active_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("active_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "active_to IS NULL OR active_to >= active_from",
            name=op.f("ck_phone_history_active_period_valid"),
        ),
        sa.ForeignKeyConstraint(
            ["beneficiary_id"],
            ["beneficiaries.id"],
            name=op.f("fk_phone_history_beneficiary_id_beneficiaries"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_phone_history")),
    )
    op.create_index(
        "ix_phone_history_beneficiary_id",
        "phone_history",
        ["beneficiary_id"],
        unique=False,
    )
    op.create_index(
        "ix_phone_history_phone_hash",
        "phone_history",
        ["phone_hash"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_phone_history_phone_hash", table_name="phone_history")
    op.drop_index("ix_phone_history_beneficiary_id", table_name="phone_history")
    op.drop_table("phone_history")

    op.drop_index(
        "ix_beneficiaries_verification_status",
        table_name="beneficiaries",
    )
    op.drop_index(
        "ix_beneficiaries_name_normalised",
        table_name="beneficiaries",
    )
    op.drop_index(
        "ix_beneficiaries_home_parish_id",
        table_name="beneficiaries",
    )
    op.drop_table("beneficiaries")

    op.drop_index("ix_users_role", table_name="users")
    op.drop_index("ix_users_parish_id", table_name="users")
    op.drop_table("users")

    op.drop_index("ix_parishes_region", table_name="parishes")
    op.drop_index("ix_parishes_name", table_name="parishes")
    op.drop_index("ix_parishes_contact_phone_hash", table_name="parishes")
    op.drop_table("parishes")

    bind = op.get_bind()
    verification_status.drop(bind, checkfirst=True)
    user_role.drop(bind, checkfirst=True)
