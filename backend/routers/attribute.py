import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.users_model import User
from routers.auth import get_current_user, get_permission_codes
from schemas.attribute_schema import AttributeCreate, AttributeUpdate, AttributeResponse
from services.attribute_service import AttributeService

router = APIRouter(prefix="/api/attributes", tags=["Attributes"])
logger = logging.getLogger(__name__)


@router.post("/new", response_model=AttributeResponse)
def create_attribute(
    payload: AttributeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AttributeService.create_attribute(payload, current_user, db)


@router.get("/by-category/{category_id}", response_model=list[AttributeResponse])
def get_attributes_by_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AttributeService.get_attributes_by_category(category_id, current_user, db)


@router.get("/{attribute_id}", response_model=AttributeResponse)
def get_attribute(
    attribute_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AttributeService.get_attribute(attribute_id, current_user, db)


@router.patch("/update/{attribute_id}", response_model=AttributeResponse)
def update_attribute(
    attribute_id: int,
    payload: AttributeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AttributeService.update_attribute(attribute_id, payload, current_user, db)


@router.delete("/{attribute_id}")
def delete_attribute(
    attribute_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AttributeService.delete_attribute(attribute_id, current_user, db)
