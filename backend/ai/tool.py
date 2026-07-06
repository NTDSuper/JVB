from langchain_core.tools import tool
from database import SessionLocal
from sqlalchemy.orm import joinedload
from models.products_model import Product
from ai.vector import search_vector
import models.users_model
import models.cart_model
import models.cart_item_model
import models.products_model
import models.users_model
import models.roles_model
import models.permissions_model
import models.refresh_tokens_model

import models.cart_model
import models.cart_item_model

import models.products_model
import models.categories_model
import models.attribute_model
import models.product_attribute_value_model

import models.order_model
import models.order_item_model

import models.payment_model
# Tool registry for chain.py lookup by name
TOOLS = {}

def _build_product_response(product):
    return {
        "id": product.id,
        "name": product.name,
        "price": float(product.price),
        "description": product.description,
        "status": product.status,
        "stock": product.stock,
        "category_name": product.category.name if product.category else None,
        "attributes": [
            {
                "attribute_name": pav.attribute.name,
                "value": (
                    True
                    if str(pav.value).lower() == "true"
                    else pav.value
                ),
            }
            for pav in product.attribute_values
        ],
    }

def format_product(products):
    if not products:
        return "No products found."

    texts = []

    for product in products:
        attrs = "\n".join(
            f"- {a['attribute_name']}: {a['value']}"
            for a in product["attributes"]
        )

        if not attrs:
            attrs = "None"

        texts.append(
            f"""
Product:
Name: {product['name']}
Category: {product['category_name']}
Price: {product['price']}
Stock: {product['stock']}
Description: {product['description']}
Attributes:
{attrs}
""".strip()
        )

    return "\n\n".join(texts)


@tool
def search_product(query: str) -> list[dict]:
    """
    Search products from the supermarket database.

    Input:
        Natural language query.

    Returns:
        Relevant products with:
        - name
        - category
        - price
        - description
        - attributes
        - stock
    """

    # 1. Vector search
    product_ids = search_vector(query, top_k=5)

    if not product_ids:
        return []

    # 2. Fetch full data from MySQL
    db = SessionLocal()

    try:
        products = db.query(Product).filter(Product.id.in_(product_ids)).all()

        return [_build_product_response(p) for p in products];

    finally:
        db.close()


# Register tools in TOOLS dict for chain.py lookup
TOOLS = [
    search_product,
]