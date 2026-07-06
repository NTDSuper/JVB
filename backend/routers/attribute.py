import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from routers.auth import get_current_user, get_permission_codes
from models.users_model import User
from models.attribute_model import Attribute
from models.categories_model import Category
from database import get_db
from schemas.attribute_schema import AttributeCreate, AttributeUpdate, AttributeResponse

router = APIRouter(prefix="/api/attributes", tags=["Attributes"])
logger = logging.getLogger(__name__)


@router.post("/new", response_model=AttributeResponse)
def create_attribute(
    payload: AttributeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if "product:create" not in get_permission_codes(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied: 'product:create' required.")

    # Kiểm tra category tồn tại
    category = db.query(Category).filter(Category.id == payload.category_id).first()
    if not category:
        raise HTTPException(status_code=400, detail=f"Category id={payload.category_id} not found")

    # Kiểm tra trùng tên attribute trong cùng category
    exist = db.query(Attribute).filter(
        Attribute.category_id == payload.category_id,
        Attribute.name == payload.name,
    ).first()
    if exist:
        raise HTTPException(status_code=400, detail=f"Attribute '{payload.name}' already exists in this category")

    attribute = Attribute(**payload.model_dump())
    db.add(attribute)
    db.commit()
    db.refresh(attribute)
    return attribute


@router.get("/by-category/{category_id}", response_model=list[AttributeResponse])
def get_attributes_by_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if "product:read" not in get_permission_codes(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied: 'product:read' required.")

    attributes = db.query(Attribute).filter(Attribute.category_id == category_id).all()
    return attributes


@router.get("/{attribute_id}", response_model=AttributeResponse)
def get_attribute(
    attribute_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if "product:read" not in get_permission_codes(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied: 'product:read' required.")

    attribute = db.query(Attribute).filter(Attribute.id == attribute_id).first()
    if not attribute:
        raise HTTPException(404, "Attribute not found")
    return attribute


@router.patch("/update/{attribute_id}", response_model=AttributeResponse)
def update_attribute(
    attribute_id: int,
    payload: AttributeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if "product:update" not in get_permission_codes(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied: 'product:update' required.")

    attribute = db.query(Attribute).filter(Attribute.id == attribute_id).first()
    if not attribute:
        raise HTTPException(404, "Attribute not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(attribute, key, value)

    db.commit()
    db.refresh(attribute)
    return attribute


@router.delete("/{attribute_id}")
def delete_attribute(
    attribute_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if "product:delete" not in get_permission_codes(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied: 'product:delete' required.")

    attribute = db.query(Attribute).filter(Attribute.id == attribute_id).first()
    if not attribute:
        raise HTTPException(404, "Attribute not found")

    # Xóa các product_attribute_values liên quan
    from models.product_attribute_value_model import ProductAttributeValue
    db.query(ProductAttributeValue).filter(
        ProductAttributeValue.attribute_id == attribute.id
    ).delete()

    db.delete(attribute)
    db.commit()
    return {"message": "Deleted successfully"}