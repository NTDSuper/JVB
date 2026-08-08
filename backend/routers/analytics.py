"""
Analytics Dashboard API Router.
Provides endpoints for Revenue, Product, and Customer dashboards.
"""

import logging
from datetime import datetime, timezone, timedelta, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, extract, case, desc
from sqlalchemy.orm import Session

from database import get_db
from models.payment_model import Payment
from models.order_model import Order
from models.order_item_model import OrderItem
from models.products_model import Product
from models.categories_model import Category
from models.users_model import User
from models.cart_model import Cart
from routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/analytics",
    tags=["Analytics"],
)


# ── Helpers ──────────────────────────────────────────────────────────────

def _get_date_range(period: str, start_date: Optional[str], end_date: Optional[str]):
    """Convert period/date range to (start, end) datetime objects."""
    now = datetime.now(timezone.utc)
    
    if start_date and end_date:
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        return start, end
    
    if period == "week":
        start = now - timedelta(days=7)
    elif period == "month":
        start = now - timedelta(days=30)
    elif period == "year":
        start = now - timedelta(days=365)
    else:  # day
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    return start, now


def _get_prev_period_range(start: datetime, end: datetime):
    """Get the previous period of same length."""
    duration = end - start
    prev_end = start - timedelta(seconds=1)
    prev_start = prev_end - duration
    return prev_start, prev_end


# ═══════════════════════════════════════════════════════════════════════════
# 1. REVENUE DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/revenue/kpi")
def get_revenue_kpi(
    period: str = Query("month", description="day/week/month/year"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get revenue KPI cards data."""
    start, end = _get_date_range(period, start_date, end_date)
    prev_start, prev_end = _get_prev_period_range(start, end)
    
    # Current period completed payments
    current_payments = db.query(
        func.coalesce(func.sum(Payment.amount), 0).label("revenue"),
        func.count(Payment.id).label("payment_count"),
    ).filter(
        Payment.status.in_(["completed", "refunded"]),
        Payment.paid_at >= start,
        Payment.paid_at <= end,
    ).first()
    
    # Previous period completed payments
    prev_payments = db.query(
        func.coalesce(func.sum(Payment.amount), 0).label("revenue"),
        func.count(Payment.id).label("payment_count"),
    ).filter(
        Payment.status == "completed",
        Payment.paid_at >= prev_start,
        Payment.paid_at <= prev_end,
    ).first()
    
    # Total completed orders in period
    total_orders = db.query(func.count(Order.id)).filter(
        Order.status == "completed",
        Order.id.in_(
            db.query(Payment.order_id).filter(
                Payment.status == "completed",
                Payment.paid_at >= start,
                Payment.paid_at <= end,
            )
        )
    ).scalar() or 0
    
    # Cost estimation (sum of cost_price * quantity for completed orders)
    cost_data = db.query(
        func.coalesce(func.sum(Product.cost_price * OrderItem.quantity), 0)
    ).select_from(OrderItem).join(
        Product, OrderItem.product_id == Product.id
    ).join(
        Order, OrderItem.order_id == Order.id
    ).filter(
        Order.status == "completed",
        Order.id.in_(
            db.query(Payment.order_id).filter(
                Payment.status == "completed",
                Payment.paid_at >= start,
                Payment.paid_at <= end,
            )
        )
    ).scalar() or 0
    
    # Refunded/cancelled amounts in period
    refunded_amount = db.query(
        func.coalesce(func.sum(Payment.amount), 0)
    ).filter(
        Payment.status.in_(["refunded"]),
        Payment.refund_at >= start,
        Payment.refund_at <= end,
    ).scalar() or 0
    
    current_revenue = float(current_payments.revenue)
    prev_revenue = float(prev_payments.revenue)
    cost = float(cost_data)
    net_revenue = current_revenue - float(refunded_amount)
    total_bills = total_orders
    avg_bill = current_revenue / total_bills if total_bills > 0 else 0
    cost_pct = (cost / current_revenue * 100) if current_revenue > 0 else 0
    
    # Growth
    growth_pct = ((current_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
    
    return {
        "revenue": round(current_revenue, 2),
        "cost": round(cost, 2),
        "net_revenue": round(net_revenue, 2),
        "total_bills": total_bills,
        "avg_bill": round(avg_bill, 2),
        "growth_pct": round(growth_pct, 1),
        "cost_pct": round(cost_pct, 1),
        "prev_revenue": round(prev_revenue, 2),
    }


@router.get("/revenue/trend")
def get_revenue_trend(
    period: str = Query("month", description="day/week/month/year"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get revenue trend data for charts."""
    start, end = _get_date_range(period, start_date, end_date)
    
    # Group by date
    results = db.query(
        func.date(Payment.paid_at).label("date"),
        func.sum(Payment.amount).label("revenue"),
        func.count(Payment.id).label("count"),
    ).filter(
        Payment.status == "completed",
        Payment.paid_at >= start,
        Payment.paid_at <= end,
    ).group_by(
        func.date(Payment.paid_at)
    ).order_by(
        func.date(Payment.paid_at)
    ).all()
    
    data = [{"date": str(row.date), "revenue": float(row.revenue), "count": row.count} for row in results]
    
    # Previous period comparison
    prev_start, prev_end = _get_prev_period_range(start, end)
    prev_results = db.query(
        func.date(Payment.paid_at).label("date"),
        func.sum(Payment.amount).label("revenue"),
    ).filter(
        Payment.status == "completed",
        Payment.paid_at >= prev_start,
        Payment.paid_at <= prev_end,
    ).group_by(
        func.date(Payment.paid_at)
    ).order_by(
        func.date(Payment.paid_at)
    ).all()
    
    prev_data = [{"date": str(row.date), "revenue": float(row.revenue)} for row in prev_results]
    
    return {
        "current": data,
        "previous": prev_data,
        "period": period,
    }


@router.get("/revenue/bills")
def get_revenue_bills(
    period: str = Query("month", description="day/week/month/year"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get total bills by day."""
    start, end = _get_date_range(period, start_date, end_date)
    
    results = db.query(
        func.date(Payment.paid_at).label("date"),
        func.count(Payment.id).label("bills"),
        func.sum(Payment.amount).label("revenue"),
    ).filter(
        Payment.status == "completed",
        Payment.paid_at >= start,
        Payment.paid_at <= end,
    ).group_by(
        func.date(Payment.paid_at)
    ).order_by(
        func.date(Payment.paid_at)
    ).all()
    
    return [{"date": str(row.date), "bills": row.bills, "revenue": float(row.revenue)} for row in results]


# ═══════════════════════════════════════════════════════════════════════════
# 2. PRODUCT DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/products/kpi")
def get_products_kpi(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get product KPI cards data."""
    total_products = db.query(func.count(Product.id)).filter(Product.deleted_at.is_(None)).scalar() or 0
    active_products = db.query(func.count(Product.id)).filter(
        Product.deleted_at.is_(None),
        Product.status == "active",
    ).scalar() or 0
    
    # Expired products (status = inactive or archived)
    expired_products = db.query(func.count(Product.id)).filter(
        Product.deleted_at.is_(None),
        Product.status.in_(["inactive", "archived"]),
    ).scalar() or 0
    
    # Low stock products (stock > 0 and <= 10)
    low_stock = db.query(func.count(Product.id)).filter(
        Product.deleted_at.is_(None),
        Product.stock > 0,
        Product.stock <= 10,
    ).scalar() or 0
    
    return {
        "total_products": total_products,
        "active_products": active_products,
        "expired_products": expired_products,
        "low_stock": low_stock,
    }


@router.get("/products/by-category")
def get_products_by_category(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get product count by category for bar chart."""
    results = db.query(
        Category.name.label("category"),
        func.count(Product.id).label("count"),
    ).join(
        Product, Product.category_id == Category.id, isouter=True
    ).filter(
        Product.deleted_at.is_(None),
    ).group_by(
        Category.name
    ).order_by(
        desc("count")
    ).all()
    
    return [{"category": row.category or "Uncategorized", "count": row.count} for row in results]


@router.get("/products/low-stock")
def get_low_stock_products(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get products with low stock."""
    products = db.query(Product).filter(
        Product.deleted_at.is_(None),
        Product.stock > 0,
        Product.stock <= 10,
    ).order_by(Product.stock.asc()).limit(limit).all()
    
    return [{
        "id": p.id,
        "sku": p.sku,
        "name": p.name,
        "stock": p.stock,
        "status": p.status,
        "price": float(p.price),
    } for p in products]


@router.get("/products/top-selling")
def get_top_selling_products(
    by: str = Query("quantity", description="quantity or revenue"),
    limit: int = Query(5, ge=1, le=50),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get top selling products by quantity or revenue."""
    now = datetime.now(timezone.utc)
    if start_date and end_date:
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
    else:
        start = now - timedelta(days=30)
        end = now
    
    if by == "revenue":
        results = db.query(
            Product.id,
            Product.name,
            Product.sku,
            func.sum(OrderItem.quantity).label("total_qty"),
            func.sum(OrderItem.price * OrderItem.quantity).label("total_revenue"),
        ).join(
            OrderItem, OrderItem.product_id == Product.id
        ).join(
            Order, Order.id == OrderItem.order_id
        ).filter(
            Product.deleted_at.is_(None),
            Order.status == "completed",
            Order.id.in_(
                db.query(Payment.order_id).filter(
                    Payment.status == "completed",
                    Payment.paid_at >= start,
                    Payment.paid_at <= end,
                )
            )
        ).group_by(
            Product.id, Product.name, Product.sku
        ).order_by(
            desc("total_revenue")
        ).limit(limit).all()
    else:
        results = db.query(
            Product.id,
            Product.name,
            Product.sku,
            func.sum(OrderItem.quantity).label("total_qty"),
            func.sum(OrderItem.price * OrderItem.quantity).label("total_revenue"),
        ).join(
            OrderItem, OrderItem.product_id == Product.id
        ).join(
            Order, Order.id == OrderItem.order_id
        ).filter(
            Product.deleted_at.is_(None),
            Order.status == "completed",
            Order.id.in_(
                db.query(Payment.order_id).filter(
                    Payment.status == "completed",
                    Payment.paid_at >= start,
                    Payment.paid_at <= end,
                )
            )
        ).group_by(
            Product.id, Product.name, Product.sku
        ).order_by(
            desc("total_qty")
        ).limit(limit).all()
    
    return [{
        "id": r.id,
        "name": r.name,
        "sku": r.sku,
        "total_quantity": int(r.total_qty),
        "total_revenue": float(r.total_revenue),
    } for r in results]


# ═══════════════════════════════════════════════════════════════════════════
# 3. CUSTOMER DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/customers/kpi")
def get_customers_kpi(
    period: str = Query("month", description="day/week/month/year"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get customer KPI cards data."""
    start, end = _get_date_range(period, start_date, end_date)
    prev_start, prev_end = _get_prev_period_range(start, end)
    
    # Total users
    total_users = db.query(func.count(User.id)).scalar() or 0
    
    # Active users (is_active = true)
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    
    # New customers in period
    new_customers = db.query(func.count(User.id)).filter(
        User.created_at >= start,
        User.created_at <= end,
    ).scalar() or 0
    
    # Previous period new customers
    prev_new = db.query(func.count(User.id)).filter(
        User.created_at >= prev_start,
        User.created_at <= prev_end,
    ).scalar() or 0
    
    # Total completed orders in period (bills)
    total_bills = db.query(func.count(Order.id)).filter(
        Order.status == "completed",
        Order.id.in_(
            db.query(Payment.order_id).filter(
                Payment.status == "completed",
                Payment.paid_at >= start,
                Payment.paid_at <= end,
            )
        )
    ).scalar() or 0
    
    # Customers who placed orders in period (active buyers)
    active_buyers = db.query(func.count(
        func.distinct(Order.user_id)
    )).filter(
        Order.status == "completed",
        Order.id.in_(
            db.query(Payment.order_id).filter(
                Payment.status == "completed",
                Payment.paid_at >= start,
                Payment.paid_at <= end,
            )
        )
    ).scalar() or 0
    
    # Average bills per customer (Total Bill / Total Customers Purchased)
    avg_bills_per_customer = (total_bills / active_buyers) if active_buyers > 0 else 0
    
    new_growth = ((new_customers - prev_new) / prev_new * 100) if prev_new > 0 else 0
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "new_customers": new_customers,
        "new_growth": round(new_growth, 1),
        "active_buyers": active_buyers,
        "avg_bills_per_customer": round(avg_bills_per_customer, 1),
    }


@router.get("/customers/list")
def get_customers_list(
    search: Optional[str] = Query(None),
    min_spent: Optional[float] = Query(None),
    max_spent: Optional[float] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("total_spent", description="total_spent, orders_count, name"),
    sort_order: str = Query("desc", description="asc or desc"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get customer list with order stats."""
    # Subquery for customer stats
    customer_stats = db.query(
        Order.user_id,
        func.count(Order.id).label("orders_count"),
        func.coalesce(func.sum(Payment.amount), 0).label("total_spent"),
    ).join(
        Payment, Payment.order_id == Order.id
    ).filter(
        Order.status == "completed",
        Payment.status == "completed",
    ).group_by(
        Order.user_id
    ).subquery()
    
    query = db.query(
        User.id,
        User.username,
        User.email,
        User.full_name,
        User.is_active,
        User.created_at,
        func.coalesce(customer_stats.c.orders_count, 0).label("orders_count"),
        func.coalesce(customer_stats.c.total_spent, 0).label("total_spent"),
    ).outerjoin(
        customer_stats, customer_stats.c.user_id == User.id
    )
    
    # Filters
    if search:
        query = query.filter(
            User.username.ilike(f"%{search}%") |
            User.email.ilike(f"%{search}%") |
            User.full_name.ilike(f"%{search}%")
        )
    if min_spent is not None:
        query = query.filter(func.coalesce(customer_stats.c.total_spent, 0) >= min_spent)
    if max_spent is not None:
        query = query.filter(func.coalesce(customer_stats.c.total_spent, 0) <= max_spent)
    if status == "active":
        query = query.filter(User.is_active == True)
    elif status == "inactive":
        query = query.filter(User.is_active == False)
    
    # Sort
    sort_col = {
        "total_spent": func.coalesce(customer_stats.c.total_spent, 0),
        "orders_count": func.coalesce(customer_stats.c.orders_count, 0),
        "name": User.username,
    }.get(sort_by, func.coalesce(customer_stats.c.total_spent, 0))
    
    order_fn = desc if sort_order == "desc" else lambda c: c.asc()
    
    total = query.count()
    results = query.order_by(order_fn(sort_col)).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "items": [{
            "id": r.id,
            "username": r.username,
            "email": r.email,
            "full_name": r.full_name,
            "is_active": r.is_active,
            "created_at": str(r.created_at) if r.created_at else None,
            "orders_count": int(r.orders_count),
            "total_spent": float(r.total_spent),
        } for r in results],
    }


@router.get("/customers/top-spenders")
def get_top_spenders(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get top customers by total spending for bar chart."""
    results = db.query(
        User.id,
        User.username,
        User.email,
        func.coalesce(func.sum(Payment.amount), 0).label("total_spent"),
        func.count(func.distinct(Order.id)).label("orders_count"),
    ).join(
        Order, Order.user_id == User.id
    ).join(
        Payment, Payment.order_id == Order.id
    ).filter(
        Order.status == "completed",
        Payment.status == "completed",
    ).group_by(
        User.id, User.username, User.email
    ).order_by(
        desc(func.coalesce(func.sum(Payment.amount), 0))
    ).limit(limit).all()
    
    return [{
        "id": r.id,
        "username": r.username,
        "email": r.email,
        "total_spent": float(r.total_spent),
        "orders_count": int(r.orders_count),
    } for r in results]