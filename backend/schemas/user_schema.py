from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserUpdate(BaseModel):
    """Schema for user to update own profile."""
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None


class UserAdminUpdate(BaseModel):
    """Schema for admin to update any user."""
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    role : list[str]
    permission: set[str]

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):

    id: int
    username: str
    email: str
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserStatusResponse(BaseModel):

    id: int
    username: str
    email: str
    status: str
    since: Optional[datetime] 
    duration_seconds: Optional[
        int
    ] 
    duration_human: str