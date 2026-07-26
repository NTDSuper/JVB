from sqlalchemy import String, Numeric, BigInteger, ForeignKey, DateTime
from sqlalchemy.sql import func
from database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id"), nullable=False
    )

    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    status: Mapped[str] = mapped_column(String(255), nullable=False)

    # Relationships
    user = relationship("User", back_populates="orders")

    items = relationship("OrderItem", back_populates="order")

    payments = relationship("Payment", back_populates="order")
