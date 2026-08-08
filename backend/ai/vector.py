import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
import uuid
from langchain_google_genai import GoogleGenerativeAIEmbeddings

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")

try:
    client = QdrantClient(url=QDRANT_URL)
    print(client.get_collections())
except Exception as e:
    print(f"[WARN] Qdrant not available at {QDRANT_URL} - {e}")
    client = None

embeddings = GoogleGenerativeAIEmbeddings(model="gemini-embedding-001")


def embedding_fn(text: str):
    return embeddings.embed_query(text)


def build_product_text(product):
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


def upsert_product_to_qdrant(product, embedding_fn):

    # 1. tạo text để embed
    text = build_product_text(product)

    # 2. tạo vector
    vector = embedding_fn(text)

    # 3. upsert vào Qdrant
    client.upsert(
        collection_name="products",
        points=[
            PointStruct(
                id=product["id"],
                vector=vector,
                payload={
                    "product_id": product["id"],
                    "name": product["name"],
                    "category": product["category_name"],
                    "price": product["price"],
                },
            )
        ],
    )


def index_all_products(products, embedding_fn):

    for p in products:

        upsert_product_to_qdrant(product=p, embedding_fn=embedding_fn)


def search_vector(query: str, top_k=5):

    query_vector = embedding_fn(query)

    hits = client.query_points(
        collection_name="products",
        query=query_vector,
        limit=top_k,
    ).points

    return [h.payload["product_id"] for h in hits]
