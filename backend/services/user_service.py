import logging
from datetime import datetime
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.cart_model import Cart
from models.order_model import Order
from models.refresh_tokens_model import RefreshToken
from models.users_model import User
from schemas.user_schema import UserListResponse, UserResponse, UserUpdate, UserAdminUpdate

logger = logging.getLogger(__name__)


class UserService:
    @staticmethod
    def get_me(current_user: User) -> User:
        """Return the currently authenticated user."""
        return current_user

    @staticmethod
    def update_me(payload: UserUpdate, current_user: User, db: Session) -> User:
        """Update own profile (username, email, full_name)."""
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

    @staticmethod
    def get_all_users(db: Session) -> List[User]:
        """Get all users (excluding soft-deleted)."""
        return db.query(User).filter(User.deleted_at.is_(None)).all()

    @staticmethod
    def get_user_by_id(user_id: int, db: Session) -> User:
        """Get a specific user by ID."""
        user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return user

    @staticmethod
    def admin_update_user(user_id: int, payload: UserAdminUpdate, db: Session) -> User:
        """Admin update any user's profile."""
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

    @staticmethod
    def delete_user(user_id: int, current_user: User, db: Session) -> dict:
        """Soft delete a user by ID."""
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