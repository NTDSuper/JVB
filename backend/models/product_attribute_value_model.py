from sqlalchemy import Integer, Text, BigInteger, ForeignKey
from database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship


class ProductAttributeValue(Base):
    __tablename__ = "product_attribute_values"

    product_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("products.id"),
        primary_key=True
    )

    attribute_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("attributes.id"),
        primary_key=True
    )

    value: Mapped[str | None] = mapped_column(Text)

    # Relationships
    product = relationship("Product", back_populates="attribute_values")

    attribute = relationship("Attribute", back_populates="product_attribute_values")