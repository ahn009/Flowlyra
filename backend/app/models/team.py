from datetime import datetime
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import UUIDPkMixin


team_members = Table(
    "team_members",
    Base.metadata,
    Column("team_id", UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("priority", Integer, default=0, server_default="0", nullable=False),
)


class Team(UUIDPkMixin, Base):
    __tablename__ = "teams"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    routing_mode: Mapped[str] = mapped_column(String(20), default="round_robin")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    members = relationship("User", secondary=team_members)
