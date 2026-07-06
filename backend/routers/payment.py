import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.users_model import User
from models.order_model import Order
from models.payment_model import Payment
from models.products_model import Product
from routers.auth import get_current_user
from schemas.payment_schema import PaymentResponse, PaymentResult
from schemas.order_schema import CheckoutRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments", tags=["Payments"])


def _deduct_stock(order: Order, db: Session):
    """Tru ton kho. KHONG commit."""
    for item in order.items:
        product = item.product
        if product.deleted_at is not None:
            raise HTTPException(
                status_code=400,
                detail=f"Product '{product.name}' ({product.sku}) is no longer available",
            )
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{product.name}' ({product.sku}): "
                       f"requested {item.quantity}, available {product.stock}",
            )
    for item in order.items:
        product = item.product
        product.stock -= item.quantity
        logger.info(f"Deducted {item.quantity} from product #{product.id} - stock now {product.stock}")


def _restore_stock(order: Order, db: Session):
    """Hoan lai ton kho. KHONG commit."""
    for item in order.items:
        product = item.product
        product.stock += item.quantity
        logger.info(f"Restored {item.quantity} to product #{product.id} - stock now {product.stock}")



# tao thanh toan moi
@router.post("/{order_id}/retry", response_model=PaymentResult)
def create_new_payment(
    order_id: int,
    payload: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Tao thanh toan moi cho don hang (khi payment cu da het han / that bai).
    - Giong nhu checkout: tao payment + expires_at + tru stock ngay
    - Order -> pending (neu dang cancelled)
    """
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status == "completed":
        raise HTTPException(status_code=400, detail="Order already completed")

    # Reset order ve pending
    if order.status == "cancelled":
        order.status = "pending"

    # Tao payment moi nhu checkout order
    from routers.order import PAYMENT_TIMEOUT_MINUTES
    expiry_time = datetime.now().replace(tzinfo=None) + timedelta(minutes=PAYMENT_TIMEOUT_MINUTES)

    new_payment = Payment(
        order_id=order.id,
        method=payload.payment_method,
        amount=float(order.total_amount),
        status="pending",
        expires_at=expiry_time,
        paid_at=None,
    )
    db.add(new_payment)
    db.flush()

    # Tru stock ngay (nhu checkout)
    try:
        _deduct_stock(order, db)
    except HTTPException as e:
        new_payment.status = "failed"
        order.status = "cancelled"
        db.commit()
        db.refresh(new_payment)
        return PaymentResult(
            success=False,
            message=e.detail,
            payment=_payment_to_response(new_payment),
        )

    db.commit()
    db.refresh(new_payment)

    logger.info(
        f"New payment #{new_payment.id} created for Order #{order.id} "
        f"by user #{current_user.id}, expires at {expiry_time}"
    )
    return PaymentResult(
        success=True,
        message=f"Tao thanh toan moi thanh cong. Thoi han: {PAYMENT_TIMEOUT_MINUTES} phut.",
        payment=_payment_to_response(new_payment),
    )


def _payment_to_response(payment: Payment) -> PaymentResponse:
    return PaymentResponse(
        id=payment.id,
        order_id=payment.order_id,
        method=payment.method,
        amount=float(payment.amount),
        status=payment.status,
        expires_at=payment.expires_at,
        paid_at=payment.paid_at,
    )


# kiem tra qua han
def check_expired_payments():
    """
    Kiem tra va xu ly cac payment da qua han tu dong.
    - Hoan lai stock
    - Payment -> failed, Order -> cancelled
    """
    from database import SessionLocal
    db = SessionLocal()
    try:
        now = datetime.now().replace(tzinfo=None)
        expired_payments = (
            db.query(Payment)
            .filter(
                Payment.status == "pending",
                Payment.expires_at <= now,
            )
            .all()
        )
        for payment in expired_payments:
            order = payment.order
            _restore_stock(order, db)
            payment.status = "failed"
            order.status = "cancelled"
            db.commit()
            logger.info(
                f"Payment #{payment.id} for Order #{payment.order_id} "
                f"expired automatically - stock restored, order cancelled"
            )
    except Exception as e:
        logger.error(f"Error processing expired payments: {e}")
        db.rollback()
    finally:
        db.close()



@router.post("/{order_id}/pay", response_model=PaymentResult)
def pay_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Xu ly thanh toan chinh:
    - Pending + chua het han -> goi /success
    - Het han / that bai -> tra ve that bai (user can retry)
    """
    check_expired_payments()

    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status == "completed":
        payment = db.query(Payment).filter(Payment.order_id == order.id, Payment.status == "completed").order_by(Payment.id.desc()).first()
        if payment:
            return PaymentResult(success=True, message="Da thanh toan truoc do.", payment=_payment_to_response(payment))

    payment = db.query(Payment).filter(Payment.order_id == order.id).order_by(Payment.id.desc()).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    now = datetime.now().replace(tzinfo=None)

    # CASE: Dang pending va chua het han -> xu ly
    if payment.status == "pending" and payment.expires_at and now <= payment.expires_at:
        logger.info(f"Processing payment #{payment.id} for Order #{order.id}")
        try:
            payment.status = "completed"
            payment.paid_at = datetime.now().replace(tzinfo=None)
            order.status = "completed"
            db.commit()
            db.refresh(payment)
            logger.info(f"Payment #{payment.id} completed by user #{current_user.id}")
            return PaymentResult(
                success=True,
                message="Thanh toan thanh cong!",
                payment=_payment_to_response(payment),
            )
        except Exception as e:
            _restore_stock(order, db)
            payment.status = "failed"
            order.status = "cancelled"
            db.commit()
            db.refresh(payment)
            logger.error(f"Payment error: {e}")
            return PaymentResult(
                success=False,
                message="Loi xu ly thanh toan. Ton kho da hoan lai.",
                payment=_payment_to_response(payment),
            )

    # CASE: Het han / that bai -> bao that bai, user tu goi /retry
    logger.info(f"Payment #{payment.id} cannot be processed - status={payment.status}, expired")
    return PaymentResult(
        success=False,
        message="Thanh toan khong the xu ly (da het han / that bai). Vui long tao lai bang /retry.",
        payment=_payment_to_response(payment),
    )


@router.get("/{order_id}", response_model=PaymentResponse)
def get_payment(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lay thong tin payment cua don hang."""
    check_expired_payments()

    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payment = db.query(Payment).filter(Payment.order_id == order.id).order_by(Payment.id.desc()).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    return _payment_to_response(payment)
