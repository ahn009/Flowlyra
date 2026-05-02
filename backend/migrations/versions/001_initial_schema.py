"""Initial ChatFlow schema.

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-04-29
"""

from alembic import op

from app.db.session import Base
from app import models  # noqa: F401

revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.exec_driver_sql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    Base.metadata.create_all(bind=bind)
    bind.exec_driver_sql(
        "CREATE INDEX IF NOT EXISTS idx_messages_fts ON messages USING GIN (to_tsvector('english', coalesce(content, '')))"
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.exec_driver_sql("DROP INDEX IF EXISTS idx_messages_fts")
    Base.metadata.drop_all(bind=bind)
