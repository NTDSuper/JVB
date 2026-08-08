import logging
from datetime import datetime, timezone, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from database import SessionLocal, get_db
from models.users_model import User
from models.order_model import Order
from models.payment_model import Payment
from models.products_model import Product
from schemas.payment_schema import PaymentResponse, PaymentResult
from schemas.order_schema import CheckoutRequest

logger = logging.getLogger(__name__)


class PaymentService:
    @staticmethod
    def deduct_stock(order: Order, db: Session):
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
            logger.info(
                f"Deducted {item.quantity} from product #{product.id} - stock now {product.stock}"
            )

    @staticmethod
    def restore_stock(order: Order, db: Session):
        """Hoan lai ton kho. KHONG commit."""
        for item in order.items:
            product = item.product
            product.stock += item.quantity
            logger.info(
                f"Restored {item.quantity} to product #{product.id} - stock now {product.stock}"
            )

    @staticmethod
    def _payment_to_response(payment: Payment) -> PaymentResponse:
        return PaymentResponse(
            id=payment.id,
            order_id=payment.order_id,
            method=payment.method,
            amount=float(payment.amount),
            status=payment.status,
            expires_at=payment.expires_at,
            paid_at=payment.paid_at,
            refund_at=payment.refund_at,
        )

    @staticmethod
    def create_new_payment(
        order_id: int, payload: CheckoutRequest, current_user: User, db: Session
    ) -> PaymentResult:
        """
        Tao thanh toan moi cho don hang (khi payment cu da het han / that bai).
        - Giong nhu checkout: tao payment + expires_at + tru stock ngay
        - Order -> pending (neu dang cancelled)
        """
        from services.order_service import PAYMENT_TIMEOUT_MINUTES

        order = (
            db.query(Order)
            .filter(Order.id == order_id, Order.user_id == current_user.id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if order.status == "completed":
            raise HTTPException(status_code=400, detail="Order already completed")

        if order.status == "in_progress":
            raise HTTPException(
                status_code=400, detail="Order is already being processed"
            )

        # Reset order ve pending
        if order.status == "cancelled":
            order.status = "pending"

        # Tao payment moi nhu checkout order
        expiry_time = datetime.now().replace(tzinfo=None) + timedelta(
            minutes=PAYMENT_TIMEOUT_MINUTES
        )

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
            PaymentService.deduct_stock(order, db)
        except HTTPException as e:
            new_payment.status = "failed"
            order.status = "cancelled"
            db.commit()
            db.refresh(new_payment)
            return PaymentResult(
                success=False,
                message=e.detail,
                payment=PaymentService._payment_to_response(new_payment),
            )

        db.commit()
        db.refresh(new_payment)

        logger.info(
            f"New payment #{new_payment.id} created for Order #{order.id} "
            f"by user #{current_user.id}, expires at {expiry_time}"
        )
        return PaymentResult(
            success=True,
            message=f"New payment created successfully. Expiry: {PAYMENT_TIMEOUT_MINUTES} minutes.",
            payment=PaymentService._payment_to_response(new_payment),
        )

    @staticmethod
    def check_expired_payments():
        """
        Check and process expired payments automatically.
        - Restore stock
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
                PaymentService.restore_stock(order, db)
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

    @staticmethod
    def pay_order(order_id: int, current_user: User, db: Session) -> PaymentResult:
        """
        Xu ly thanh toan chinh:
        - Pending + chua het han -> goi /success
        - Khi thanh toan thanh cong: chuyen order sang IN_PROGRESS, payment -> completed
        - Het han / that bai -> tra ve that bai (user can retry)
        """
        PaymentService.check_expired_payments()

        order = (
            db.query(Order)
            .filter(Order.id == order_id, Order.user_id == current_user.id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if order.status == "completed":
            payment = (
                db.query(Payment)
                .filter(Payment.order_id == order.id, Payment.status == "completed")
                .order_by(Payment.id.desc())
                .first()
            )
            if payment:
                return PaymentResult(
                    success=True,
                    message="Payment already completed.",
                    payment=PaymentService._payment_to_response(payment),
                )

        if order.status == "in_progress":
            payment = (
                db.query(Payment)
                .filter(Payment.order_id == order.id, Payment.status == "completed")
                .order_by(Payment.id.desc())
                .first()
            )
            if payment:
                return PaymentResult(
                    success=True,
                    message="Payment already completed.",
                    payment=PaymentService._payment_to_response(payment),
                )

        payment = (
            db.query(Payment)
            .filter(Payment.order_id == order.id)
            .order_by(Payment.id.desc())
            .first()
        )
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        now = datetime.now().replace(tzinfo=None)

        # CASE: Dang pending va chua het han -> xu ly
        if (
            payment.status == "pending"
            and payment.expires_at
            and now <= payment.expires_at
        ):
            logger.info(f"Processing payment #{payment.id} for Order #{order.id}")
            try:
                payment.status = "completed"  # Changed from "paid" to "completed"
                payment.paid_at = datetime.now().replace(tzinfo=None)
                # Thay doi: chuyen sang IN_PROGRESS thay vi COMPLETED
                order.status = "in_progress"
                db.commit()
                db.refresh(payment)
                logger.info(
                    f"Payment #{payment.id} completed by user #{current_user.id} - "
                    f"Order #{order.id} moved to IN_PROGRESS"
                )
                return PaymentResult(
                    success=True,
                    message="Payment completed successfully! Your order is being processed.",
                    payment=PaymentService._payment_to_response(payment),
                )
            except Exception as e:
                PaymentService.restore_stock(order, db)
                payment.status = "failed"
                order.status = "cancelled"
                db.commit()
                db.refresh(payment)
                logger.error(f"Payment error: {e}")
                return PaymentResult(
                    success=False,
                    message="Error processing payment. Stock has been restored.",
                    payment=PaymentService._payment_to_response(payment),
                )

        # CASE: Het han / that bai -> bao that bai, user tu goi /retry
        logger.info(
            f"Payment #{payment.id} cannot be processed - status={payment.status}, expired"
        )
        return PaymentResult(
            success=False,
            message="Payment cannot be processed (expired / failed). Please create a new one using /retry.",
            payment=PaymentService._payment_to_response(payment),
        )

    @staticmethod
    def get_payment(order_id: int, current_user: User, db: Session) -> PaymentResponse:
        """Lay thong tin payment cua don hang. Manager/Admin co the xem bat ky."""
        PaymentService.check_expired_payments()

        # Kiem tra quyen manager/admin
        user_roles = [r.name for r in current_user.roles]
        is_manager = "admin" in user_roles or "manager" in user_roles

        if is_manager:
            order = db.query(Order).filter(Order.id == order_id).first()
        else:
            order = (
                db.query(Order)
                .filter(Order.id == order_id, Order.user_id == current_user.id)
                .first()
            )

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        payment = (
            db.query(Payment)
            .filter(Payment.order_id == order.id)
            .order_by(Payment.id.desc())
            .first()
        )
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        return PaymentService._payment_to_response(payment)
