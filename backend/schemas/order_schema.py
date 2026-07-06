from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_sku: str
    quantity: int
    price: float
    subtotal: float

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: int
    user_id: int
    total_amount: float
    status: str
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    id: int
    user_id: int
    total_amount: float
    status: str
    item_count: int = 0

    class Config:
        from_attributes = True


class CheckoutRequest(BaseModel):
    payment_method: str = "cash"