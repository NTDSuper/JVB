import logging

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.users_model import User
from models.attribute_model import Attribute
from models.categories_model import Category
from models.product_attribute_value_model import ProductAttributeValue
from schemas.attribute_schema import AttributeCreate, AttributeUpdate, AttributeResponse
from services.auth_service import AuthService

logger = logging.getLogger(__name__)


class AttributeService:
    @staticmethod
    def create_attribute(
        payload: AttributeCreate, current_user: User, db: Session
    ) -> Attribute:
        """Create a new attribute."""
        if "product:create" not in AuthService.get_permission_codes(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: 'product:create' required.",
            )

        # Kiểm tra category tồn tại
        category = db.query(Category).filter(Category.id == payload.category_id).first()
        if not category:
            raise HTTPException(
                status_code=400, detail=f"Category id={payload.category_id} not found"
            )

        # Kiểm tra trùng tên attribute trong cùng category
        exist = (
            db.query(Attribute)
            .filter(
                Attribute.category_id == payload.category_id,
                Attribute.name == payload.name,
            )
            .first()
        )
        if exist:
            raise HTTPException(
                status_code=400,
                detail=f"Attribute '{payload.name}' already exists in this category",
            )

        attribute = Attribute(**payload.model_dump())
        db.add(attribute)
        db.commit()
        db.refresh(attribute)
        return attribute

    @staticmethod
    def get_attributes_by_category(
        category_id: int, current_user: User, db: Session
    ) -> list[Attribute]:
        """Get all attributes for a category."""
        if "product:read" not in AuthService.get_permission_codes(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: 'product:read' required.",
            )

        attributes = (
            db.query(Attribute).filter(Attribute.category_id == category_id).all()
        )
        return attributes

    @staticmethod
    def get_attribute(attribute_id: int, current_user: User, db: Session) -> Attribute:
        """Get a single attribute by ID."""
        if "product:read" not in AuthService.get_permission_codes(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: 'product:read' required.",
            )

        attribute = db.query(Attribute).filter(Attribute.id == attribute_id).first()
        if not attribute:
            raise HTTPException(404, "Attribute not found")
        return attribute

    @staticmethod
    def update_attribute(
        attribute_id: int, payload: AttributeUpdate, current_user: User, db: Session
    ) -> Attribute:
        """Update an attribute."""
        if "product:update" not in AuthService.get_permission_codes(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: 'product:update' required.",
            )

        attribute = db.query(Attribute).filter(Attribute.id == attribute_id).first()
        if not attribute:
            raise HTTPException(404, "Attribute not found")

        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(attribute, key, value)

        db.commit()
        db.refresh(attribute)
        return attribute

    @staticmethod
    def delete_attribute(attribute_id: int, current_user: User, db: Session) -> dict:
        """Delete an attribute."""
        if "product:delete" not in AuthService.get_permission_codes(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: 'product:delete' required.",
            )

        attribute = db.query(Attribute).filter(Attribute.id == attribute_id).first()
        if not attribute:
            raise HTTPException(404, "Attribute not found")

        # Xóa các product_attribute_values liên quan
        db.query(ProductAttributeValue).filter(
            ProductAttributeValue.attribute_id == attribute.id
        ).delete()

        db.delete(attribute)
        db.commit()
        return {"message": "Deleted successfully"}
