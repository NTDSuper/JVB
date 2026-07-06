"""
seed.py – Seed sample data into MySQL.
Run: python seed.py
"""

import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))

load_dotenv()

from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
import random
import re


def slugify(text_str: str) -> str:
    """Generate a URL-friendly slug from a string."""
    s = text_str.lower().strip()
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'[\s_]+', '-', s)
    s = re.sub(r'-+', '-', s)
    return s

from database import SessionLocal, engine, Base

# Import all models
from models.permissions_model import Permission
from models.role_permission import role_permissions
from models.user_role import user_roles
from models.roles_model import Role
from models.refresh_tokens_model import RefreshToken
from models.users_model import User
from models.categories_model import Category
from models.products_model import Product
from models.attribute_model import Attribute
from models.product_attribute_value_model import ProductAttributeValue
from models.cart_model import Cart
from models.cart_item_model import CartItem
from models.order_model import Order
from models.order_item_model import OrderItem
from models.payment_model import Payment

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)


# ──────────────────────────────────────────────
# SEED DATA
# ──────────────────────────────────────────────

PERMISSIONS_DATA = [
    {"id": 1, "name": "View Products",   "code": "product:read",   "description": "Permission to view product list and details"},
    {"id": 2, "name": "Create Products", "code": "product:create", "description": "Permission to create new products"},
    {"id": 3, "name": "Update Products", "code": "product:update", "description": "Permission to update existing products"},
    {"id": 4, "name": "Delete Products", "code": "product:delete", "description": "Permission to delete products"},
    {"id": 5, "name": "View Users",      "code": "user:read",      "description": "Permission to view user list"},
    {"id": 6, "name": "Update Users",    "code": "user:update",    "description": "Permission to update users"},
    {"id": 7, "name": "Delete Users",    "code": "user:delete",    "description": "Permission to delete users"},
    {"id": 8, "name": "Manage Roles",    "code": "role:manage",    "description": "Permission to manage roles and permissions"},
    {"id": 9, "name": "View Orders",     "code": "order:read",     "description": "Permission to view orders"},
    {"id": 10, "name": "Manage Orders",  "code": "order:manage",   "description": "Permission to manage orders"},
    {"id": 11, "name": "View Payments",  "code": "payment:read",   "description": "Permission to view payments"},
    {"id": 12, "name": "Manage Payments","code": "payment:manage", "description": "Permission to manage payments"},
]

ROLES_DATA = [
    {"id": 1, "name": "admin",   "description": "Administrator – full system access"},
    {"id": 2, "name": "manager", "description": "Manager – manages products and users"},
    {"id": 3, "name": "staff",   "description": "Staff – read-only product access"},
    {"id": 4, "name": "user",    "description": "Regular user – assigned automatically on registration"},
]

# Role permissions mapping (role_id → [permission_code])
ROLE_PERMISSIONS = {
    1: ["product:read", "product:create", "product:update", "product:delete",
        "user:read", "user:update", "user:delete", "role:manage",
        "order:read", "order:manage", "payment:read", "payment:manage"],
    2: ["product:read", "product:create", "product:update",
        "user:read", "user:update", "order:read", "payment:read"],
    3: ["product:read", "order:read"],
    4: ["product:read"],
}

USERS_DATA = [
    {
        "id": 1,
        "username": "admin",
        "email": "admin@supermarket.com",
        "password": "Admin@123",
        "full_name": "System Administrator",
        "is_active": True,
        "roles": ["admin"],
    },
    {
        "id": 2,
        "username": "manager01",
        "email": "manager01@supermarket.com",
        "password": "Manager@123",
        "full_name": "John Manager",
        "is_active": True,
        "roles": ["manager"],
    },
    {
        "id": 3,
        "username": "staff01",
        "email": "staff01@supermarket.com",
        "password": "Staff@123",
        "full_name": "Alice Staff",
        "is_active": True,
        "roles": ["staff"],
    },
    {
        "id": 4,
        "username": "staff02",
        "email": "staff02@supermarket.com",
        "password": "Staff@123",
        "full_name": "Bob Staff",
        "is_active": False,
        "roles": ["staff"],
    },
    {
        "id": 5,
        "username": "user01",
        "email": "user01@supermarket.com",
        "password": "User@123",
        "full_name": "Regular User",
        "is_active": True,
        "roles": ["user"],
    },
    {
        "id": 6,
        "username": "user02",
        "email": "user02@supermarket.com",
        "password": "User@123",
        "full_name": "Jane Customer",
        "is_active": True,
        "roles": ["user"],
    },
    {
        "id": 7,
        "username": "user03",
        "email": "user03@supermarket.com",
        "password": "User@123",
        "full_name": "Mike Shopper",
        "is_active": True,
        "roles": ["user"],
    },
]

CATEGORIES_DATA = [
    {"id": 1,  "name": "Food",              "description": "Essential food items"},
    {"id": 2,  "name": "Beverages",         "description": "Drinks and beverages"},
    {"id": 3,  "name": "Household",         "description": "Household goods"},
    {"id": 4,  "name": "Personal Care",     "description": "Hygiene and beauty products"},
    {"id": 5,  "name": "Vegetables & Fruits", "description": "Fresh vegetables and fruits"},
    {"id": 6,  "name": "Meat & Seafood",    "description": "Fresh meat and seafood"},
    {"id": 7,  "name": "Snacks & Candy",    "description": "Cookies, candy and snacks"},
    {"id": 8,  "name": "Soft Drinks",       "description": "Carbonated drinks and sodas"},
    {"id": 9,  "name": "Juice & Milk",      "description": "Fruit juice and milk products"},
]

PRODUCTS_DATA = [
    # ── Vegetables & Fruits ──
    {
        "id": 1, "sku": "VEG-001", "name": "Fresh Carrots 500g",
        "description": "Fresh imported carrots, rich in vitamin A.",
        "price": 1.50, "cost_price": 0.90, "category_id": 5,
        "stock": 2, "status": "active",
        "image_url": "https://placehold.co/400x300?text=Carrots",
    },
    {
        "id": 2, "sku": "VEG-002", "name": "Green Cabbage 1kg",
        "description": "Fresh green cabbage, high in fiber.",
        "price": 2.00, "cost_price": 1.20, "category_id": 5,
        "stock": 3, "status": "active",
        "image_url": "https://placehold.co/400x300?text=Cabbage",
    },
    {
        "id": 3, "sku": "VEG-003", "name": "Cherry Tomatoes 250g",
        "description": "Sweet cherry tomatoes, great for salads.",
        "price": 1.80, "cost_price": 1.10, "category_id": 5,
        "stock": 300, "status": "active",
        "image_url": "https://placehold.co/400x300?text=Cherry+Tomatoes",
    },
    {
        "id": 4, "sku": "VEG-004", "name": "Organic Spinach 200g",
        "description": "Fresh organic spinach leaves, rich in iron.",
        "price": 2.50, "cost_price": 1.80, "category_id": 5,
        "stock": 100, "status": "active",
        "image_url": "https://placehold.co/400x300?text=Spinach",
    },
    {
        "id": 5, "sku": "VEG-005", "name": "Bell Peppers 3pcs",
        "description": "Mixed colored bell peppers, rich in vitamin C.",
        "price": 3.20, "cost_price": 2.40, "category_id": 5,
        "stock": 80, "status": "active",
        "image_url": "https://placehold.co/400x300?text=Bell+Peppers",
    },
    # ── Meat & Seafood ──
    {
        "id": 6, "sku": "MEA-001", "name": "Pork Belly 500g",
        "description": "Fresh pork belly, traceable origin.",
        "price": 8.50, "cost_price": 6.50, "category_id": 6,
        "stock": 80, "status": "active",
        "image_url": "https://placehold.co/400x300?text=Pork+Belly",
    },
    {
        "id": 7, "sku": "SEA-001", "name": "Fresh Tiger Shrimp 500g",
        "description": "Large fresh tiger shrimp from local farms.",
        "price": 14.00, "cost_price": 10.50, "category_id": 6,
        "stock": 50, "status": "active",
        "image_url": "https://placehold.co/400x300?text=Tiger+Shrimp",
    },
    {
        "id": 8, "sku": "MEA-002", "name": "Chicken Breast 500g",
        "description": "Boneless skinless chicken breast, high protein.",
        "price": 6.00, "cost_price": 4.50, "category_id": 6,
        "stock": 120, "status": "active",
        "image_url": "https://placehold.co/400x300?text=Chicken+Breast",
    },
    {
        "id": 9, "sku": "SEA-002", "name": "Salmon Fillet 300g",
        "description": "Fresh Atlantic salmon fillet, rich in omega-3.",
        "price": 12.00, "cost_price": 9.00, "category_id": 6,
        "stock": 40, "status": "active",
        "image_url": "https://placehold.co/400x300?text=Salmon",
    },
    # ── Snacks & Candy ──
    {
        "id": 10, "sku": "SNK-001", "name": "Pringles Original 165g",
        "description": "Classic original flavour potato crisps.",
        "price": 5.50, "cost_price": 4.00, "category_id": 7,
        "stock": 500, "status": "active",
        "image_url": "https://placehold.co/400x300?text=Pringles",
    },
    {
        "id": 11, "sku": "SNK-002", "name": "Oreo Vanilla Cream 96g",
        "description": "Oreo sandwich cookies with vanilla cream filling.",
        "price": 2.50, "cost_price": 1.70, "category_id": 7,
        "stock": 800, "status": "active",
        "image_url": "https://placehold.co/400x300?text=Oreo",
    },
    {
        "id": 12, "sku": "SNK-003", "name": "Lays Classic 150g",
        "description": "Classic salted potato chips.",
        "price": 3.80, "cost_price": 2.80, "category_id": 7,
        "stock": 600, "status": "active",
        "image_url": "https://placehold.co/400x300?text=Lays",
    },
    # ── Soft Drinks ──
    {
        "id": 13, "sku": "BEV-001", "name": "Coca-Cola Can 330ml",
        "description": "Coca-Cola carbonated soft drink, 330ml aluminium can.",
        "price": 1.20, "cost_price": 0.85, "category_id": 8,
        "stock": 1000, "status": "active",
        "image_url": "https://placehold.co/400x300?text=Coca-Cola",
    },
    {
        "id": 14, "sku": "BEV-002", "name": "Pepsi Bottle 1.5L",
        "description": "Pepsi 1.5L plastic bottle, ideal for family use.",
        "price": 2.20, "cost_price": 1.60, "category_id": 8,
        "stock": 600, "status": "active",
        "image_url": "https://placehold.co/400x300?text=Pepsi",
    },
    {
        "id": 15, "sku": "BEV-003", "name": "Sprite Can 330ml",
        "description": "Sprite lemon-lime flavored soda.",
        "price": 1.10, "cost_price": 0.80, "category_id": 8,
        "stock": 700, "status": "active",
        "image_url": "https://placehold.co/400x300?text=Sprite",
    },
    # ── Juice & Milk ──
    {
        "id": 16, "sku": "MLK-001", "name": "Fresh Milk 1L",
        "description": "UHT unsweetened fresh milk, 1 litre.",
        "price": 3.50, "cost_price": 2.70, "category_id": 9,
        "stock": 400, "status": "active",
        "image_url": "https://placehold.co/400x300?text=Fresh+Milk",
    },
    {
        "id": 17, "sku": "JCE-001", "name": "Tropicana Orange Juice 1L",
        "description": "100% pure orange juice by Tropicana.",
        "price": 4.80, "cost_price": 3.60, "category_id": 9,
        "stock": 250, "status": "active",
        "image_url": "https://placehold.co/400x300?text=Tropicana",
    },
    {
        "id": 18, "sku": "MLK-002", "name": "Soy Milk 1L",
        "description": "Unsweetened soy milk, rich in protein.",
        "price": 2.80, "cost_price": 2.10, "category_id": 9,
        "stock": 150, "status": "active",
        "image_url": "https://placehold.co/400x300?text=Soy+Milk",
    },
    
]

ATTRIBUTES_DATA = [
    {"id": 1, "category_id": 5, "name": "Weight", "data_type": "string", "required": True},
    {"id": 2, "category_id": 5, "name": "Origin", "data_type": "string", "required": False},
    {"id": 3, "category_id": 5, "name": "Organic", "data_type": "boolean", "required": False},
    {"id": 4, "category_id": 6, "name": "Weight", "data_type": "string", "required": True},
    {"id": 5, "category_id": 6, "name": "Cut Type", "data_type": "string", "required": False},
    {"id": 6, "category_id": 7, "name": "Flavor", "data_type": "string", "required": False},
    {"id": 7, "category_id": 8, "name": "Volume", "data_type": "string", "required": True},
    {"id": 8, "category_id": 9, "name": "Volume", "data_type": "string", "required": True},
    {"id": 9, "category_id": 9, "name": "Fat Content", "data_type": "string", "required": False},
]

PRODUCT_ATTRIBUTE_VALUES_DATA = [
    {"product_id": 1, "attribute_id": 1, "value": "500g"},
    {"product_id": 1, "attribute_id": 2, "value": "Vietnam"},
    {"product_id": 2, "attribute_id": 1, "value": "1kg"},
    {"product_id": 2, "attribute_id": 2, "value": "Vietnam"},
    {"product_id": 3, "attribute_id": 1, "value": "250g"},
    {"product_id": 4, "attribute_id": 1, "value": "200g"},
    {"product_id": 4, "attribute_id": 3, "value": "true"},
    {"product_id": 6, "attribute_id": 4, "value": "500g"},
    {"product_id": 7, "attribute_id": 4, "value": "500g"},
    {"product_id": 8, "attribute_id": 4, "value": "500g"},
    {"product_id": 10, "attribute_id": 6, "value": "Original"},
    {"product_id": 11, "attribute_id": 6, "value": "Vanilla"},
    {"product_id": 12, "attribute_id": 6, "value": "Salted"},
    {"product_id": 13, "attribute_id": 7, "value": "330ml"},
    {"product_id": 14, "attribute_id": 7, "value": "1.5L"},
    {"product_id": 15, "attribute_id": 7, "value": "330ml"},
    {"product_id": 16, "attribute_id": 8, "value": "1L"},
    {"product_id": 16, "attribute_id": 9, "value": "3.5%"},
    {"product_id": 17, "attribute_id": 8, "value": "1L"},
]

CART_DATA = [
    {"id": 1, "user_id": 5},
    {"id": 2, "user_id": 6},
    {"id": 3, "user_id": 7},
]

CART_ITEMS_DATA = [
    {"id": 1, "cart_id": 1, "product_id": 1, "quantity": 3},
    {"id": 2, "cart_id": 1, "product_id": 10, "quantity": 2},
    {"id": 3, "cart_id": 2, "product_id": 6, "quantity": 1},
    {"id": 4, "cart_id": 2, "product_id": 13, "quantity": 6},
    {"id": 5, "cart_id": 3, "product_id": 16, "quantity": 2},
]

ORDERS_DATA = [
    {"id": 1, "user_id": 5, "total_amount": 15.00, "status": "completed"},
    {"id": 2, "user_id": 6, "total_amount": 14.50, "status": "pending"},
    {"id": 3, "user_id": 7, "total_amount": 42.80, "status": "pending"},
    {"id": 4, "user_id": 5, "total_amount": 8.20, "status": "completed"},
    {"id": 5, "user_id": 6, "total_amount": 25.00, "status": "cancelled"},
]

ORDER_ITEMS_DATA = [
    {"id": 1, "order_id": 1, "product_id": 1, "quantity": 2, "price": 1.50},
    {"id": 2, "order_id": 1, "product_id": 10, "quantity": 1, "price": 5.50},
    {"id": 3, "order_id": 1, "product_id": 13, "quantity": 3, "price": 1.20},
    {"id": 4, "order_id": 2, "product_id": 6, "quantity": 1, "price": 8.50},
    {"id": 5, "order_id": 2, "product_id": 13, "quantity": 5, "price": 1.20},
    {"id": 7, "order_id": 3, "product_id": 11, "quantity": 2, "price": 2.50},
    {"id": 8, "order_id": 4, "product_id": 3, "quantity": 2, "price": 1.80},
    {"id": 9, "order_id": 4, "product_id": 15, "quantity": 3, "price": 1.10},
    {"id": 10, "order_id": 5, "product_id": 8, "quantity": 2, "price": 6.00},
    {"id": 11, "order_id": 5, "product_id": 17, "quantity": 1, "price": 4.80},
]

PAYMENTS_DATA = [
    {"id": 1, "order_id": 1, "method": "bank_transfer", "amount": 15.00, "status": "completed", "paid_at": datetime.now() - timedelta(days=5)},
    {"id": 2, "order_id": 2, "method": "bank_transfer", "amount": 14.50, "status": "pending", "paid_at": datetime.now() - timedelta(hours=3)},
    {"id": 3, "order_id": 3, "method": "bank_transfer", "amount": 42.80, "status": "pending", "paid_at": datetime.now() - timedelta(hours=1)},
    {"id": 4, "order_id": 4, "method": "bank_transfer", "amount": 8.20, "status": "completed", "paid_at": datetime.now() - timedelta(days=2)},
    {"id": 5, "order_id": 5, "method": "bank_transfer", "amount": 25.00, "status": "failed", "paid_at": datetime.now() - timedelta(days=1)},
]



# ──────────────────────────────────────────────
def seed(db: Session):
    print("Seeding MySQL data...")

    # 0. Cleanup existing data (reverse dependency order)
    print("  -> Cleaning up existing data...")
    # Disable foreign key checks to handle self-referencing constraints (e.g. categories.parent_id)
    db.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
    db.query(RefreshToken).delete()
    db.query(Payment).delete()
    db.query(OrderItem).delete()
    db.query(Order).delete()
    db.query(CartItem).delete()
    db.query(Cart).delete()
    db.query(ProductAttributeValue).delete()
    db.query(Attribute).delete()
    db.query(Product).delete()
    db.query(Category).delete()
    # Remove many-to-many associations before deleting users/roles/permissions
    db.execute(user_roles.delete())
    db.execute(role_permissions.delete())
    db.query(User).delete()
    db.query(Role).delete()
    db.query(Permission).delete()
    db.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
    db.commit()
    print("  -> Cleanup complete.")

    # 1. Permissions
    print("  -> Creating permissions...")
    perm_map: dict[str, Permission] = {}
    for p in PERMISSIONS_DATA:
        existing = db.query(Permission).filter_by(code=p["code"]).first()
        if not existing:
            obj = Permission(id=p["id"], name=p["name"], code=p["code"], description=p["description"])
            db.add(obj)
            db.flush()
            perm_map[p["code"]] = obj
        else:
            perm_map[p["code"]] = existing
    db.commit()

    # 2. Roles
    print("  -> Creating roles...")
    role_map: dict[str, Role] = {}
    for r in ROLES_DATA:
        existing = db.query(Role).filter_by(name=r["name"]).first()
        if not existing:
            obj = Role(id=r["id"], name=r["name"], description=r["description"])
            db.add(obj)
            db.flush()
            role_map[r["name"]] = obj
        else:
            role_map[r["name"]] = existing
    db.commit()

    # 3. Assign permissions to roles
    print("  -> Assigning permissions to roles...")
    all_roles = db.query(Role).all()
    for role in all_roles:
        perm_codes = ROLE_PERMISSIONS.get(role.id, [])
        role.permissions = [perm_map[c] for c in perm_codes if c in perm_map]
    db.commit()

    # 4. Users
    print("  -> Creating users...")
    user_ids = {}
    for u in USERS_DATA:
        existing = db.query(User).filter_by(username=u["username"]).first()
        if not existing:
            obj = User(
                id=u["id"],
                username=u["username"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                full_name=u["full_name"],
                is_active=u["is_active"],
            )
            obj.roles = [role_map[rn] for rn in u["roles"] if rn in role_map]
            db.add(obj)
            db.flush()
            user_ids[u["username"]] = obj.id
        else:
            user_ids[u["username"]] = existing.id
    db.commit()

    # 5. Categories (raw SQL because `slug` column exists in DB but not in the ORM model)
    print("  -> Creating categories...")
    category_ids = {}
    for c in CATEGORIES_DATA:
        existing = db.execute(
            text("SELECT id FROM categories WHERE name = :name"),
            {"name": c["name"]}
        ).scalar()
        if not existing:
            db.execute(
                text("INSERT INTO categories (id, name, slug, description) VALUES (:id, :name, :slug, :desc)"),
                {"id": c["id"], "name": c["name"], "slug": slugify(c["name"]), "desc": c["description"]}
            )
            category_ids[c["name"]] = c["id"]
        else:
            category_ids[c["name"]] = existing
    db.commit()

    # 6. Products (raw SQL because `slug` column exists in DB but not in the ORM model)
    print("  -> Creating products...")
    product_ids = {}
    for p in PRODUCTS_DATA:
        existing = db.execute(
            text("SELECT id FROM products WHERE sku = :sku"),
            {"sku": p["sku"]}
        ).scalar()
        if not existing:
            db.execute(
                text("""INSERT INTO products
                    (id, sku, name, slug, description, price, cost_price, category_id, stock, status, image_url)
                    VALUES (:id, :sku, :name, :slug, :desc, :price, :cost, :cat_id, :stock, :status, :img)"""),
                {
                    "id": p["id"], "sku": p["sku"], "name": p["name"], "slug": slugify(p["name"]),
                    "desc": p["description"], "price": p["price"], "cost": p["cost_price"],
                    "cat_id": p["category_id"], "stock": p["stock"], "status": p["status"], "img": p["image_url"]
                }
            )
            product_ids[p["sku"]] = p["id"]
        else:
            product_ids[p["sku"]] = existing
    db.commit()

    # 7. Attributes
    print("  -> Creating attributes...")
    attribute_ids = {}
    for a in ATTRIBUTES_DATA:
        existing = db.query(Attribute).filter_by(name=a["name"], category_id=a["category_id"]).first()
        if not existing:
            obj = Attribute(
                id=a["id"],
                category_id=a["category_id"],
                name=a["name"],
                data_type=a["data_type"],
                required=a["required"],
            )
            db.add(obj)
            db.flush()
            attribute_ids[(a["category_id"], a["name"])] = obj.id
        else:
            attribute_ids[(a["category_id"], a["name"])] = existing.id
    db.commit()

    # 8. Product Attribute Values
    print("  -> Creating product attribute values...")
    for pav in PRODUCT_ATTRIBUTE_VALUES_DATA:
        existing = db.query(ProductAttributeValue).filter_by(
            product_id=pav["product_id"],
            attribute_id=pav["attribute_id"]
        ).first()
        if not existing:
            obj = ProductAttributeValue(
                product_id=pav["product_id"],
                attribute_id=pav["attribute_id"],
                value=pav["value"],
            )
            db.add(obj)
    db.commit()

    # 9. Carts
    print("  -> Creating carts...")
    for c in CART_DATA:
        existing = db.query(Cart).filter_by(user_id=c["user_id"]).first()
        if not existing:
            obj = Cart(
                id=c["id"],
                user_id=c["user_id"],
            )
            db.add(obj)
    db.commit()

    # 10. Cart Items
    print("  -> Creating cart items...")
    for ci in CART_ITEMS_DATA:
        existing = db.query(CartItem).filter_by(
            cart_id=ci["cart_id"],
            product_id=ci["product_id"]
        ).first()
        if not existing:
            obj = CartItem(
                id=ci["id"],
                cart_id=ci["cart_id"],
                product_id=ci["product_id"],
                quantity=ci["quantity"],
            )
            db.add(obj)
    db.commit()

    # 11. Orders
    print("  -> Creating orders...")
    order_ids = {}
    for o in ORDERS_DATA:
        existing = db.query(Order).filter_by(id=o["id"]).first()
        if not existing:
            obj = Order(
                id=o["id"],
                user_id=o["user_id"],
                total_amount=o["total_amount"],
                status=o["status"],
            )
            db.add(obj)
            db.flush()
            order_ids[o["id"]] = obj.id
    db.commit()

    # 12. Order Items
    print("  -> Creating order items...")
    for oi in ORDER_ITEMS_DATA:
        existing = db.query(OrderItem).filter_by(
            order_id=oi["order_id"],
            product_id=oi["product_id"]
        ).first()
        if not existing:
            obj = OrderItem(
                id=oi["id"],
                order_id=oi["order_id"],
                product_id=oi["product_id"],
                quantity=oi["quantity"],
                price=oi["price"],
            )
            db.add(obj)
    db.commit()

    # 13. Payments
    print("  -> Creating payments...")
    for p in PAYMENTS_DATA:
        existing = db.query(Payment).filter_by(order_id=p["order_id"]).first()
        if not existing:
            obj = Payment(
                id=p["id"],
                order_id=p["order_id"],
                method=p["method"],
                amount=p["amount"],
                status=p["status"],
                paid_at=p["paid_at"],
            )
            db.add(obj)
    db.commit()

   

    print("\nSeed complete! Summary:")


seed(SessionLocal())