import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.logging_config import *
from database import Base, engine
import models
from routers import auth, user, product, cart, order, payment, attribute, chat, dashboard
from utils.redis_client import redis_client

app = FastAPI()


logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
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