import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models.users_model import User
from routers.auth import get_current_user, get_permission_codes
from schemas.product_schema import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    ProductStatusUpdate,
    ProductAttributeResponse,
    CategoryResponse,
)
from schemas.paginated_schema import PaginatedResponse
from services.auth_service import AuthService
from services.product_service import ProductService
from models.products_model import Product

router = APIRouter(prefix="/api/products", tags=["Products"])
logger = logging.getLogger(__name__)


@router.post("/new", response_model=ProductResponse)
def create_product(
    payload: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProductService.create_product(payload, current_user, db)


@router.get("/categories/all", response_model=List[CategoryResponse])
def get_categories(
    db: Session = Depends(get_db),
):
    return ProductService.get_categories(db)


@router.get("/all", response_model=PaginatedResponse)
def get_products(
    skip: int = 0,
    limit: int = 20,
    refresh: bool = False,
    db: Session = Depends(get_db),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
):
    return ProductService.get_products(skip, limit, refresh, db, category_id)


@router.get("/search", response_model=PaginatedResponse)
def search_product(
    keyword: str,
    skip: int = 0,
    limit: int = 20,
    refresh: bool = False,
    db: Session = Depends(get_db),
):
    return ProductService.search_product(keyword, skip, limit, refresh, db)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    return ProductService.get_product(product_id, db)


@router.patch("/update/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProductService.update_product(product_id, payload, current_user, db)


@router.patch("/status/{product_id}", response_model=ProductResponse)
def update_product_status(
    product_id: int,
    payload: ProductStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProductService.update_product_status(product_id, payload, current_user, db)


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProductService.delete_product(product_id, current_user, db)