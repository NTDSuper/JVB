import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.users_model import User
from routers.auth import get_current_user, get_permission_codes
from schemas.user_schema import (
    UserListResponse,
    UserResponse,
    UserUpdate,
    UserAdminUpdate,
)
from services.user_service import UserService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Take current user information",
)
def get_me(current_user: User = Depends(get_current_user)):
    return UserService.get_me(current_user)


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update current user's own profile",
)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return UserService.update_me(payload, current_user, db)


@router.get(
    "/all",
    response_model=List[UserListResponse],
    summary="Take list of all users (Admin only)",
)
def get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if "user:read" not in get_permission_codes(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can access this endpoint",
        )
    return UserService.get_all_users(db)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get user by ID (Admin only)",
)
def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if "user:read" not in get_permission_codes(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: 'user:read' required.",
        )
    return UserService.get_user_by_id(user_id, db)


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update any user by ID (Admin only)",
)
def admin_update_user(
    user_id: int,
    payload: UserAdminUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if "user:update" not in get_permission_codes(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: 'user:update' required.",
        )
    if current_user.id == user_id:
        raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                 detail="You are not allowed to edit your own account.",
            )
    return UserService.admin_update_user(user_id, payload, db)


@router.delete(
    "/{user_id}",
    summary="Delete user by ID (Admin only)",
)
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if "user:delete" not in get_permission_codes(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: 'user:delete' required.",
        )
    return UserService.delete_user(user_id, current_user, db)
