from sqlalchemy import ForeignKey, BigInteger
from database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship


class CartItem(Base):
    __tablename__ = "cart_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    cart_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("carts.id"), nullable=False
    )

    product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("products.id"), nullable=False
    )

    quantity: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Relationships
    cart = relationship("Cart", back_populates="items")

    product = relationship("Product", back_populates="cart_items")
