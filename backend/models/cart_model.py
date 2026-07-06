from sqlalchemy import BigInteger, ForeignKey
from database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Cart(Base):
    __tablename__ = "carts"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="carts")

    items = relationship("CartItem", back_populates="cart")