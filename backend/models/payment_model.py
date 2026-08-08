from sqlalchemy import String, Numeric, BigInteger, ForeignKey, DateTime
from sqlalchemy.sql import func
from database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    order_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("orders.id"), nullable=False
    )

    method: Mapped[str] = mapped_column(String(255), nullable=False)

    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")

    expires_at: Mapped[DateTime | None] = mapped_column(DateTime)

    paid_at: Mapped[DateTime | None] = mapped_column(DateTime)

    refund_at: Mapped[DateTime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    order = relationship("Order", back_populates="payments")
