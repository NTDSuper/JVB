import json
import logging
import re
import unicodedata
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, case
from models.users_model import User
from models.attribute_model import Attribute
from models.product_attribute_value_model import ProductAttributeValue
from utils.redis_client import redis_client
from models.products_model import Product
from models.categories_model import Category
from schemas.product_schema import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    ProductStatusUpdate,
    ProductAttributeResponse,
    CategoryResponse,
)
from services.auth_service import AuthService
from services.s3_services import S3Service

logger = logging.getLogger(__name__)

s3_service = S3Service()


def _generate_slug(name: str) -> str:
    """Convert a name to a URL-friendly slug."""
    # Remove accents/diacritics
    text = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    # Lowercase, replace spaces with hyphens, remove non-alphanumeric
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s-]+", "-", text)
    return text.strip("-")


class ProductService:
    @staticmethod
    def clear_product_cache(product_id: int | None = None):
        try:
            for key in redis_client.keys("products:list:*"):
                redis_client.delete(key)
            if product_id:
                redis_client.delete(f"product:{product_id}")
        except Exception as e:
            logger.error(f"Redis cache clear error: {e}")

    @staticmethod
    def _get_category_attributes(category_id: int, db: Session) -> list[Attribute]:
        """Lấy danh sách Attribute được định nghĩa cho một category."""
        return db.query(Attribute).filter(Attribute.category_id == category_id).all()

    @staticmethod
    def _validate_and_map_attributes(
        category_id: int,
        attribute_inputs: list[dict],
        db: Session,
        check_all_required: bool = True,
    ):
        """
        Nhận list {name, value}, map name → attribute từ DB, validate.
        - name phải là attribute của category đó
        - Nếu attribute required = True thì phải có value
        - Nếu check_all_required = True: tất cả required attributes của category phải được cung cấp
        Trả về: danh sách (attribute, value) đã validated
        """
        cat_attrs = ProductService._get_category_attributes(category_id, db)
        cat_attr_by_name = {a.name: a for a in cat_attrs}

        if not cat_attrs:
            raise HTTPException(
                status_code=400,
                detail=f"Category (id={category_id}) has no defined attributes",
            )

        # Map các attribute name được gửi lên
        provided_names = set()
        for av in attribute_inputs:
            name = av.get("name") if isinstance(av, dict) else av.name
            provided_names.add(name)

        # Kiểm tra tất cả required attributes đều được cung cấp
        if check_all_required:
            for attr in cat_attrs:
                if attr.required and attr.name not in provided_names:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Attribute '{attr.name}' is required for this category but not provided",
                    )

        result = []
        for av in attribute_inputs:
            name = av.get("name") if isinstance(av, dict) else av.name
            value = av.get("value") if isinstance(av, dict) else av.value

            attr = cat_attr_by_name.get(name)
            if not attr:
                raise HTTPException(
                    status_code=400,
                    detail=f"Attribute '{name}' is not defined for category (id={category_id})",
                )
            if attr.required and not value:
                raise HTTPException(
                    status_code=400,
                    detail=f"Attribute '{attr.name}' is required but no value provided",
                )
            result.append((attr, value))

        return result

    @staticmethod
    def _sync_attributes(
        product: Product,
        attribute_inputs: list[dict],
        db: Session,
    ):
        """
        Đồng bộ attribute values cho product:
        1. Xóa tất cả attribute values cũ
        2. Thêm attribute values mới (map name → id)
        """
        # Xóa cũ
        db.query(ProductAttributeValue).filter(
            ProductAttributeValue.product_id == product.id
        ).delete()

        # Thêm mới
        validated = ProductService._validate_and_map_attributes(
            product.category_id, attribute_inputs, db
        )
        for attr, value in validated:
            pav = ProductAttributeValue(
                product_id=product.id,
                attribute_id=attr.id,
                value=value,
            )
            db.add(pav)

    @staticmethod
    def _build_product_response(product: Product) -> dict:
        """
        Build response với attributes.
        Trả về dict để tương thích với cache (JSON serializable).
        """
        attrs = []
        for pav in product.attribute_values:
            attrs.append(
                ProductAttributeResponse(
                    attribute_id=pav.attribute_id,
                    attribute_name=pav.attribute.name,
                    data_type=pav.attribute.data_type,
                    value=pav.value,
                ).model_dump(mode="json")
            )

        base = ProductResponse.model_validate(product).model_dump(mode="json")
        if product.image_url:
            base["image_url"] = s3_service.generate_presigned_get_url(product.image_url)
        else:
            base["image_url"] = None
        base["attributes"] = attrs
        base["category_name"] = product.category.name if product.category else None
        return base

    @staticmethod
    def _apply_active_filter(query):
        """Filter out soft-deleted records (deleted_at IS NULL)."""
        return query.filter(Product.deleted_at.is_(None))

    @staticmethod
    def create_product(payload: ProductCreate, current_user: User, db: Session) -> dict:
        """Create a new product."""
        if "product:create" not in AuthService.get_permission_codes(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: 'product:create' required.",
            )

        exist = db.query(Product).filter(Product.sku == payload.sku).first()
        if exist:
            raise HTTPException(status_code=400, detail="SKU already exists")

        # Validate category tồn tại nếu có category_id
        if payload.category_id:
            category = (
                db.query(Category).filter(Category.id == payload.category_id).first()
            )
            if not category:
                raise HTTPException(
                    status_code=400,
                    detail=f"Category id={payload.category_id} not found",
                )

        # Validate attributes nếu có (dùng name thay vì id)
        if payload.attributes and payload.category_id:
            ProductService._validate_and_map_attributes(
                payload.category_id, payload.attributes, db
            )
        elif payload.attributes and not payload.category_id:
            raise HTTPException(
                status_code=400,
                detail="Cannot set attributes without a category",
            )

        # Tạo product
        product_data = payload.model_dump(exclude={"attributes"})
        product_data["slug"] = _generate_slug(payload.name)
        product = Product(**product_data)
        db.add(product)
        db.flush()

        # Tạo attribute values (map name → id)
        if payload.attributes and payload.category_id:
            cat_attrs = ProductService._get_category_attributes(payload.category_id, db)
            cat_attr_by_name = {a.name: a for a in cat_attrs}
            for attr_val in payload.attributes:
                attr = cat_attr_by_name.get(attr_val.name)
                if attr:
                    pav = ProductAttributeValue(
                        product_id=product.id,
                        attribute_id=attr.id,
                        value=attr_val.value,
                    )
                    db.add(pav)

        try:
            db.commit()
            db.refresh(product)
            ProductService.clear_product_cache()
            return ProductService._build_product_response(product)
        except Exception:
            db.rollback()
            # If commit fails, clean up the S3 image that was just uploaded
            if payload.image_url:
                try:
                    s3 = S3Service()
                    s3.delete_object(payload.image_url)
                except Exception as s3_err:
                    logger.error("Failed to clean up S3 image on rollback: %s", s3_err)
            raise

    @staticmethod
    def get_categories(db: Session) -> list[Category]:
        """Get all categories."""
        return db.query(Category).all()

    @staticmethod
    def get_products(skip: int, limit: int, refresh: bool, db: Session, category_id: int | None = None) -> dict:
        """Get all products with caching and pagination metadata."""
        if not refresh:
            cache_key = f"products:list:{skip}:{limit}:cat:{category_id or 'all'}"
            try:
                cached = redis_client.get(cache_key)
                if cached:
                    return json.loads(cached)
            except Exception as e:
                logger.error(f"Redis cache get error: {e}")

        query = ProductService._apply_active_filter(db.query(Product))
        if category_id is not None:
            query = query.filter(Product.category_id == category_id)
        total = query.count()
        products = query.offset(skip).limit(limit).all()
        items = [ProductService._build_product_response(p) for p in products]
        result = {
            "items": items,
            "total": total,
            "skip": skip,
            "limit": limit,
        }

        try:
            redis_client.setex(cache_key, 30, json.dumps(result))
        except Exception as e:
            logger.error(f"Redis cache set error: {e}")
        return result

    

    @staticmethod
    def search_product(
        keyword: str,
        skip: int,
        limit: int,
        refresh: bool,
        db: Session,
    ) -> dict:
        """Search products with caching and pagination metadata."""

        cache_key = f"products:search:{keyword}:{skip}:{limit}"

        if not refresh:
            try:
                cached = redis_client.get(cache_key)
                if cached:
                    return json.loads(cached)
            except Exception as e:
                logger.error(f"Redis cache get error: {e}")

        keyword = keyword.strip()

        if not keyword:
            return {
                "items": [],
                "total": 0,
                "skip": skip,
                "limit": limit,
            }

        query = ProductService._apply_active_filter(db.query(Product))

        # Hỗ trợ tìm nhiều từ khóa
        conditions = []
        for word in keyword.split():
            conditions.append(
                or_(
                    Product.name.ilike(f"%{word}%"),
                    Product.sku.ilike(f"%{word}%"),
                    Product.description.ilike(f"%{word}%"),
                )
            )

        query = query.filter(and_(*conditions))

        # Ưu tiên kết quả liên quan hơn
        score = case(
            (Product.name.ilike(f"{keyword}%"), 4),
            (Product.name.ilike(f"%{keyword}%"), 3),
            (Product.sku.ilike(f"{keyword}%"), 2),
            (Product.description.ilike(f"%{keyword}%"), 1),
            else_=0,
        )

        total = query.count()

        products = (
            query
            .order_by(score.desc(), Product.name.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        items = [
            ProductService._build_product_response(product)
            for product in products
        ]

        result = {
            "items": items,
            "total": total,
            "skip": skip,
            "limit": limit,
        }

        try:
            redis_client.setex(cache_key, 30, json.dumps(result))
        except Exception as e:
            logger.error(f"Redis cache set error: {e}")

        return result

    @staticmethod
    def get_product(product_id: int, db: Session) -> dict:
        """Get a single product by ID with caching."""
        cache_key = f"product:{product_id}"
        try:
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.error(f"Redis cache get error: {e}")

        product = (
            ProductService._apply_active_filter(db.query(Product))
            .filter(Product.id == product_id)
            .first()
        )
        if not product:
            raise HTTPException(404, "Product not found")

        result = ProductService._build_product_response(product)
        try:
            redis_client.setex(cache_key, 30, json.dumps(result))
        except Exception as e:
            logger.error(f"Redis cache set error: {e}")
        return result

    @staticmethod
    def update_product(
        product_id: int, payload: ProductUpdate, current_user: User, db: Session
    ) -> dict:
        """Update a product."""
        if "product:update" not in AuthService.get_permission_codes(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: 'product:update' required.",
            )

        product = (
            ProductService._apply_active_filter(db.query(Product))
            .filter(Product.id == product_id)
            .first()
        )
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        # Validate category nếu có thay đổi
        update_data = payload.model_dump(exclude_unset=True)
        if "category_id" in update_data and update_data["category_id"] is not None:
            category = (
                db.query(Category)
                .filter(Category.id == update_data["category_id"])
                .first()
            )
            if not category:
                raise HTTPException(
                    status_code=400,
                    detail=f"Category id={update_data['category_id']} not found",
                )

        # Track old image key before update for cleanup
        old_image_key = product.image_url
        image_changed = (
            "image_url" in update_data and update_data["image_url"] != old_image_key
        )

        # Cập nhật các field thông thường
        for key, value in update_data.items():
            if key == "attributes":
                continue
            setattr(product, key, value)

        # Cập nhật attributes nếu có (dùng name thay vì id)
        if "attributes" in update_data and update_data["attributes"] is not None:
            # Skip if empty list - don't clear existing attributes
            if not update_data["attributes"]:
                pass
            elif product.category_id:
                ProductService._sync_attributes(product, update_data["attributes"], db)
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot set attributes without a category",
                )

        try:
            db.commit()
            db.refresh(product)
            ProductService.clear_product_cache(product_id)

            # If image changed and old image was an S3 object key, delete old image from S3
            if image_changed and old_image_key:
                try:
                    s3 = S3Service()
                    s3.delete_object(old_image_key)
                except Exception as s3_err:
                    logger.error("Failed to delete old S3 image: %s", s3_err)

            return ProductService._build_product_response(product)
        except Exception:
            db.rollback()
            # If commit fails and a new image was provided, clean up the new S3 image
            if image_changed and update_data.get("image_url"):
                try:
                    s3 = S3Service()
                    s3.delete_object(update_data["image_url"])
                except Exception as s3_err:
                    logger.error(
                        "Failed to clean up new S3 image on rollback: %s", s3_err
                    )
            raise

    @staticmethod
    def update_product_status(
        product_id: int, payload: ProductStatusUpdate, current_user: User, db: Session
    ) -> dict:
        """Update product status."""
        if "product:update" not in AuthService.get_permission_codes(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: 'product:update' required.",
            )

        product = (
            ProductService._apply_active_filter(db.query(Product))
            .filter(Product.id == product_id)
            .first()
        )
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        valid_statuses = ["active", "inactive", "archived"]
        if payload.status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Allowed values: {', '.join(valid_statuses)}",
            )

        product.status = payload.status
        db.commit()
        db.refresh(product)
        ProductService.clear_product_cache(product_id)
        return ProductService._build_product_response(product)

    @staticmethod
    def delete_product(product_id: int, current_user: User, db: Session) -> dict:
        """Soft delete a product."""
        if "product:delete" not in AuthService.get_permission_codes(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: 'product:delete' required.",
            )

        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        if product.deleted_at is not None:
            raise HTTPException(status_code=404, detail="Product not found")

        # Soft delete: set deleted_at timestamp instead of removing record
        product.deleted_at = datetime.utcnow()
        db.commit()
        ProductService.clear_product_cache(product_id)
        return {"message": "Deleted successfully"}
