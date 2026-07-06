import string

from pydantic import BaseModel
from typing import Optional, Any


class ProductAttributeInput(BaseModel):
    """Dùng name (string) thay vì attribute_id - backend tự map."""
    name: str
    value: str


class ProductCreate(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    price: float
    cost_price: Optional[float] = None
    category_id: Optional[int] = None
    stock: int
    image_url: Optional[str] = None
    status: str = "active"
    attributes: list[ProductAttributeInput] = []


class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    cost_price: Optional[float] = None
    category_id: Optional[int] = None
    stock: Optional[int] = None
    image_url: Optional[str] = None
    attributes: Optional[list[ProductAttributeInput]] = None


class ProductStatusUpdate(BaseModel):
    status: str


class ProductAttributeResponse(BaseModel):
    attribute_id: int
    attribute_name: str
    data_type: str
    value: Optional[str] = None

    class Config:
        from_attributes = True


class ProductResponse(BaseModel):
    id: int
    sku: str
    name: str
    description: Optional[str]
    price: float
    cost_price: Optional[float]
    category_id: Optional[int]
    stock: int
    image_url: Optional[str]
    status: str
    category_name: str | None = None
    attributes: list[ProductAttributeResponse] = []
    deleted_at: Optional[str] = None

    class Config:
        from_attributes = True


class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None

    class Config:
        from_attributes = True