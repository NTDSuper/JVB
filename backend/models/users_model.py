from sqlalchemy import String, Boolean, BigInteger, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from models.user_role import user_roles
from models.roles_model import Role


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True, nullable=False
    )
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    deleted_at: Mapped[DateTime | None] = mapped_column(
        DateTime, nullable=True, default=None
    )

    # Relationships
    refresh_tokens = relationship("RefreshToken", back_populates="user")

    roles = relationship(
        "Role",
        secondary=user_roles,
        back_populates="users",
    )

    carts = relationship("Cart", back_populates="user")

    orders = relationship("Order", back_populates="user")

    @property
    def role(self):
        return [r.name for r in self.roles]

    @property
    def permission(self) -> set[str]:
        permissions = set()

        for role in self.roles:
            permissions.update(permission.code for permission in role.permissions)

        return permissions
