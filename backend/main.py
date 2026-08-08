import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from core.logging_config import *
from database import Base, engine
import models
from routers import (
    auth,
    user,
    product,
    cart,
    order,
    payment,
    attribute,
    chat,
    dashboard,
    roles,
    revenue,
    upload,
    analytics,
)
from utils.redis_client import redis_client
from services.order_service import auto_cancel_expired_in_progress_orders
from sync_qdrant import sync_products_to_qdrant

app = FastAPI()


logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("CORS middleware configured")

app.include_router(chat.router)
logger.info("Chat router loaded")

app.include_router(auth.router)
logger.info("Auth router loaded")

app.include_router(user.router)
logger.info("Users router loaded")

app.include_router(product.router)
logger.info("Products router loaded")

app.include_router(cart.router)
logger.info("Cart router loaded")

app.include_router(order.router)
logger.info("Order router loaded")

app.include_router(payment.router)
logger.info("Payment router loaded")

app.include_router(attribute.router)
logger.info("Attribute router loaded")

app.include_router(dashboard.router)
logger.info("Dashboard router loaded")

app.include_router(roles.router)
logger.info("Roles router loaded")

app.include_router(revenue.router)
logger.info("Revenue router loaded")

app.include_router(upload.router)
app.include_router(analytics.router)
logger.info("Upload router loaded")

# Khởi tạo scheduler nền để tự động hủy đơn hàng quá hạn
scheduler = BackgroundScheduler()
scheduler.add_job(
    auto_cancel_expired_in_progress_orders,
    "interval",
    minutes=1,
    id="auto_cancel_expired_orders",
    name="Auto-cancel expired IN_PROGRESS orders",
    replace_existing=True,
)
# Lập lịch sync sản phẩm từ MySQL sang Qdrant hàng ngày lúc 02:00
scheduler.add_job(
    sync_products_to_qdrant,
    "cron",
    hour=2,
    minute=0,
    id="sync_qdrant_daily",
    name="Daily sync products to Qdrant",
    replace_existing=True,
)
scheduler.start()
logger.info(
    "Background scheduler started - auto-cancel expired IN_PROGRESS orders every 1 minute, "
    "sync Qdrant daily at 02:00"
)


@app.on_event("shutdown")
def shutdown_scheduler():
    scheduler.shutdown()
    logger.info("Background scheduler shut down")


@app.get("/redis-test")
def test():
    logger.info("Redis test")

    try:
        redis_client.set("test", "ok")
        value = redis_client.get("test")

        logger.info("Redis set/get successful")

        return value

    except Exception:
        logger.exception("Redis test failed")
        return {"error": "Redis failed"}


@app.get("/ping", tags=["Health"])
def ping():
    """Check server status – no authentication required"""
    logger.info("Ping endpoint called")

    return {"status": "ok", "message": "pong"}
