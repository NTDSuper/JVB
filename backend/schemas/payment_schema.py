from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PaymentResponse(BaseModel):
    id: int
    order_id: int
    method: str
    amount: float
    status: str
    expires_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    refund_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaymentResult(BaseModel):
    """
    Ket qua thanh toan ro rang:
    - success=True  -> thanh toan thanh cong
    - success=False -> thanh toan that bai (kem ly do)
    """

    success: bool
    message: str
    payment: Optional[PaymentResponse] = None


class PayRequest(BaseModel):
    pass
