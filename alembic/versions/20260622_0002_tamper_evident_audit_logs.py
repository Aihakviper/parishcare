"""Create tamper-evident, append-only audit logs.

Revision ID: 20260622_0002
Revises: 20260621_0001
Create Date: 2026-06-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260622_0002"
down_revision: Union[str, Sequence[str], None] = "20260621_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "audit_logs",
        sa.Column(
            "sequence_number",
            sa.BigInteger(),
            sa.Identity(always=True),
            nullable=False,
        ),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("entity_type", sa.String(length=120), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "before_state",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "after_state",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("prev_hash", sa.String(length=64), nullable=False),
        sa.Column("entry_hash", sa.String(length=64), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.CheckConstraint(
            "char_length(action) > 0",
            name=op.f("ck_audit_logs_action_not_empty"),
        ),
        sa.CheckConstraint(
            "char_length(entity_type) > 0",
            name=op.f("ck_audit_logs_entity_type_not_empty"),
        ),
        sa.CheckConstraint(
            "prev_hash ~ '^[0-9a-f]{64}$'",
            name=op.f("ck_audit_logs_prev_hash_format"),
        ),
        sa.CheckConstraint(
            "entry_hash ~ '^[0-9a-f]{64}$'",
            name=op.f("ck_audit_logs_entry_hash_format"),
        ),
        sa.ForeignKeyConstraint(
            ["actor_id"],
            ["users.id"],
            name=op.f("fk_audit_logs_actor_id_users"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_audit_logs")),
        sa.UniqueConstraint(
            "sequence_number",
            name=op.f("uq_audit_logs_sequence_number"),
        ),
    )
    op.create_index(
        "ix_audit_logs_actor_id",
        "audit_logs",
        ["actor_id"],
        unique=False,
    )
    op.create_index(
        "ix_audit_logs_entity",
        "audit_logs",
        ["entity_type", "entity_id"],
        unique=False,
    )
    op.create_index(
        "ix_audit_logs_timestamp",
        "audit_logs",
        ["timestamp"],
        unique=False,
    )

    op.execute(
        """
        CREATE FUNCTION prevent_audit_log_mutation()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
            RAISE EXCEPTION 'audit_logs is append-only';
            RETURN NULL;
        END;
        $$
        """
    )
    op.execute(
        """
        CREATE TRIGGER audit_logs_block_update_delete
        BEFORE UPDATE OR DELETE ON audit_logs
        FOR EACH ROW
        EXECUTE FUNCTION prevent_audit_log_mutation()
        """
    )
    op.execute("REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM PUBLIC")


def downgrade() -> None:
    op.execute(
        "DROP TRIGGER IF EXISTS audit_logs_block_update_delete ON audit_logs"
    )
    op.execute("DROP FUNCTION IF EXISTS prevent_audit_log_mutation()")
    op.drop_index("ix_audit_logs_timestamp", table_name="audit_logs")
    op.drop_index("ix_audit_logs_entity", table_name="audit_logs")
    op.drop_index("ix_audit_logs_actor_id", table_name="audit_logs")
    op.drop_table("audit_logs")
