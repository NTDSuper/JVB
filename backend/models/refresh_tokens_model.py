from sqlalchemy import BigInteger, Boolean, DateTime, String, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    jti: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)

    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    ip_address: Mapped[str | None] = mapped_column(String(45))

    user_agent: Mapped[str | None] = mapped_column(String(512))

    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    expired_at: Mapped[DateTime] = mapped_column(DateTime, nullable=False)

    user = relationship("User", back_populates="refresh_tokens")
