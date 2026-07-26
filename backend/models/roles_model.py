from sqlalchemy import String
from sqlalchemy import BigInteger, DateTime
from sqlalchemy.sql import func
from database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.role_permission import role_permissions
from models.user_role import user_roles
from models.permissions_model import Permission


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)

    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    description: Mapped[str | None] = mapped_column(String(255))

    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    users = relationship(
        "User",
        secondary=user_roles,
        back_populates="roles",
    )

    permissions = relationship(
        "Permission",
        secondary=role_permissions,
        back_populates="roles",
    )
