import datetime
from pymongo import ReplaceOne
import logging
from models.products_model import Product
from utils.mongodb import product_collection, mongo_db

logger = logging.getLogger(__name__)


def sync_products(db):
    """
    Đồng bộ danh sách sản phẩm từ MySQL (bảng products) lên MongoDB.

    - Upsert tất cả sản phẩm MySQL vào collection 'product_search' trong MongoDB.
    - Xoá các sản phẩm trong MongoDB không còn tồn tại trong MySQL.
    - Ghi log kết quả đồng bộ vào collection 'sync_log'.
    """
    if product_collection is None or mongo_db is None:
        logger.warning("MongoDB not configured – skipping sync")
        return

    sync_log = {
        "timestamp": datetime.datetime.utcnow(),
        "status": "started",
        "mysql_products_count": 0,
        "upserted_count": 0,
        "modified_count": 0,
        "deleted_count": 0,
        "error_message": None,
    }

    try:
        products = db.query(Product).all()
        sync_log["mysql_products_count"] = len(products)
        logger.info(f"Found {len(products)} products in MySQL to sync")

        if not products:
            logger.warning("No products found to sync. Clearing MongoDB collection.")
            delete_result = product_collection.delete_many({})
            sync_log["deleted_count"] = delete_result.deleted_count
            sync_log["status"] = "success"
            sync_log["error_message"] = None
            return

        # Prepare bulk write operations
        operations = []
        mysql_product_ids = []

        for p in products:
            mysql_product_ids.append(p.id)
            print(p.id)
            doc = {
                "product_id": p.id,
                "sku": p.sku,
                "name": p.name,
                "slug": p.slug,
                "description": p.description or "",
                "price": float(p.price),
                "cost_price": float(p.cost_price) if p.cost_price else None,
                "category_id": p.category_id,
                "stock": p.stock,
                "status": p.status,
                "attributes": p.attributes or {},
                "image_url": p.image_url or "",
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            }
            # ReplaceOne with upsert=True safely updates existing or inserts new
            operations.append(ReplaceOne({"product_id": p.id}, doc, upsert=True))

        # 1. Upsert all products from MySQL to MongoDB
        if operations:
            result = product_collection.bulk_write(operations)
            sync_log["upserted_count"] = result.upserted_count
            sync_log["modified_count"] = result.modified_count
            logger.info(
                f"MongoDB Sync: {result.upserted_count} inserted, "
                f"{result.modified_count} updated"
            )

        # 2. Cleanup: Delete products in MongoDB that no longer exist in MySQL
        delete_result = product_collection.delete_many(
            {"product_id": {"$nin": mysql_product_ids}}
        )
        sync_log["deleted_count"] = delete_result.deleted_count
        if delete_result.deleted_count > 0:
            logger.info(
                f"MongoDB Sync: Removed {delete_result.deleted_count} deleted products"
            )
        logger.info("MongoDB Sync completed successfully")
        sync_log["status"] = "success"

    except Exception as e:
        sync_log["status"] = "failed"
        sync_log["error_message"] = str(e)
        logger.error(f"MongoDB Sync Failed: {str(e)}")
        raise e
    finally:
        # Ghi log vào MongoDB (cố gắng ghi ngay cả khi sync có lỗi)
        if mongo_db is not None:
            try:
                mongo_db["sync_log"].insert_one(sync_log)
            except Exception as log_e:
                logger.error(f"Failed to write sync log to MongoDB: {log_e}")
