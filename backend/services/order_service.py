import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_

from database import get_db
from models.users_model import User
from models.cart_model import Cart
from models.cart_item_model import CartItem
from models.order_model import Order
from models.order_item_model import OrderItem
from models.payment_model import Payment
from models.products_model import Product
from schemas.order_schema import (
    CheckoutRequest,
    OrderItemResponse,
    OrderResponse,
    OrderListResponse,
    OrderListPaginatedResponse,
)
from services.payment_service import PaymentService
from services.auth_service import AuthService
from database import SessionLocal

logger = logging.getLogger(__name__)

# Thời gian tối đa cho phép thanh toán (phút)
PAYMENT_TIMEOUT_MINUTES = 3

# Danh sach cac trang thai hop le
ORDER_STATUS_PENDING = "pending"
ORDER_STATUS_IN_PROGRESS = "in_progress"
ORDER_STATUS_COMPLETED = "completed"
ORDER_STATUS_CANCELLED = "cancelled"

# Map luot chuyen trang thai hop le
VALID_TRANSITIONS = {
    ORDER_STATUS_PENDING: [ORDER_STATUS_IN_PROGRESS, ORDER_STATUS_CANCELLED],
    ORDER_STATUS_IN_PROGRESS: [ORDER_STATUS_COMPLETED, ORDER_STATUS_CANCELLED],
    ORDER_STATUS_COMPLETED: [],
    ORDER_STATUS_CANCELLED: [],
}

#======

IN_PROGRESS_TIMEOUT_MINUTES = 5


def auto_cancel_expired_in_progress_orders():
    """
    Tự động hủy đơn hàng và hoàn tiền khi:
    - Order.status = IN_PROGRESS
    - Payment.status = "completed" (đã thanh toán)
    - Thời gian hiện tại > paid_at + IN_PROGRESS_TIMEOUT_MINUTES

    Xử lý idempotent:
    - Chỉ xử lý order chưa bị CANCELLED hoặc COMPLETED
    - Chỉ refund payment chưa bị REFUNDED
    - restore_stock chỉ chạy 1 lần (dùng check payment.status == "completed")
    """
    db = SessionLocal()
    try:
        now = datetime.now().replace(tzinfo=None)
        cutoff_time = now - timedelta(minutes=IN_PROGRESS_TIMEOUT_MINUTES)

        logger.info(
            f"[Scheduler] Checking IN_PROGRESS orders paid before {cutoff_time}..."
        )

        # Tìm tất cả order đang IN_PROGRESS với payment đã completed và quá hạn
        expired_orders = (
            db.query(Order)
            .join(Payment, Payment.order_id == Order.id)
            .filter(
                Order.status == "in_progress",
                Payment.status == "completed",
                Payment.paid_at.isnot(None),
                Payment.paid_at <= cutoff_time,
            )
            .all()
        )

        if not expired_orders:
            logger.info("[Scheduler] No expired IN_PROGRESS orders found.")
            return

        logger.info(
            f"[Scheduler] Found {len(expired_orders)} expired IN_PROGRESS orders to cancel."
        )

        for order in expired_orders:
            try:
                # Lấy payment completed gần nhất
                payment = (
                    db.query(Payment)
                    .filter(
                        Payment.order_id == order.id,
                        Payment.status == "completed",
                    )
                    .order_by(Payment.id.desc())
                    .first()
                )

                if not payment:
                    logger.warning(
                        f"[Scheduler] Order #{order.id} has no completed payment, skipping."
                    )
                    continue

                # Idempotent: nếu payment đã refund rồi thì skip
                if payment.refund_at is not None:
                    logger.info(
                        f"[Scheduler] Order #{order.id} payment already refunded at {payment.refund_at}, skipping."
                    )
                    continue

                # Hoàn lại tồn kho
                for item in order.items:
                    product = item.product
                    product.stock += item.quantity
                    logger.info(
                        f"[Scheduler] Restored {item.quantity} to product #{product.id} "
                        f"- stock now {product.stock}"
                    )

                # Chuyển payment sang REFUNDED
                payment.status = "refunded"
                payment.refund_at = now

                # Chuyển order sang CANCELLED
                order.status = "cancelled"

                db.commit()

                logger.info(
                    f"[Scheduler] Auto-cancelled Order #{order.id} - "
                    f"status: in_progress -> cancelled, "
                    f"payment: completed -> refunded, "
                    f"refund_at: {payment.refund_at}, "
                    f"stock restored"
                )

            except Exception as e:
                db.rollback()
                logger.error(
                    f"[Scheduler] Failed to auto-cancel Order #{order.id}: {e}"
                )
                continue

    except Exception as e:
        logger.error(f"[Scheduler] Error in auto_cancel_expired_in_progress_orders: {e}")
        db.rollback()
    finally:
        db.close()

    logger.info("[Scheduler] auto_cancel_expired_in_progress_orders completed.")


def validate_status_transition(current_status: str, new_status: str):
    """Kiem tra chuyen trang thai co hop le khong."""
    allowed = VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition order from '{current_status}' to '{new_status}'. "
            f"Allowed transitions: {allowed}",
        )



class OrderService:
    @staticmethod
    def _build_order_response(order: Order) -> OrderResponse:
        """Build full order response with item details."""
        items = []
        for item in order.items:
            product = item.product
            subtotal = float(item.price) * item.quantity
            items.append(
                OrderItemResponse(
                    id=item.id,
                    product_id=product.id,
                    product_name=product.name,
                    product_sku=product.sku,
                    quantity=item.quantity,
                    price=float(item.price),
                    subtotal=round(subtotal, 2),
                )
            )

        return OrderResponse(
            id=order.id,
            user_id=order.user_id,
            total_amount=float(order.total_amount),
            status=order.status,
            items=items,
        )

    @staticmethod
    def checkout(
        payload: CheckoutRequest, current_user: User, db: Session
    ) -> OrderResponse:
        """
        Checkout từ giỏ hàng:
        1. Kiểm tra giỏ hàng có sản phẩm
        2. Kiểm tra tồn kho (CHỈ kiểm tra, KHÔNG trừ stock)
        3. Tạo Order + OrderItems (ghi giá hiện tại) - status = PENDING_PAYMENT
        4. Tạo Payment (pending, thời hạn 5 phút)
        5. Xóa giỏ hàng
        - Stock sẽ được trừ tạm thời khi thanh toán (pay)
        - Nếu payment thành công → giữ nguyên stock đã trừ
        - Nếu payment thất bại / quá hạn → hoàn lại stock
        """
        # Xử lý các payment quá hạn trước
        PaymentService.check_expired_payments()

        # 1. Lấy giỏ hàng
        cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
        if not cart:
            raise HTTPException(status_code=400, detail="Cart is empty")

        cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.id).all()
        if not cart_items:
            raise HTTPException(status_code=400, detail="Cart is empty")

        # 2. Kiểm tra sản phẩm active, không bị soft-delete và tồn kho
        for ci in cart_items:
            product = ci.product
            if product.deleted_at is not None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Product '{product.name}' ({product.sku}) is no longer available",
                )
            if product.status != "active":
                raise HTTPException(
                    status_code=400,
                    detail=f"Product '{product.name}' ({product.sku}) is not available",
                )
            if product.stock < ci.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for '{product.name}' ({product.sku}): "
                    f"requested {ci.quantity}, available {product.stock}",
                )

        # 4. Tính tổng tiền
        total_amount = 0.0
        for ci in cart_items:
            product = ci.product
            total_amount += float(product.price) * ci.quantity

        # 5. Tạo Order - status = PENDING_PAYMENT (khong phai pending nua)
        order = Order(
            user_id=current_user.id,
            total_amount=round(total_amount, 2),
            status=ORDER_STATUS_PENDING,
        )
        db.add(order)
        db.flush()

        # 6. Tạo OrderItems
        for ci in cart_items:
            product = ci.product
            order_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=ci.quantity,
                price=float(product.price),
            )
            product.stock -= ci.quantity
            db.add(product)  # Trừ tồn kho tạm thời
            db.add(order_item)

        # 7. Tạo Payment (pending, hết hạn sau PAYMENT_TIMEOUT_MINUTES phút)
        expiry_time = datetime.now().replace(tzinfo=None) + timedelta(
            minutes=PAYMENT_TIMEOUT_MINUTES
        )
        payment = Payment(
            order_id=order.id,
            method=payload.payment_method,
            amount=round(total_amount, 2),
            status="pending",
            expires_at=expiry_time,
            paid_at=None,
        )
        db.add(payment)

        # 8. Xóa giỏ hàng
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        db.delete(cart)

        db.commit()
        db.refresh(order)

        logger.info(
            f"Order #{order.id} created for user #{current_user.id}, "
            f"total={total_amount}, stock checked OK, payment expires at {expiry_time}"
        )

        return OrderService._build_order_response(order)

    @staticmethod
    def get_orders(
        current_user: User, db: Session, skip: int = 0, limit: int = 20
    ) -> list[OrderListResponse]:
        """Lấy danh sách đơn hàng của user hiện tại."""
        PaymentService.check_expired_payments()
        auto_cancel_expired_in_progress_orders()

        orders = (
            db.query(Order)
            .filter(Order.user_id == current_user.id)
            .order_by(Order.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        result = []
        for order in orders:
            result.append(
                OrderListResponse(
                    id=order.id,
                    user_id=order.user_id,
                    total_amount=float(order.total_amount),
                    status=order.status,
                    item_count=len(order.items),
                )
            )

        return result

    @staticmethod
    def get_order(order_id: int, current_user: User, db: Session) -> OrderResponse:
        """Lấy chi tiết đơn hàng. Manager/Admin co the xem bat ky."""
        PaymentService.check_expired_payments()
        auto_cancel_expired_in_progress_orders()

        # Kiem tra user co role admin/manager khong
        user_roles = [r.name for r in current_user.roles]
        is_manager = "admin" in user_roles or "manager" in user_roles

        if is_manager:
            # Manager/Admin co the xem tat ca don hang
            order = db.query(Order).filter(Order.id == order_id).first()
        else:
            # User chi xem duoc don hang cua minh
            order = (
                db.query(Order)
                .filter(Order.id == order_id, Order.user_id == current_user.id)
                .first()
            )

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        return OrderService._build_order_response(order)

    @staticmethod
    def cancel_order(order_id: int, current_user: User, db: Session) -> OrderResponse:
        """
        Hủy đơn hàng (chỉ khi đang pending, chưa thanh toán).
        - Payment -> cancelled
        - Cong lai san pham (restore stock)
        - Order -> cancelled
        """
        PaymentService.check_expired_payments()
        auto_cancel_expired_in_progress_orders()

        order = (
            db.query(Order)
            .filter(Order.id == order_id, Order.user_id == current_user.id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        # User chi co the huy don hang dang pending (chua thanh toan)
        if order.status not in (ORDER_STATUS_PENDING,):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel order in '{order.status}' status. "
                f"Only pending orders can be cancelled by the user.",
            )

        # Cong lai san pham
        PaymentService.restore_stock(order, db)

        # Cap nhat payment status
        payment = (
            db.query(Payment)
            .filter(Payment.order_id == order.id)
            .order_by(Payment.id.desc())
            .first()
        )
        if payment:
            payment.status = "cancelled"

        order.status = ORDER_STATUS_CANCELLED
        db.commit()
        db.refresh(order)

        logger.info(
            f"Order #{order.id} cancelled by user #{current_user.id} - stock restored"
        )
        return OrderService._build_order_response(order)

    @staticmethod
    def admin_confirm_order(
        order_id: int, current_user: User, db: Session
    ) -> OrderResponse:
        """
        Manager/Admin xac nhan hoan thanh don hang.
        - Chi khi order dang IN_PROGRESS
        - Chuyen IN_PROGRESS -> COMPLETED
        - Khong thay doi ton kho
        - Payment status giu nguyen la "completed"
        """
        PaymentService.check_expired_payments()
        auto_cancel_expired_in_progress_orders()

        # Kiem tra quyen
        user_roles = [r.name for r in current_user.roles]
        if "admin" not in user_roles and "manager" not in user_roles:
            raise HTTPException(
                status_code=403,
                detail="Only admin or manager can confirm orders",
            )

        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        # Kiem tra chuyen trang thai hop le
        validate_status_transition(order.status, ORDER_STATUS_COMPLETED)

        # Chuyen sang COMPLETED
        order.status = ORDER_STATUS_COMPLETED
        db.commit()
        db.refresh(order)

        logger.info(
            f"Order #{order.id} confirmed as COMPLETED by {current_user.email} "
            f"(role: {user_roles})"
        )
        return OrderService._build_order_response(order)

    @staticmethod
    def admin_cancel_order(
        order_id: int, current_user: User, db: Session
    ) -> OrderResponse:
        """
        Manager/Admin huy don hang.
        - Chi khi order dang IN_PROGRESS
        - Chuyen IN_PROGRESS -> CANCELLED
        - Hoan lai toan bo ton kho trong transaction
        - Payment status -> refund
        - Dam bao idempotent (khong the hoan kho nhieu lan)
        """
        PaymentService.check_expired_payments()
        auto_cancel_expired_in_progress_orders()

        # Kiem tra quyen
        user_roles = [r.name for r in current_user.roles]
        if "admin" not in user_roles and "manager" not in user_roles:
            raise HTTPException(
                status_code=403,
                detail="Only admin or manager can cancel orders",
            )

        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        # Kiem tra chuyen trang thai hop le
        validate_status_transition(order.status, ORDER_STATUS_CANCELLED)

        # Hoan lai toan bo ton kho (trong transaction)
        try:
            PaymentService.restore_stock(order, db)
            order.status = ORDER_STATUS_CANCELLED

            # Cap nhat payment status -> refund, set refund_at
            payment = (
                db.query(Payment)
                .filter(Payment.order_id == order.id)
                .order_by(Payment.id.desc())
                .first()
            )
            if payment and payment.status == "completed":
                payment.status = "refunded"
                payment.refund_at = datetime.now().replace(tzinfo=None)
                logger.info(
                    f"Payment #{payment.id} for Order #{order.id} set to refunded"
                )

            db.commit()
            db.refresh(order)
        except Exception as e:
            db.rollback()
            logger.error(
                f"Failed to cancel Order #{order.id} by {current_user.email}: {e}"
            )
            raise HTTPException(
                status_code=500,
                detail=f"Failed to cancel order and restore stock: {str(e)}",
            )

        logger.info(
            f"Order #{order.id} cancelled by {current_user.email} "
            f"(role: {user_roles}) - stock restored, payment refunded"
        )
        return OrderService._build_order_response(order)

    @staticmethod
    def get_all_orders(
        current_user: User,
        db: Session,
        skip: int = 0,
        limit: int = 20,
        status: str = None,
    ) -> OrderListPaginatedResponse:
        """
        Manager/Admin lay danh sach tat ca don hang co phan trang va filter theo status.
        Yeu cau permission 'order:read'.
        """
        # Kiem tra quyen bang permission code
        permissions = AuthService.get_permission_codes(current_user)
        if "order:read" not in permissions:
            raise HTTPException(
                status_code=403,
                detail="Permission denied: 'order:read' required to view all orders",
            )

        PaymentService.check_expired_payments()
        auto_cancel_expired_in_progress_orders()
        
        # Xay dung query
        query = db.query(Order)

        # Filter theo status neu co
        if status:
            valid_statuses = [
                ORDER_STATUS_PENDING,
                ORDER_STATUS_IN_PROGRESS,
                ORDER_STATUS_COMPLETED,
                ORDER_STATUS_CANCELLED,
            ]
            if status not in valid_statuses:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid status '{status}'. Valid values: {', '.join(valid_statuses)}",
                )
            query = query.filter(Order.status == status)

        # Dem tong so ban ghi
        total_count = query.count()

        # Lay du lieu phan trang
        orders = (
            query
            .order_by(Order.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        items = []
        for order in orders:
            items.append(
                OrderListResponse(
                    id=order.id,
                    user_id=order.user_id,
                    total_amount=float(order.total_amount),
                    status=order.status,
                    item_count=len(order.items),
                )
            )

        return OrderListPaginatedResponse(
            items=items,
            total=total_count,
            skip=skip,
            limit=limit,
        )