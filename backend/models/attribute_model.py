from sqlalchemy import Integer, String, Boolean, BigInteger, ForeignKey
from database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Attribute(Base):
    __tablename__ = "attributes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    category_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("categories.id")
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    data_type: Mapped[str] = mapped_column(String(50), nullable=False)

    required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    category = relationship("Category", back_populates="attributes")

    product_attribute_values = relationship(
        "ProductAttributeValue", back_populates="attribute"
    )
