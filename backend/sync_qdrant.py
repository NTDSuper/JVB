"""
Cron job to sync products from MySQL to Qdrant using APScheduler.
Runs independently, does NOT modify backend code.

Usage:
    python sync_qdrant.py                           # run once
    python sync_qdrant.py --cron                    # daily at 02:00 (default)
    python sync_qdrant.py --cron --hour 3 --minute 30  # daily at 03:30
    python sync_qdrant.py --interval 30             # every 30 minutes
"""

import os
import sys
import logging
import hashlib
from datetime import datetime
from xmlrpc import client

from ai.vector import embedding_fn, index_all_products
from sqlalchemy import text
from apscheduler.schedulers.blocking import BlockingScheduler
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance

from database import SessionLocal, engine
from ai.vector import index_all_products

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


# ---------- Qdrant setup ----------
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
_qdrant_client = QdrantClient(url=QDRANT_URL)

COLLECTION_NAME = "products"
VECTOR_SIZE = 3072
if not _qdrant_client.collection_exists(COLLECTION_NAME):
    _qdrant_client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=VECTOR_SIZE,
            distance=Distance.COSINE,
        ),
    )
existing = _qdrant_client.get_collections()
collection_names = [c.name for c in existing.collections]
if COLLECTION_NAME not in collection_names:
    _qdrant_client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
    )
    logger.info(
        "Created Qdrant collection '%s' (vector size=%d).", COLLECTION_NAME, VECTOR_SIZE
    )


def build_product_text(product):
    """Format product text for embedding - standardized format."""
    attrs = ", ".join(
        f"{attr['attribute_name']}: {attr['value']}" for attr in product["attributes"]
    )

    if not attrs:
        attrs = "None"

    return (
        f"Product: {product['name']}\n"
        f"Category: {product['category_name']}\n"
        f"Description: {product['description']}\n"
        f"Price: {product['price']}\n"
        f"Attributes: {attrs}"
    )


# ---------- Data fetching ----------
def fetch_products() -> list[dict]:
    """Read all products from DB with category & attributes."""
    with engine.connect() as conn:
        rows = conn.execute(text("""
                SELECT
                    p.id,
                    p.sku,
                    p.name,
                    p.description,
                    p.price,
                    p.cost_price,
                    p.stock,
                    p.status,
                    p.image_url,
                    c.id   AS category_id,
                    c.name AS category_name
                FROM products p
                JOIN categories c ON c.id = p.category_id
            """)).mappings().fetchall()

        attr_rows = conn.execute(text("""
                SELECT
                    pav.product_id,
                    a.id    AS attribute_id,
                    a.name  AS attribute_name,
                    a.data_type,
                    pav.value
                FROM product_attribute_values pav
                JOIN attributes a ON a.id = pav.attribute_id
            """)).mappings().fetchall()

    attr_by_product: dict[int, list[dict]] = {}
    for r in attr_rows:
        attr_by_product.setdefault(r["product_id"], []).append(
            {
                "attribute_id": r["attribute_id"],
                "attribute_name": r["attribute_name"],
                "data_type": r["data_type"],
                "value": r["value"],
            }
        )

    products = []
    for r in rows:
        products.append(
            {
                "id": r["id"],
                "sku": r["sku"],
                "name": r["name"],
                "description": r["description"] or "",
                "price": float(r["price"]),
                "cost_price": float(r["cost_price"]) if r["cost_price"] else None,
                "category_id": r["category_id"],
                "stock": r["stock"],
                "image_url": r["image_url"],
                "status": r["status"],
                "category_name": r["category_name"],
                "attributes": attr_by_product.get(r["id"], []),
            }
        )

    return products


def sync_products_to_qdrant():
    """Sync all products from MySQL to Qdrant."""
    logger.info("Starting sync products to Qdrant...")
    try:
        products = fetch_products()
        logger.info("Read %d products from database.", len(products))
        if not products:
            logger.warning("No products to sync.")
            return
        index_all_products(products, embedding_fn)
        logger.info("Successfully synced %d products to Qdrant.", len(products))
    except Exception as e:
        logger.exception("Error while syncing to Qdrant: %s", e)


if __name__ == "__main__":

    sync_products_to_qdrant()
