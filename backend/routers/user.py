import logging
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from models.cart_model import Cart
from models.order_model import Order
from models.refresh_tokens_model import RefreshToken
from database import get_db
from models.users_model import User
from routers.auth import get_current_user, get_permission_codes
from schemas.user_schema import (UserListResponse, UserResponse, UserUpdate, UserAdminUpdate)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Take current user information",
)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Require Authorization: Bearer <access_token>.
    Return information of the currently logged-in user.
    """
    
    return current_user


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
    """
    Update own profile (username, email, full_name).
    Duplicate checks for email and username.
    """
    # Check email uniqueness if changed
    if payload.email and payload.email != current_user.email:
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists",
            )

    # Check username uniqueness if changed
    if payload.username and payload.username != current_user.username:
        existing = db.query(User).filter(User.username == payload.username).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.get(
    "/all",
    response_model=List[UserListResponse],
    summary="Take list of all users (Admin only)",
)
def get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Require role == 'admin'.
    Return list of all users in the system (excluding soft-deleted).
    """
    user_permission_codes = get_permission_codes(current_user)
    if "user:read" not in user_permission_codes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can access this endpoint",
        )
    return db.query(User).filter(User.deleted_at.is_(None)).all()


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
    """
    Require 'user:read' permission.
    Return a specific user by their ID.
    """
    user_permission_codes = get_permission_codes(current_user)
    if "user:read" not in user_permission_codes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: 'user:read' required.",
        )

    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


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
    """
    Require 'user:update' permission.
    Admin can update username, email, full_name, is_active of any user.
    """
    user_permission_codes = get_permission_codes(current_user)
    if "user:update" not in user_permission_codes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: 'user:update' required.",
        )

    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Check email uniqueness if changed
    if payload.email and payload.email != user.email:
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists",
            )

    # Check username uniqueness if changed
    if payload.username and payload.username != user.username:
        existing = db.query(User).filter(User.username == payload.username).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete(
    "/{user_id}",
    summary="Delete user by ID (Admin only)",
)
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Require 'user:delete' permission.
    Permanently delete a user from the system.
    """
    user_permission_codes = get_permission_codes(current_user)
    if "user:delete" not in user_permission_codes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: 'user:delete' required.",
        )

    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent admin from deleting themselves
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account. Use the deactivate endpoint instead.",
        )

    # Soft delete: set deleted_at timestamp instead of removing record
    user.deleted_at = datetime.utcnow()
    user.is_active = False
    db.commit()
    return {"message": "User deleted successfully"}
