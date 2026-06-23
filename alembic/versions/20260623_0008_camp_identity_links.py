"""Add Camp members, artisan profile fields, and user Camp links.

Revision ID: 20260623_0008
Revises: 20260623_0007
Create Date: 2026-06-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260623_0008"
down_revision: Union[str, Sequence[str], None] = "20260623_0007"
branch_labels = None
depends_on = None


CAMP_ROLES = ("member", "artisan", "pastor", "camp_admin", "mediator")
NEW_TRADES = ("generator_tech", "hair_braider", "welder", "mason", "AC_tech", "vulcanizer")


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM(*CAMP_ROLES, name="camp_role").create(bind, checkfirst=True)

    for enum_name in ("artisan_trade", "job_trade"):
        for trade in NEW_TRADES:
            op.execute(f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS '{trade}'")

    op.create_table(
        "members",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parish_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("phone_encrypted", sa.Text(), nullable=True),
        sa.Column("phone_hash", sa.String(64), nullable=True),
        sa.Column("address_encrypted", sa.Text(), nullable=True),
        sa.Column("camp_phase", sa.String(120), nullable=True),
        sa.Column("zone", sa.String(120), nullable=True),
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
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parish_id"], ["parishes.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
        sa.UniqueConstraint("phone_hash"),
    )
    op.create_index("ix_members_parish_id", "members", ["parish_id"])

    op.add_column(
        "artisan_profiles",
        sa.Column("parish_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column("artisan_profiles", sa.Column("phone_encrypted", sa.Text(), nullable=True))
    op.add_column("artisan_profiles", sa.Column("phone_hash", sa.String(64), nullable=True))
    op.add_column("artisan_profiles", sa.Column("bio_encrypted", sa.Text(), nullable=True))
    op.add_column("artisan_profiles", sa.Column("photo_url", sa.String(1000), nullable=True))
    op.add_column(
        "artisan_profiles",
        sa.Column("years_experience", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "artisan_profiles",
        sa.Column(
            "languages",
            postgresql.JSONB(),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "artisan_profiles",
        sa.Column("vouchers_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "artisan_profiles",
        sa.Column("identity_score", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "artisan_profiles",
        sa.Column("craft_score", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "artisan_profiles",
        sa.Column("voice_score", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "artisan_profiles",
        sa.Column("lineage_score", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "artisan_profiles",
        sa.Column("generosity_score", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "artisan_profiles",
        sa.Column("is_available", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    op.add_column(
        "artisan_profiles",
        sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_artisan_profiles_parish_id_parishes",
        "artisan_profiles",
        "parishes",
        ["parish_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_unique_constraint(
        "uq_artisan_profiles_phone_hash",
        "artisan_profiles",
        ["phone_hash"],
    )
    op.create_index("ix_artisan_profiles_parish_id", "artisan_profiles", ["parish_id"])
    op.create_check_constraint(
        "ck_artisan_profiles_identity_score_range",
        "artisan_profiles",
        "identity_score BETWEEN 0 AND 15",
    )
    op.create_check_constraint(
        "ck_artisan_profiles_craft_score_range",
        "artisan_profiles",
        "craft_score BETWEEN 0 AND 25",
    )
    op.create_check_constraint(
        "ck_artisan_profiles_voice_score_range",
        "artisan_profiles",
        "voice_score BETWEEN 0 AND 25",
    )
    op.create_check_constraint(
        "ck_artisan_profiles_lineage_score_range",
        "artisan_profiles",
        "lineage_score BETWEEN 0 AND 15",
    )
    op.create_check_constraint(
        "ck_artisan_profiles_generosity_score_range",
        "artisan_profiles",
        "generosity_score BETWEEN 0 AND 20",
    )

    camp_role_enum = postgresql.ENUM(*CAMP_ROLES, name="camp_role", create_type=False)
    op.add_column("users", sa.Column("camp_role", camp_role_enum, nullable=True))
    op.add_column("users", sa.Column("member_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("users", sa.Column("artisan_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("users", sa.Column("active_job_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_users_member_id_members",
        "users",
        "members",
        ["member_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_users_artisan_id_artisan_profiles",
        "users",
        "artisan_profiles",
        ["artisan_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_users_active_job_id_jobs",
        "users",
        "jobs",
        ["active_job_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_unique_constraint("uq_users_member_id", "users", ["member_id"])
    op.create_unique_constraint("uq_users_artisan_id", "users", ["artisan_id"])
    op.create_index("ix_users_camp_role", "users", ["camp_role"])
    op.create_index("ix_users_member_id", "users", ["member_id"])
    op.create_index("ix_users_artisan_id", "users", ["artisan_id"])


def downgrade() -> None:
    op.drop_index("ix_users_artisan_id", table_name="users")
    op.drop_index("ix_users_member_id", table_name="users")
    op.drop_index("ix_users_camp_role", table_name="users")
    op.drop_constraint("uq_users_artisan_id", "users", type_="unique")
    op.drop_constraint("uq_users_member_id", "users", type_="unique")
    op.drop_constraint("fk_users_active_job_id_jobs", "users", type_="foreignkey")
    op.drop_constraint("fk_users_artisan_id_artisan_profiles", "users", type_="foreignkey")
    op.drop_constraint("fk_users_member_id_members", "users", type_="foreignkey")
    op.drop_column("users", "active_job_id")
    op.drop_column("users", "artisan_id")
    op.drop_column("users", "member_id")
    op.drop_column("users", "camp_role")

    op.drop_constraint("ck_artisan_profiles_generosity_score_range", "artisan_profiles", type_="check")
    op.drop_constraint("ck_artisan_profiles_lineage_score_range", "artisan_profiles", type_="check")
    op.drop_constraint("ck_artisan_profiles_voice_score_range", "artisan_profiles", type_="check")
    op.drop_constraint("ck_artisan_profiles_craft_score_range", "artisan_profiles", type_="check")
    op.drop_constraint("ck_artisan_profiles_identity_score_range", "artisan_profiles", type_="check")
    op.drop_index("ix_artisan_profiles_parish_id", table_name="artisan_profiles")
    op.drop_constraint("uq_artisan_profiles_phone_hash", "artisan_profiles", type_="unique")
    op.drop_constraint("fk_artisan_profiles_parish_id_parishes", "artisan_profiles", type_="foreignkey")
    for column in (
        "last_active_at",
        "is_available",
        "generosity_score",
        "lineage_score",
        "voice_score",
        "craft_score",
        "identity_score",
        "vouchers_count",
        "languages",
        "years_experience",
        "photo_url",
        "bio_encrypted",
        "phone_hash",
        "phone_encrypted",
        "parish_id",
    ):
        op.drop_column("artisan_profiles", column)

    op.drop_index("ix_members_parish_id", table_name="members")
    op.drop_table("members")
    postgresql.ENUM(name="camp_role").drop(op.get_bind(), checkfirst=True)
    # PostgreSQL enum values added to artisan_trade/job_trade are intentionally retained.
