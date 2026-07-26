import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.users_model import User
from routers.auth import get_current_user
from schemas.payment_schema import PaymentResponse, PaymentResult
from schemas.order_schema import CheckoutRequest
from services.payment_service import PaymentService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments", tags=["Payments"])


@router.post("/{order_id}/retry", response_model=PaymentResult)
def create_new_payment(
    order_id: int,
    payload: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PaymentService.create_new_payment(order_id, payload, current_user, db)


@router.post("/{order_id}/pay", response_model=PaymentResult)
def pay_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PaymentService.pay_order(order_id, current_user, db)


@router.get("/{order_id}", response_model=PaymentResponse)
def get_payment(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PaymentService.get_payment(order_id, current_user, db)
