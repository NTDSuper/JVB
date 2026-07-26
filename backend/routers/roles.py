import logging
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.roles_model import Role
from models.users_model import User
from routers.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/roles", tags=["Roles"])


class RoleResponse(BaseModel):
    id: int
    name: str
    description: str | None = None

    model_config = {"from_attributes": True}


@router.get(
    "",
    response_model=List[RoleResponse],
    summary="Get all roles (Admin only)",
)
def get_all_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all roles. Accessible to any authenticated admin."""
    roles = db.query(Role).all()
    return roles
