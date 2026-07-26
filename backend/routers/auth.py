import logging
from datetime import datetime, timedelta, timezone

import redis
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from models.refresh_tokens_model import RefreshToken
from database import get_db
from models.users_model import User
from models.roles_model import Role
from schemas.token_schema import (
    AccessTokenResponse,
    TokenResponse,
    LoginRequest,
    RefreshTokenRequest,
    TokenData,
)
from schemas.user_schema import UserRegister, UserResponse
from services.auth_service import AuthService
from utils.redis_client import redis_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Authentication"])
security = HTTPBearer()

logger.info("Authentication router initialized")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    return AuthService.get_current_user(token, db)


def get_permission_codes(user: User) -> set[str]:
    return AuthService.get_permission_codes(user)


def get_role(user: User) -> list[str]:
    return AuthService.get_role(user)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user with email and password",
)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    return AuthService.register(payload, db)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login, issue access_token and refresh_token",
)
def login(
    payload: LoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    return AuthService.login(payload, response, request, db)


@router.post(
    "/token/refresh",
    response_model=AccessTokenResponse,
    summary="reissue access_token using refresh_token from HttpOnly Cookie",
)
def refresh_access_token(
    response: Response,
    request: Request,
    refresh_token: str = Cookie(None),
    db: Session = Depends(get_db),
):
    return AuthService.refresh_access_token(response, request, refresh_token, db)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout – invalidate access_token (blacklist) and refresh_token",
)
def logout(
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    return AuthService.logout(response, token, current_user, db)
