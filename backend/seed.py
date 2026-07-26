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
import calendar


def slugify(text_str: str) -> str:
    """Generate a URL-friendly slug from a string."""
    s = text_str.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"-+", "-", s)
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
    {
        "id": 1,
        "name": "View Products",
        "code": "product:read",
        "description": "Permission to view product list and details",
    },
    {
        "id": 2,
        "name": "Create Products",
        "code": "product:create",
        "description": "Permission to create new products",
    },
    {
        "id": 3,
        "name": "Update Products",
        "code": "product:update",
        "description": "Permission to update existing products",
    },
    {
        "id": 4,
        "name": "Delete Products",
        "code": "product:delete",
        "description": "Permission to delete products",
    },
    {
        "id": 5,
        "name": "View Users",
        "code": "user:read",
        "description": "Permission to view user list",
    },
    {
        "id": 6,
        "name": "Update Users",
        "code": "user:update",
        "description": "Permission to update users",
    },
    {
        "id": 7,
        "name": "Delete Users",
        "code": "user:delete",
        "description": "Permission to delete users",
    },
    {
        "id": 8,
        "name": "Manage Roles",
        "code": "role:manage",
        "description": "Permission to manage roles and permissions",
    },
    {
        "id": 9,
        "name": "View Orders",
        "code": "order:read",
        "description": "Permission to view orders",
    },
    {
        "id": 10,
        "name": "Manage Orders",
        "code": "order:manage",
        "description": "Permission to manage orders",
    },
    {
        "id": 11,
        "name": "View Payments",
        "code": "payment:read",
        "description": "Permission to view payments",
    },
    {
        "id": 12,
        "name": "Manage Payments",
        "code": "payment:manage",
        "description": "Permission to manage payments",
    },
]

# Only 3 roles: admin, manager, user
ROLES_DATA = [
    {"id": 1, "name": "admin", "description": "Administrator – full system access"},
    {"id": 2, "name": "manager", "description": "Manager – manages products and orders"},
    {"id": 3, "name": "user", "description": "Regular user – assigned automatically on registration"},
]

# Role permissions mapping (role_id → [permission_code])
ROLE_PERMISSIONS = {
    1: [
        "product:read",
        "product:create",
        "product:update",
        "product:delete",
        "user:read",
        "user:update",
        "user:delete",
        "role:manage",
        "order:read",
        "order:manage",
        "payment:read",
        "payment:manage",
    ],
    2: [
        "product:read",
        "product:create",
        "product:update",
        "product:delete",
        "order:read",
        "order:manage",
        "payment:read",
    ],
    3: ["product:read", "order:read"],
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
        "username": "user01",
        "email": "user01@supermarket.com",
        "password": "User@123",
        "full_name": "Regular User",
        "is_active": True,
        "roles": ["user"],
    },
    {
        "id": 4,
        "username": "user02",
        "email": "user02@supermarket.com",
        "password": "User@123",
        "full_name": "Jane Customer",
        "is_active": True,
        "roles": ["user"],
    },
    {
        "id": 5,
        "username": "user03",
        "email": "user03@supermarket.com",
        "password": "User@123",
        "full_name": "Mike Shopper",
        "is_active": True,
        "roles": ["user"],
    },
    {
        "id": 6,
        "username": "user04",
        "email": "user04@supermarket.com",
        "password": "User@123",
        "full_name": "Lisa Buyer",
        "is_active": True,
        "roles": ["user"],
    },
    {
        "id": 7,
        "username": "user05",
        "email": "user05@supermarket.com",
        "password": "User@123",
        "full_name": "Tom Eater",
        "is_active": True,
        "roles": ["user"],
    },
]

# ── 10 Food-related Categories (all English) ──
CATEGORIES_DATA = [
    {"id": 1, "name": "Vegetables", "description": "Fresh and organic vegetables"},
    {"id": 2, "name": "Fruits", "description": "Fresh fruits imported and domestic"},
    {"id": 3, "name": "Meat", "description": "Fresh pork, beef, and chicken"},
    {"id": 4, "name": "Seafood", "description": "Fresh and frozen seafood"},
    {"id": 5, "name": "Dairy", "description": "Milk, yogurt, cheese, and butter"},
    {"id": 6, "name": "Bakery & Cereals", "description": "Fresh bread, oats, and cereals"},
    {"id": 7, "name": "Beverages", "description": "Soft drinks, water, tea, and beer"},
    {"id": 8, "name": "Spices & Sauces", "description": "Cooking spices, sauces, and condiments"},
    {"id": 9, "name": "Canned & Dry Food", "description": "Canned goods, noodles, and dry food"},
    {"id": 10, "name": "Snacks & Candy", "description": "Cookies, candy, chips, and chocolate"},
]

# ── 5 Products per category (50 total, all English) ──
PRODUCTS_DATA = [
    # ── Category 1: Vegetables (5 products) ──
    {
        "id": 1,
        "sku": "VEG-001",
        "name": "Fresh Carrots 500g",
        "description": "Fresh carrots from Da Lat, rich in vitamin A.",
        "price": 1.50,
        "cost_price": 1.00,
        "category_id": 1,
        "stock": 120,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Carrots",
    },
    {
        "id": 2,
        "sku": "VEG-002",
        "name": "Broccoli 300g",
        "description": "Fresh broccoli florets, packed with nutrients.",
        "price": 2.50,
        "cost_price": 1.80,
        "category_id": 1,
        "stock": 80,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Broccoli",
    },
    {
        "id": 3,
        "sku": "VEG-003",
        "name": "Tomatoes 500g",
        "description": "Ripe red tomatoes, perfect for salads and cooking.",
        "price": 1.80,
        "cost_price": 1.20,
        "category_id": 1,
        "stock": 150,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Tomatoes",
    },
    {
        "id": 4,
        "sku": "VEG-004",
        "name": "Water Spinach 300g",
        "description": "Fresh water spinach, great for stir-fry.",
        "price": 0.80,
        "cost_price": 0.50,
        "category_id": 1,
        "stock": 200,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Water+Spinach",
    },
    {
        "id": 5,
        "sku": "VEG-005",
        "name": "Potatoes 1kg",
        "description": "Yellow potatoes, suitable for frying or boiling.",
        "price": 2.20,
        "cost_price": 1.50,
        "category_id": 1,
        "stock": 100,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Potatoes",
    },
    # ── Category 2: Fruits (5 products) ──
    {
        "id": 6,
        "sku": "FRT-001",
        "name": "Red Apples 1kg",
        "description": "Sweet red apples imported from USA.",
        "price": 5.50,
        "cost_price": 4.00,
        "category_id": 2,
        "stock": 90,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Apples",
    },
    {
        "id": 7,
        "sku": "FRT-002",
        "name": "Banana Bunch 500g",
        "description": "Ripe sweet bananas, rich in potassium.",
        "price": 1.50,
        "cost_price": 1.00,
        "category_id": 2,
        "stock": 180,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Bananas",
    },
    {
        "id": 8,
        "sku": "FRT-003",
        "name": "Navel Oranges 1kg",
        "description": "Juicy navel oranges, rich in vitamin C.",
        "price": 4.00,
        "cost_price": 3.00,
        "category_id": 2,
        "stock": 110,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Oranges",
    },
    {
        "id": 9,
        "sku": "FRT-004",
        "name": "Seedless Grapes 500g",
        "description": "Sweet green seedless grapes.",
        "price": 6.00,
        "cost_price": 4.50,
        "category_id": 2,
        "stock": 70,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Grapes",
    },
    {
        "id": 10,
        "sku": "FRT-005",
        "name": "Ripe Mangoes 1kg",
        "description": "Sweet ripe mangoes, tropical flavor.",
        "price": 5.00,
        "cost_price": 3.80,
        "category_id": 2,
        "stock": 60,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Mangoes",
    },
    # ── Category 3: Meat (5 products) ──
    {
        "id": 11,
        "sku": "MEA-001",
        "name": "Pork Belly 500g",
        "description": "Fresh pork belly, traceable origin.",
        "price": 6.50,
        "cost_price": 5.00,
        "category_id": 3,
        "stock": 80,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Pork+Belly",
    },
    {
        "id": 12,
        "sku": "MEA-002",
        "name": "Chicken Breast 500g",
        "description": "Boneless skinless chicken breast, high protein.",
        "price": 5.50,
        "cost_price": 4.20,
        "category_id": 3,
        "stock": 100,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Chicken+Breast",
    },
    {
        "id": 13,
        "sku": "MEA-003",
        "name": "Beef Tenderloin 300g",
        "description": "Premium beef tenderloin, tender and juicy.",
        "price": 12.00,
        "cost_price": 9.50,
        "category_id": 3,
        "stock": 40,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Beef+Tenderloin",
    },
    {
        "id": 14,
        "sku": "MEA-004",
        "name": "Pork Ribs 500g",
        "description": "Fresh pork spare ribs, great for grilling.",
        "price": 7.00,
        "cost_price": 5.50,
        "category_id": 3,
        "stock": 60,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Pork+Ribs",
    },
    {
        "id": 15,
        "sku": "MEA-005",
        "name": "Chicken Thigh 500g",
        "description": "Bone-in chicken thigh, flavorful and moist.",
        "price": 4.50,
        "cost_price": 3.50,
        "category_id": 3,
        "stock": 90,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Chicken+Thigh",
    },
    # ── Category 4: Seafood (5 products) ──
    {
        "id": 16,
        "sku": "SEA-001",
        "name": "Fresh Tiger Shrimp 500g",
        "description": "Large fresh tiger shrimp from local farms.",
        "price": 12.00,
        "cost_price": 9.50,
        "category_id": 4,
        "stock": 50,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Shrimp",
    },
    {
        "id": 17,
        "sku": "SEA-002",
        "name": "Salmon Fillet 300g",
        "description": "Fresh Atlantic salmon fillet, rich in omega-3.",
        "price": 15.00,
        "cost_price": 12.00,
        "category_id": 4,
        "stock": 35,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Salmon",
    },
    {
        "id": 18,
        "sku": "SEA-003",
        "name": "Squid 400g",
        "description": "Fresh squid, cleaned and ready to cook.",
        "price": 8.50,
        "cost_price": 6.50,
        "category_id": 4,
        "stock": 45,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Squid",
    },
    {
        "id": 19,
        "sku": "SEA-004",
        "name": "Pangasius Fillet 400g",
        "description": "White pangasius fillet, mild flavor.",
        "price": 4.50,
        "cost_price": 3.50,
        "category_id": 4,
        "stock": 75,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Pangasius",
    },
    {
        "id": 20,
        "sku": "SEA-005",
        "name": "Clams 500g",
        "description": "Fresh baby clams, perfect for steaming.",
        "price": 3.50,
        "cost_price": 2.50,
        "category_id": 4,
        "stock": 55,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Clams",
    },
    # ── Category 5: Dairy (5 products) ──
    {
        "id": 21,
        "sku": "MLK-001",
        "name": "Fresh Milk 1L",
        "description": "Pasteurized fresh milk, 1 liter.",
        "price": 3.20,
        "cost_price": 2.50,
        "category_id": 5,
        "stock": 200,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Milk",
    },
    {
        "id": 22,
        "sku": "MLK-002",
        "name": "Yogurt 4-pack",
        "description": "Plain yogurt, 4 cups of 100g each.",
        "price": 1.80,
        "cost_price": 1.30,
        "category_id": 5,
        "stock": 300,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Yogurt",
    },
    {
        "id": 23,
        "sku": "MLK-003",
        "name": "Cheese Slices 12-pack",
        "description": "Processed cheese slices, convenient for snacks.",
        "price": 3.50,
        "cost_price": 2.80,
        "category_id": 5,
        "stock": 150,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Cheese",
    },
    {
        "id": 24,
        "sku": "MLK-004",
        "name": "Unsalted Butter 200g",
        "description": "Pure unsalted butter, perfect for baking.",
        "price": 4.50,
        "cost_price": 3.60,
        "category_id": 5,
        "stock": 80,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Butter",
    },
    {
        "id": 25,
        "sku": "MLK-005",
        "name": "Whipping Cream 200ml",
        "description": "Whipping cream for desserts and coffee.",
        "price": 3.80,
        "cost_price": 3.00,
        "category_id": 5,
        "stock": 60,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Whipping+Cream",
    },
    # ── Category 6: Bakery & Cereals (5 products) ──
    {
        "id": 26,
        "sku": "BRD-001",
        "name": "Fresh Bread Loaf 500g",
        "description": "Freshly baked bread loaf, 500g.",
        "price": 1.20,
        "cost_price": 0.80,
        "category_id": 6,
        "stock": 100,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Bread",
    },
    {
        "id": 27,
        "sku": "BRD-002",
        "name": "Granola Cereal 500g",
        "description": "Healthy granola cereal, rich in fiber.",
        "price": 6.50,
        "cost_price": 5.00,
        "category_id": 6,
        "stock": 70,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Granola",
    },
    {
        "id": 28,
        "sku": "BRD-003",
        "name": "Whole Wheat Bread 400g",
        "description": "Whole wheat sandwich bread, healthy choice.",
        "price": 2.50,
        "cost_price": 1.80,
        "category_id": 6,
        "stock": 90,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Whole+Wheat+Bread",
    },
    {
        "id": 29,
        "sku": "BRD-004",
        "name": "Rolled Oats 400g",
        "description": "Pure rolled oats, rich in soluble fiber.",
        "price": 3.50,
        "cost_price": 2.70,
        "category_id": 6,
        "stock": 85,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Oats",
    },
    {
        "id": 30,
        "sku": "BRD-005",
        "name": "Garlic Bread 200g",
        "description": "Crispy garlic bread, pre-packed.",
        "price": 2.00,
        "cost_price": 1.40,
        "category_id": 6,
        "stock": 60,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Garlic+Bread",
    },
    # ── Category 7: Beverages (5 products) ──
    {
        "id": 31,
        "sku": "BEV-001",
        "name": "Coca Cola 1.5L",
        "description": "Carbonated soft drink Coca Cola, 1.5L bottle.",
        "price": 1.50,
        "cost_price": 1.00,
        "category_id": 7,
        "stock": 250,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Coca+Cola",
    },
    {
        "id": 32,
        "sku": "BEV-002",
        "name": "Mineral Water 500ml",
        "description": "Natural mineral water, 500ml bottle.",
        "price": 0.50,
        "cost_price": 0.30,
        "category_id": 7,
        "stock": 400,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Mineral+Water",
    },
    {
        "id": 33,
        "sku": "BEV-003",
        "name": "Green Tea 500ml",
        "description": "Bottled green tea, refreshing lemon flavor.",
        "price": 0.80,
        "cost_price": 0.50,
        "category_id": 7,
        "stock": 300,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Green+Tea",
    },
    {
        "id": 34,
        "sku": "BEV-004",
        "name": "Orange Juice 330ml",
        "description": "Orange juice with added vitamin C.",
        "price": 1.00,
        "cost_price": 0.70,
        "category_id": 7,
        "stock": 180,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Orange+Juice",
    },
    {
        "id": 35,
        "sku": "BEV-005",
        "name": "Beer Can 330ml",
        "description": "Premium lager beer, 330ml can.",
        "price": 1.20,
        "cost_price": 0.85,
        "category_id": 7,
        "stock": 200,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Beer",
    },
    # ── Category 8: Spices & Sauces (5 products) ──
    {
        "id": 36,
        "sku": "SPC-001",
        "name": "Fish Sauce 500ml",
        "description": "Premium fish sauce, rich umami flavor.",
        "price": 2.50,
        "cost_price": 1.80,
        "category_id": 8,
        "stock": 150,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Fish+Sauce",
    },
    {
        "id": 37,
        "sku": "SPC-002",
        "name": "Cooking Oil 1L",
        "description": "Refined cooking oil, 1 liter bottle.",
        "price": 3.50,
        "cost_price": 2.80,
        "category_id": 8,
        "stock": 120,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Cooking+Oil",
    },
    {
        "id": 38,
        "sku": "SPC-003",
        "name": "Chili Sauce 250g",
        "description": "Spicy chili sauce, perfect for dipping.",
        "price": 1.20,
        "cost_price": 0.80,
        "category_id": 8,
        "stock": 200,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Chili+Sauce",
    },
    {
        "id": 39,
        "sku": "SPC-004",
        "name": "Seasoning Powder 400g",
        "description": "All-purpose seasoning from pork bone broth.",
        "price": 2.80,
        "cost_price": 2.20,
        "category_id": 8,
        "stock": 160,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Seasoning",
    },
    {
        "id": 40,
        "sku": "SPC-005",
        "name": "Soy Sauce 500ml",
        "description": "Premium soy sauce, balanced salty-sweet flavor.",
        "price": 1.50,
        "cost_price": 1.00,
        "category_id": 8,
        "stock": 140,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Soy+Sauce",
    },
    # ── Category 9: Canned & Dry Food (5 products) ──
    {
        "id": 41,
        "sku": "CND-001",
        "name": "Canned Fish in Tomato Sauce 155g",
        "description": "Canned fish in tomato sauce, convenient meal.",
        "price": 1.50,
        "cost_price": 1.00,
        "category_id": 9,
        "stock": 180,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Canned+Fish",
    },
    {
        "id": 42,
        "sku": "CND-002",
        "name": "Instant Noodles 5-pack",
        "description": "Instant noodles shrimp flavor, 5 packs.",
        "price": 2.00,
        "cost_price": 1.50,
        "category_id": 9,
        "stock": 500,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Instant+Noodles",
    },
    {
        "id": 43,
        "sku": "CND-003",
        "name": "Soft Tofu 300g",
        "description": "Fresh soft tofu, smooth and silky.",
        "price": 0.80,
        "cost_price": 0.50,
        "category_id": 9,
        "stock": 100,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Tofu",
    },
    {
        "id": 44,
        "sku": "CND-004",
        "name": "Dried Shiitake Mushrooms 200g",
        "description": "Dried shiitake mushrooms, aromatic and nutritious.",
        "price": 5.50,
        "cost_price": 4.20,
        "category_id": 9,
        "stock": 50,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Dried+Mushrooms",
    },
    {
        "id": 45,
        "sku": "CND-005",
        "name": "Pork Liver Pate 200g",
        "description": "Premium pork liver pate, rich and creamy.",
        "price": 1.80,
        "cost_price": 1.20,
        "category_id": 9,
        "stock": 90,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Pate",
    },
    # ── Category 10: Snacks & Candy (5 products) ──
    {
        "id": 46,
        "sku": "SNK-001",
        "name": "Oreo Cookies 137g",
        "description": "Oreo cookies with vanilla cream filling.",
        "price": 1.50,
        "cost_price": 1.00,
        "category_id": 10,
        "stock": 200,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Oreo",
    },
    {
        "id": 47,
        "sku": "SNK-002",
        "name": "Haribo Gummy Bears 200g",
        "description": "Fruit flavored gummy bears, assorted flavors.",
        "price": 2.50,
        "cost_price": 1.80,
        "category_id": 10,
        "stock": 150,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Haribo",
    },
    {
        "id": 48,
        "sku": "SNK-003",
        "name": "Lay's Potato Chips 90g",
        "description": "Potato chips BBQ flavor, 90g pack.",
        "price": 1.00,
        "cost_price": 0.70,
        "category_id": 10,
        "stock": 300,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Lays",
    },
    {
        "id": 49,
        "sku": "SNK-004",
        "name": "Swiss Roll Cake 200g",
        "description": "Cream-filled Swiss roll cake, 200g box.",
        "price": 3.00,
        "cost_price": 2.20,
        "category_id": 10,
        "stock": 60,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Swiss+Roll",
    },
    {
        "id": 50,
        "sku": "SNK-005",
        "name": "Dark Chocolate 70% 100g",
        "description": "Dark chocolate with 70% cocoa, healthy treat.",
        "price": 3.50,
        "cost_price": 2.60,
        "category_id": 10,
        "stock": 80,
        "status": "active",
        "image_url": "https://placehold.co/400x300?text=Dark+Chocolate",
    },
]

# ── Attributes: each category has at least 2 attributes (all English) ──
ATTRIBUTES_DATA = [
    # Category 1: Vegetables
    {"id": 1, "category_id": 1, "name": "Weight", "data_type": "string", "required": True},
    {"id": 2, "category_id": 1, "name": "Origin", "data_type": "string", "required": True},
    {"id": 3, "category_id": 1, "name": "Organic", "data_type": "boolean", "required": False},
    # Category 2: Fruits
    {"id": 4, "category_id": 2, "name": "Weight", "data_type": "string", "required": True},
    {"id": 5, "category_id": 2, "name": "Origin", "data_type": "string", "required": True},
    {"id": 6, "category_id": 2, "name": "Sweetness", "data_type": "string", "required": False},
    # Category 3: Meat
    {"id": 7, "category_id": 3, "name": "Weight", "data_type": "string", "required": True},
    {"id": 8, "category_id": 3, "name": "Meat Type", "data_type": "string", "required": True},
    {"id": 9, "category_id": 3, "name": "Storage", "data_type": "string", "required": False},
    # Category 4: Seafood
    {"id": 10, "category_id": 4, "name": "Weight", "data_type": "string", "required": True},
    {"id": 11, "category_id": 4, "name": "Seafood Type", "data_type": "string", "required": True},
    {"id": 12, "category_id": 4, "name": "Wild/Caught", "data_type": "string", "required": False},
    # Category 5: Dairy
    {"id": 13, "category_id": 5, "name": "Volume", "data_type": "string", "required": True},
    {"id": 14, "category_id": 5, "name": "Fat Content", "data_type": "string", "required": False},
    {"id": 15, "category_id": 5, "name": "Expiry Date", "data_type": "string", "required": True},
    # Category 6: Bakery & Cereals
    {"id": 16, "category_id": 6, "name": "Weight", "data_type": "string", "required": True},
    {"id": 17, "category_id": 6, "name": "Flour Type", "data_type": "string", "required": False},
    {"id": 18, "category_id": 6, "name": "Expiry Date", "data_type": "string", "required": True},
    # Category 7: Beverages
    {"id": 19, "category_id": 7, "name": "Volume", "data_type": "string", "required": True},
    {"id": 20, "category_id": 7, "name": "Carbonated", "data_type": "boolean", "required": False},
    {"id": 21, "category_id": 7, "name": "Flavor", "data_type": "string", "required": False},
    # Category 8: Spices & Sauces
    {"id": 22, "category_id": 8, "name": "Volume", "data_type": "string", "required": True},
    {"id": 23, "category_id": 8, "name": "Type", "data_type": "string", "required": True},
    {"id": 24, "category_id": 8, "name": "Expiry Date", "data_type": "string", "required": True},
    # Category 9: Canned & Dry Food
    {"id": 25, "category_id": 9, "name": "Weight", "data_type": "string", "required": True},
    {"id": 26, "category_id": 9, "name": "Type", "data_type": "string", "required": True},
    {"id": 27, "category_id": 9, "name": "Expiry Date", "data_type": "string", "required": True},
    # Category 10: Snacks & Candy
    {"id": 28, "category_id": 10, "name": "Weight", "data_type": "string", "required": True},
    {"id": 29, "category_id": 10, "name": "Flavor", "data_type": "string", "required": False},
    {"id": 30, "category_id": 10, "name": "Expiry Date", "data_type": "string", "required": True},
]

PRODUCT_ATTRIBUTE_VALUES_DATA = [
    # Category 1: Vegetables
    {"product_id": 1, "attribute_id": 1, "value": "500g"},
    {"product_id": 1, "attribute_id": 2, "value": "Vietnam"},
    {"product_id": 2, "attribute_id": 1, "value": "300g"},
    {"product_id": 2, "attribute_id": 2, "value": "Vietnam"},
    {"product_id": 3, "attribute_id": 1, "value": "500g"},
    {"product_id": 3, "attribute_id": 2, "value": "Vietnam"},
    {"product_id": 4, "attribute_id": 1, "value": "300g"},
    {"product_id": 4, "attribute_id": 2, "value": "Vietnam"},
    {"product_id": 5, "attribute_id": 1, "value": "1kg"},
    {"product_id": 5, "attribute_id": 2, "value": "Vietnam"},
    # Category 2: Fruits
    {"product_id": 6, "attribute_id": 4, "value": "1kg"},
    {"product_id": 6, "attribute_id": 5, "value": "USA"},
    {"product_id": 7, "attribute_id": 4, "value": "500g"},
    {"product_id": 7, "attribute_id": 5, "value": "Vietnam"},
    {"product_id": 8, "attribute_id": 4, "value": "1kg"},
    {"product_id": 8, "attribute_id": 5, "value": "USA"},
    {"product_id": 9, "attribute_id": 4, "value": "500g"},
    {"product_id": 9, "attribute_id": 5, "value": "Vietnam"},
    {"product_id": 10, "attribute_id": 4, "value": "1kg"},
    {"product_id": 10, "attribute_id": 5, "value": "Vietnam"},
    # Category 3: Meat
    {"product_id": 11, "attribute_id": 7, "value": "500g"},
    {"product_id": 11, "attribute_id": 8, "value": "Pork"},
    {"product_id": 12, "attribute_id": 7, "value": "500g"},
    {"product_id": 12, "attribute_id": 8, "value": "Chicken"},
    {"product_id": 13, "attribute_id": 7, "value": "300g"},
    {"product_id": 13, "attribute_id": 8, "value": "Beef"},
    {"product_id": 14, "attribute_id": 7, "value": "500g"},
    {"product_id": 14, "attribute_id": 8, "value": "Pork"},
    {"product_id": 15, "attribute_id": 7, "value": "500g"},
    {"product_id": 15, "attribute_id": 8, "value": "Chicken"},
    # Category 4: Seafood
    {"product_id": 16, "attribute_id": 10, "value": "500g"},
    {"product_id": 16, "attribute_id": 11, "value": "Shrimp"},
    {"product_id": 17, "attribute_id": 10, "value": "300g"},
    {"product_id": 17, "attribute_id": 11, "value": "Salmon"},
    {"product_id": 18, "attribute_id": 10, "value": "400g"},
    {"product_id": 18, "attribute_id": 11, "value": "Squid"},
    {"product_id": 19, "attribute_id": 10, "value": "400g"},
    {"product_id": 19, "attribute_id": 11, "value": "Pangasius"},
    {"product_id": 20, "attribute_id": 10, "value": "500g"},
    {"product_id": 20, "attribute_id": 11, "value": "Clams"},
    # Category 5: Dairy
    {"product_id": 21, "attribute_id": 13, "value": "1L"},
    {"product_id": 21, "attribute_id": 14, "value": "3.5%"},
    {"product_id": 22, "attribute_id": 13, "value": "4x100g"},
    {"product_id": 22, "attribute_id": 14, "value": "3.5%"},
    {"product_id": 23, "attribute_id": 13, "value": "12 slices"},
    {"product_id": 23, "attribute_id": 14, "value": "20%"},
    {"product_id": 24, "attribute_id": 13, "value": "200g"},
    {"product_id": 24, "attribute_id": 14, "value": "82%"},
    {"product_id": 25, "attribute_id": 13, "value": "200ml"},
    {"product_id": 25, "attribute_id": 14, "value": "35%"},
    # Category 6: Bakery & Cereals
    {"product_id": 26, "attribute_id": 16, "value": "500g"},
    {"product_id": 26, "attribute_id": 17, "value": "Wheat"},
    {"product_id": 27, "attribute_id": 16, "value": "500g"},
    {"product_id": 27, "attribute_id": 17, "value": "Oats"},
    {"product_id": 28, "attribute_id": 16, "value": "400g"},
    {"product_id": 28, "attribute_id": 17, "value": "Whole Wheat"},
    {"product_id": 29, "attribute_id": 16, "value": "400g"},
    {"product_id": 29, "attribute_id": 17, "value": "Oats"},
    {"product_id": 30, "attribute_id": 16, "value": "200g"},
    {"product_id": 30, "attribute_id": 17, "value": "Wheat"},
    # Category 7: Beverages
    {"product_id": 31, "attribute_id": 19, "value": "1.5L"},
    {"product_id": 31, "attribute_id": 20, "value": "true"},
    {"product_id": 32, "attribute_id": 19, "value": "500ml"},
    {"product_id": 32, "attribute_id": 20, "value": "false"},
    {"product_id": 33, "attribute_id": 19, "value": "500ml"},
    {"product_id": 33, "attribute_id": 20, "value": "false"},
    {"product_id": 34, "attribute_id": 19, "value": "330ml"},
    {"product_id": 34, "attribute_id": 20, "value": "false"},
    {"product_id": 35, "attribute_id": 19, "value": "330ml"},
    {"product_id": 35, "attribute_id": 20, "value": "true"},
    # Category 8: Spices & Sauces
    {"product_id": 36, "attribute_id": 22, "value": "500ml"},
    {"product_id": 36, "attribute_id": 23, "value": "Fish Sauce"},
    {"product_id": 37, "attribute_id": 22, "value": "1L"},
    {"product_id": 37, "attribute_id": 23, "value": "Cooking Oil"},
    {"product_id": 38, "attribute_id": 22, "value": "250g"},
    {"product_id": 38, "attribute_id": 23, "value": "Chili Sauce"},
    {"product_id": 39, "attribute_id": 22, "value": "400g"},
    {"product_id": 39, "attribute_id": 23, "value": "Seasoning"},
    {"product_id": 40, "attribute_id": 22, "value": "500ml"},
    {"product_id": 40, "attribute_id": 23, "value": "Soy Sauce"},
    # Category 9: Canned & Dry Food
    {"product_id": 41, "attribute_id": 25, "value": "155g"},
    {"product_id": 41, "attribute_id": 26, "value": "Canned Fish"},
    {"product_id": 42, "attribute_id": 25, "value": "5 packs"},
    {"product_id": 42, "attribute_id": 26, "value": "Noodles"},
    {"product_id": 43, "attribute_id": 25, "value": "300g"},
    {"product_id": 43, "attribute_id": 26, "value": "Tofu"},
    {"product_id": 44, "attribute_id": 25, "value": "200g"},
    {"product_id": 44, "attribute_id": 26, "value": "Dried Mushroom"},
    {"product_id": 45, "attribute_id": 25, "value": "200g"},
    {"product_id": 45, "attribute_id": 26, "value": "Pate"},
    # Category 10: Snacks & Candy
    {"product_id": 46, "attribute_id": 28, "value": "137g"},
    {"product_id": 46, "attribute_id": 29, "value": "Vanilla"},
    {"product_id": 47, "attribute_id": 28, "value": "200g"},
    {"product_id": 47, "attribute_id": 29, "value": "Fruit"},
    {"product_id": 48, "attribute_id": 28, "value": "90g"},
    {"product_id": 48, "attribute_id": 29, "value": "BBQ"},
    {"product_id": 49, "attribute_id": 28, "value": "200g"},
    {"product_id": 49, "attribute_id": 29, "value": "Cream"},
    {"product_id": 50, "attribute_id": 28, "value": "100g"},
    {"product_id": 50, "attribute_id": 29, "value": "Dark Chocolate"},
]

CART_DATA = [
    {"id": 1, "user_id": 3},
    {"id": 2, "user_id": 4},
    {"id": 3, "user_id": 5},
    {"id": 4, "user_id": 6},
    {"id": 5, "user_id": 7},
]

CART_ITEMS_DATA = [
    {"id": 1, "cart_id": 1, "product_id": 1, "quantity": 3},
    {"id": 2, "cart_id": 1, "product_id": 10, "quantity": 2},
    {"id": 3, "cart_id": 2, "product_id": 6, "quantity": 1},
    {"id": 4, "cart_id": 2, "product_id": 13, "quantity": 6},
    {"id": 5, "cart_id": 3, "product_id": 16, "quantity": 2},
    {"id": 6, "cart_id": 4, "product_id": 21, "quantity": 4},
    {"id": 7, "cart_id": 5, "product_id": 31, "quantity": 6},
]

# ── Orders: Jan 2026 to Jul 2026, only cancel and complete statuses ──
# Generate multiple orders per day across each month
ORDERS_DATA = []
ORDER_ITEMS_DATA = []
PAYMENTS_DATA = []

order_id_counter = 1
order_item_id_counter = 1
payment_id_counter = 1

# Users who can place orders (user01=3, user02=4, user03=5, user04=6, user05=7)
user_ids_for_orders = [3, 4, 5, 6, 7]

# Product price lookup
product_prices = {p["id"]: p["price"] for p in PRODUCTS_DATA}

# For each month from Jan 2026 to Jul 2026
for month in range(1, 8):
    days_in_month = calendar.monthrange(2026, month)[1]
    
    # Pick ~15 distinct days per month to have orders
    num_order_days = random.randint(12, 18)
    order_days = sorted(random.sample(range(1, days_in_month + 1), min(num_order_days, days_in_month)))
    
    for day in order_days:
        # Number of orders on this day (2-6)
        num_orders_today = random.randint(2, 6)
        
        for _ in range(num_orders_today):
            user_id = random.choice(user_ids_for_orders)
            
            # Random time during the day
            hour = random.randint(6, 22)
            minute = random.randint(0, 59)
            order_date = datetime(2026, month, day, hour, minute)
            
            # Random status: only "cancelled" or "completed"
            status = random.choice(["cancelled", "completed"])
            
            # Pick 1-5 random products for this order
            num_items = random.randint(1, 5)
            selected_products = random.sample(range(1, 51), num_items)
            
            total_amount = 0
            order_items = []
            
            for prod_id in selected_products:
                qty = random.randint(1, 5)
                price = product_prices[prod_id]
                total_amount += price * qty
                order_items.append({
                    "id": order_item_id_counter,
                    "order_id": order_id_counter,
                    "product_id": prod_id,
                    "quantity": qty,
                    "price": price,
                })
                order_item_id_counter += 1
            
            ORDERS_DATA.append({
                "id": order_id_counter,
                "user_id": user_id,
                "total_amount": round(total_amount, 2),
                "status": status,
            })
            
            ORDER_ITEMS_DATA.extend(order_items)
            
            # Payment
            payment_status = "completed" if status == "completed" else "cancelled"
            paid_at = order_date + timedelta(minutes=random.randint(5, 120))
            
            PAYMENTS_DATA.append({
                "id": payment_id_counter,
                "order_id": order_id_counter,
                "method": random.choice(["bank_transfer"]),
                "amount": round(total_amount, 2),
                "status": payment_status,
                "expires_at": order_date + timedelta(hours=24),
                "paid_at": paid_at,
            })
            payment_id_counter += 1
            
            order_id_counter += 1


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
            obj = Permission(
                id=p["id"], name=p["name"], code=p["code"], description=p["description"]
            )
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
            text("SELECT id FROM categories WHERE name = :name"), {"name": c["name"]}
        ).scalar()
        if not existing:
            db.execute(
                text(
                    "INSERT INTO categories (id, name, slug, description) VALUES (:id, :name, :slug, :desc)"
                ),
                {
                    "id": c["id"],
                    "name": c["name"],
                    "slug": slugify(c["name"]),
                    "desc": c["description"],
                },
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
            text("SELECT id FROM products WHERE sku = :sku"), {"sku": p["sku"]}
        ).scalar()
        if not existing:
            db.execute(
                text(
                    """INSERT INTO products
                    (id, sku, name, slug, description, price, cost_price, category_id, stock, status, image_url)
                    VALUES (:id, :sku, :name, :slug, :desc, :price, :cost, :cat_id, :stock, :status, :img)"""
                ),
                {
                    "id": p["id"],
                    "sku": p["sku"],
                    "name": p["name"],
                    "slug": slugify(p["name"]),
                    "desc": p["description"],
                    "price": p["price"],
                    "cost": p["cost_price"],
                    "cat_id": p["category_id"],
                    "stock": p["stock"],
                    "status": p["status"],
                    "img": p["image_url"],
                },
            )
            product_ids[p["sku"]] = p["id"]
        else:
            product_ids[p["sku"]] = existing
    db.commit()

    # 7. Attributes
    print("  -> Creating attributes...")
    attribute_ids = {}
    for a in ATTRIBUTES_DATA:
        existing = (
            db.query(Attribute)
            .filter_by(name=a["name"], category_id=a["category_id"])
            .first()
        )
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
        existing = (
            db.query(ProductAttributeValue)
            .filter_by(product_id=pav["product_id"], attribute_id=pav["attribute_id"])
            .first()
        )
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
        existing = (
            db.query(CartItem)
            .filter_by(cart_id=ci["cart_id"], product_id=ci["product_id"])
            .first()
        )
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
        existing = (
            db.query(OrderItem)
            .filter_by(order_id=oi["order_id"], product_id=oi["product_id"])
            .first()
        )
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
                expires_at=p["expires_at"],
                paid_at=p["paid_at"],
            )
            db.add(obj)
    db.commit()

    print("\nSeed complete! Summary:")
    print(f"  - {len(PERMISSIONS_DATA)} permissions")
    print(f"  - {len(ROLES_DATA)} roles")
    print(f"  - {len(USERS_DATA)} users")
    print(f"  - {len(CATEGORIES_DATA)} categories")
    print(f"  - {len(PRODUCTS_DATA)} products")
    print(f"  - {len(ATTRIBUTES_DATA)} attributes")
    print(f"  - {len(PRODUCT_ATTRIBUTE_VALUES_DATA)} product attribute values")
    print(f"  - {len(CART_DATA)} carts")
    print(f"  - {len(CART_ITEMS_DATA)} cart items")
    print(f"  - {len(ORDERS_DATA)} orders (Jan 2026 - Jul 2026)")
    print(f"  - {len(ORDER_ITEMS_DATA)} order items")
    print(f"  - {len(PAYMENTS_DATA)} payments")


seed(SessionLocal())