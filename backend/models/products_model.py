from sqlalchemy import Integer, Numeric, Enum
from sqlalchemy import Text
from sqlalchemy import String
from sqlalchemy import BigInteger, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id")
    )

    sku: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    slug: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(Text)

    price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )

    cost_price: Mapped[float | None] = mapped_column(
        Numeric(10, 2)
    )

    stock: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        Enum(
            "active",
            "inactive",
            "archived",
            name="product_status"
        ),
        nullable=False
    )

    image_url: Mapped[str | None] = mapped_column(
        String(255)
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime,
        server_default=func.now()
    )

    deleted_at: Mapped[DateTime | None] = mapped_column(
        DateTime,
        nullable=True,
        default=None
    )

    # Relationships
    category = relationship("Category", back_populates="products")

    cart_items = relationship("CartItem", back_populates="product")

    order_items = relationship("OrderItem", back_populates="product")

    attribute_values = relationship("ProductAttributeValue", back_populates="product")