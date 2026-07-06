import logging
import os
from dotenv import load_dotenv
from pymongo import MongoClient

logger = logging.getLogger(__name__)
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB", "supermarket")

product_collection = None
mongo_db = None
client = None

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)

    mongo_db = client[MONGO_DB_NAME]

    product_collection = mongo_db["product_search"]

    logger.info(f"MongoDB connected successfully → DB: {MONGO_DB_NAME}")
    print(f"MongoDB connected successfully → DB: {MONGO_DB_NAME}")
    print(product_collection.name)
except Exception as e:
    logger.error(f"MongoDB connection FAILED: {e}")
    logger.warning("MongoDB not available – search & sync features will be disabled")

    mongo_db = None
    product_collection = None
    client = None
