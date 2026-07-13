import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

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
)
from services.payment_service import PaymentService

logger = logging.getLogger(__name__)

# Thời gian tối đa cho phép thanh toán (phút)
PAYMENT_TIMEOUT_MINUTES = 3


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
    def checkout(payload: CheckoutRequest, current_user: User, db: Session) -> OrderResponse:
        """
        Checkout từ giỏ hàng:
        1. Kiểm tra giỏ hàng có sản phẩm
        2. Kiểm tra tồn kho (CHỈ kiểm tra, KHÔNG trừ stock)
        3. Tạo Order + OrderItems (ghi giá hiện tại)
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

        cart_items = (
            db.query(CartItem)
            .filter(CartItem.cart_id == cart.id)
            .all()
        )
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

        # 5. Tạo Order
        order = Order(
            user_id=current_user.id,
            total_amount=round(total_amount, 2),
            status="pending",
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
        expiry_time = (
            datetime.now().replace(tzinfo=None)
            + timedelta(minutes=PAYMENT_TIMEOUT_MINUTES)
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
    def get_orders(current_user: User, db: Session, skip: int = 0, limit: int = 20) -> list[OrderListResponse]:
        """Lấy danh sách đơn hàng của user hiện tại."""
        PaymentService.check_expired_payments()

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
        """Lấy chi tiết đơn hàng."""
        PaymentService.check_expired_payments()

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

        order = (
            db.query(Order)
            .filter(Order.id == order_id, Order.user_id == current_user.id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if order.status not in ("pending"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel order in '{order.status}' status",
            )

        # Cong lai san pham
        PaymentService.restore_stock(order, db)

        # Cap nhat payment status
        payment = db.query(Payment).filter(Payment.order_id == order.id).order_by(Payment.id.desc()).first()
        if payment:
            payment.status = "cancelled"

        order.status = "cancelled"
        db.commit()
        db.refresh(order)

        logger.info(f"Order #{order.id} cancelled by user #{current_user.id} - stock restored")
        return OrderService._build_order_response(order)