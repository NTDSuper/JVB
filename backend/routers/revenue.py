"""
Revenue API Router.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from database import get_db
from models.payment_model import Payment
from models.order_model import Order
from models.users_model import User
from routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/revenue",
    tags=["Revenue"],
)


@router.get("/daily")
def get_daily_revenue(
    year: int = Query(default=None, description="Year (default: current year)"),
    month: int = Query(default=None, description="Month 1-12 (default: current month)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get daily revenue for a given month.
    Returns an array of { date: "YYYY-MM-DD", revenue: number } for each day in the month.
    """
    now = datetime.now(timezone.utc)
    year = year or now.year
    month = month or now.month

    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")

    # Query completed payments and aggregate by day
    results = (
        db.query(
            func.date(Payment.paid_at).label("date"),
            func.sum(Payment.amount).label("revenue"),
        )
        .filter(
            Payment.status == "completed",
            Payment.paid_at.isnot(None),
            extract("year", Payment.paid_at) == year,
            extract("month", Payment.paid_at) == month,
        )
        .group_by(func.date(Payment.paid_at))
        .order_by(func.date(Payment.paid_at))
        .all()
    )

    # Build a map of date -> revenue
    revenue_map = {str(row.date): float(row.revenue) for row in results}

    # Generate all days in the month
    import calendar

    days_in_month = calendar.monthrange(year, month)[1]

    daily_data = []
    for day in range(1, days_in_month + 1):
        date_str = f"{year:04d}-{month:02d}-{day:02d}"
        daily_data.append(
            {
                "date": date_str,
                "revenue": revenue_map.get(date_str, 0),
            }
        )

    return {
        "year": year,
        "month": month,
        "days": days_in_month,
        "data": daily_data,
    }
