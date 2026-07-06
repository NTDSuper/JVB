from sqlalchemy import Text
from sqlalchemy import String
from sqlalchemy import BigInteger, DateTime
from sqlalchemy.sql import func
from database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    slug: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(Text)

    # Relationships
    products = relationship("Product", back_populates="category")

    attributes = relationship("Attribute", back_populates="category")