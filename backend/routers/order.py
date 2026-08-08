import logging

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from database import get_db
from models.users_model import User
from routers.auth import get_current_user
from schemas.order_schema import (
    CheckoutRequest,
    OrderItemResponse,
    OrderResponse,
    OrderListResponse,
    OrderListPaginatedResponse,
)
from services.order_service import OrderService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/orders", tags=["Orders"])


@router.post("/checkout", response_model=OrderResponse)
def checkout(
    payload: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return OrderService.checkout(payload, current_user, db)


@router.get("", response_model=list[OrderListResponse])
def get_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 20,
):
    return OrderService.get_orders(current_user, db, skip, limit)


@router.get("/all", response_model=OrderListPaginatedResponse)
def get_all_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Max records per page"),
    status: str = Query(
        None,
        description="Filter by order status: pending, in_progress, completed, cancelled",
    ),
    min_amount: float = Query(None, ge=0, description="Minimum total amount filter"),
    max_amount: float = Query(None, ge=0, description="Maximum total amount filter"),
    min_items: int = Query(None, ge=1, description="Minimum item count filter"),
    max_items: int = Query(None, ge=1, description="Maximum item count filter"),
):
    """
    Manager/Admin: Lấy danh sách tất cả đơn hàng.
    Hỗ trợ phân trang (skip, limit) và lọc theo trạng thái (status),
    tổng tiền (min_amount, max_amount) và số lượng item (min_items, max_items).
    """
    return OrderService.get_all_orders(current_user, db, skip, limit, status, min_amount, max_amount, min_items, max_items)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return OrderService.get_order(order_id, current_user, db)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """User hủy đơn hàng (chỉ khi đang PENDING, chưa thanh toán)."""
    return OrderService.cancel_order(order_id, current_user, db)


@router.post("/{order_id}/confirm", response_model=OrderResponse)
def confirm_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Manager/Admin xác nhận hoàn thành đơn hàng.
    Chuyển IN_PROGRESS -> COMPLETED.
    """
    return OrderService.admin_confirm_order(order_id, current_user, db)


@router.post("/{order_id}/admin-cancel", response_model=OrderResponse)
def admin_cancel_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Manager/Admin hủy đơn hàng.
    Chuyển IN_PROGRESS -> CANCELLED, hoàn lại tồn kho, payment -> refund.
    """
    return OrderService.admin_cancel_order(order_id, current_user, db)
