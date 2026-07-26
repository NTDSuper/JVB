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
                "value": (True if str(pav.value).lower() == "true" else pav.value),
            }
            for pav in product.attribute_values
        ],
    }


def format_product(products):
    if not products:
        return "Not Found."

    texts = []

    for product in products:
        attrs = "\n".join(
            f"  - {a['attribute_name']}: {a['value']}" for a in product["attributes"]
        )

        if not attrs:
            attrs = "  - No attributes"

        product_id = product.get("id", "")
        link_button = f'<a href="/products/{product_id}" class="chat-product-link" style="display:inline-block;margin-top:6px;padding:4px 12px;border-radius:6px;background:linear-gradient(135deg,#6366f1,#06b6d4);color:#fff;font-size:12px;font-weight:600;text-decoration:none">View Details →</a>'

        texts.append(f"""• <strong>{product['name']}</strong>

- Price: {product['price']}

{link_button}""".strip())

    return "\n\n".join(texts)


@tool
def search_product(query: str) -> str:
    """
    Search products from the supermarket database.

    Input:
        Natural language query.

    Returns:
        Formatted text with product details and links.
    """

    # 1. Vector search
    product_ids = search_vector(query, top_k=5)

    if not product_ids:
        return "Not Found."

    # 2. Fetch full data from MySQL
    db = SessionLocal()

    try:
        products = db.query(Product).filter(Product.id.in_(product_ids)).all()
        product_dicts = [_build_product_response(p) for p in products]
        return format_product(product_dicts)

    finally:
        db.close()


# Register tools in TOOLS dict for chain.py lookup
TOOLS = [
    search_product,
]
