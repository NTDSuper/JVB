def format_product(products):
    if not products:
        return "Not Found."

    texts = []

    for product in products:
        attrs = "\n".join(
            f"  - {a['attribute_name']}: {a['value']}"
            for a in product["attributes"]
        )

        if not attrs:
            attrs = "  - No attributes"

        product_id = product.get("id", "")
        link_button = f'<a href="/products/{product_id}" class="chat-product-link" style="display:inline-block;margin-top:6px;padding:4px 12px;border-radius:6px;background:linear-gradient(135deg,#6366f1,#06b6d4);color:#fff;font-size:12px;font-weight:600;text-decoration:none">View Details →</a>'

        texts.append(
            f"""• <strong>{product['name']}</strong>""".strip()
        )

    return "\n\n".join(texts)
