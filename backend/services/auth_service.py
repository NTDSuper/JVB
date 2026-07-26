import logging
from datetime import datetime, timedelta, timezone

import redis
from fastapi import HTTPException, status, Request, Response
from jose import JWTError
from sqlalchemy.orm import Session

from models.refresh_tokens_model import RefreshToken
from models.users_model import User
from models.roles_model import Role
from schemas.token_schema import AccessTokenResponse, TokenResponse, LoginRequest
from schemas.user_schema import UserRegister, UserResponse
from utils.jwt_handler import create_access_token, create_refresh_token, decode_token
from utils.password_hash import hash_password, verify_password
from utils.redis_client import redis_client

logger = logging.getLogger(__name__)


class AuthService:
    @staticmethod
    def get_current_user(token: str, db: Session) -> User:
        """Validate access token and return the authenticated user."""
        logger.info("Attempting to authenticate user with access token")
        try:
            payload = decode_token(token)

            if payload.get("type") != "access":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            email = payload.get("sub")
            jti = payload.get("jti")

            if not email:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token missing subject",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            try:
                is_blacklisted = redis_client.get(f"blacklist:{jti}")
            except redis.RedisError as e:
                logger.error(f"Redis connection error in get_current_user: {e}")
                is_blacklisted = False

            if is_blacklisted:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has been revoked",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is invalid or expired",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = db.query(User).filter(User.email == email).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive",
            )

        if user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account has been deleted",
            )

        return user

    @staticmethod
    def get_permission_codes(user: User) -> set[str]:
        """Extract all permission codes from a user's roles."""
        permissions = set()
        for role in user.roles:
            for perm in role.permissions:
                permissions.add(perm.code)
        return permissions

    @staticmethod
    def get_role(user: User) -> list[str]:
        """Get list of role names for a user."""
        role_per_user = list()
        for role in user.roles:
            role_per_user.append(role.name)
        return role_per_user

    @staticmethod
    def register(payload: UserRegister, db: Session) -> User:
        """Register a new user."""
        logger.info("Attempting to register new user")
        if db.query(User).filter(User.email == payload.email).first():
            logger.warning("User registration failed: Email already exists")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists",
            )

        if db.query(User).filter(User.username == payload.username).first():
            logger.warning("User registration failed: Username already exists")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )

        new_user = User(
            username=payload.username,
            email=payload.email,
            password_hash=hash_password(payload.password),
            full_name=payload.full_name,
        )

        # Auto-assign the default 'user' role on registration
        default_role = db.query(Role).filter(Role.name == "user").first()
        if default_role:
            new_user.roles = [default_role]

        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info("User registered successfully")
        return new_user

    @staticmethod
    def login(
        payload: LoginRequest, response: Response, request: Request, db: Session
    ) -> TokenResponse:
        """Authenticate user and return tokens."""
        user = db.query(User).filter(User.email == payload.email).first()
        logger.info("Attempting to login user")
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or password is incorrect",
            )
        if user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account has been deleted",
            )
        rf = (
            db.query(RefreshToken)
            .filter(RefreshToken.user_id == user.id, RefreshToken.revoked == False)
            .first()
        )
        if rf:
            rf.revoked = True
            db.commit()

        logger.info("User authenticated successfully, generating tokens")
        token_data = {"sub": user.email, "username": user.username}
        access_token = create_access_token(token_data)
        refresh_token, jti = create_refresh_token(token_data)

        logger.info("Access and refresh tokens generated successfully")
        db_token = RefreshToken(
            user_id=user.id,
            jti=jti,
            revoked=False,
            expired_at=datetime.now(timezone.utc) + timedelta(days=7),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("User-Agent") if request.headers else None,
            created_at=datetime.now(timezone.utc),
        )
        db.add(db_token)
        # Update user's active status
        user.is_active = True
        db.commit()

        # Set HttpOnly Cookie for refresh token
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            max_age=7 * 24 * 3600,
            expires=7 * 24 * 3600,
            secure=False,
            samesite="lax",
            path="/",
        )

        return TokenResponse(access_token=access_token, refresh_token=None)

    @staticmethod
    def refresh_access_token(
        response: Response, request: Request, refresh_token: str | None, db: Session
    ) -> AccessTokenResponse:
        """Refresh access token using refresh token from cookie."""
        logger.info("Attempting to refresh access token")
        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not found refresh token cookie",
            )

        try:
            decoded = decode_token(refresh_token)
            if decoded.get("type") != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token type incorrect",
                )
            jti = decoded.get("jti")
            rf_in_db = (
                db.query(RefreshToken)
                .filter(RefreshToken.jti == jti, RefreshToken.revoked == False)
                .first()
            )
            if not rf_in_db:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token has been revoked or does not exist",
                )
            email: str = decoded.get("sub")
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token is invalid or has expired",
            )

        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Can not find user for this token",
            )
        if user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account has been deleted",
            )
        new_access_token = create_access_token(
            {"sub": user.email, "username": user.username}
        )
        new_refresh_token, new_jti = create_refresh_token(
            {"sub": user.email, "username": user.username}
        )
        db_token = RefreshToken(
            user_id=user.id,
            jti=new_jti,
            revoked=False,
            expired_at=datetime.now(timezone.utc) + timedelta(days=7),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("User-Agent") if request.headers else None,
            created_at=datetime.now(timezone.utc),
        )
        rf_in_db.revoked = True
        db.add(db_token)
        db.commit()

        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            httponly=True,
            max_age=7 * 24 * 3600,
            expires=7 * 24 * 3600,
            secure=False,
            samesite="lax",
            path="/",
        )

        return AccessTokenResponse(access_token=new_access_token)

    @staticmethod
    def logout(response: Response, token: str, current_user: User, db: Session) -> dict:
        """Logout: invalidate access token (blacklist) and refresh token."""
        logger.info("Attempting to logout user")

        # Update user's active status
        current_user.is_active = False
        rf = (
            db.query(RefreshToken)
            .filter(
                RefreshToken.user_id == current_user.id, RefreshToken.revoked == False
            )
            .first()
        )
        if rf:
            rf.revoked = True
        db.commit()

        # Blacklist the current access token
        try:
            decoded = decode_token(token)
            jti = decoded.get("jti")
            exp = decoded.get("exp")
            now = datetime.now(timezone.utc)
            expire_time = datetime.fromtimestamp(exp, tz=timezone.utc) - now
            try:
                redis_client.setex(
                    f"blacklist:{jti}", int(expire_time.total_seconds()), "true"
                )
            except redis.RedisError as e:
                logger.error(f"Redis connection error during logout: {e}")
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid access token",
            )
        # Delete HttpOnly Cookie for refresh token
        response.delete_cookie("refresh_token", path="/", samesite="lax")

        return {"message": "Logout successful"}

    @staticmethod
    def authenticate_token_ws(token: str, db: Session) -> User:
        """Authenticate token for WebSocket connections."""
        try:
            payload = decode_token(token)
        except JWTError:
            raise ValueError("Invalid token or expired")

        if payload.get("type") != "access":
            raise ValueError("Wrong token type")

        email = payload.get("sub")
        jti = payload.get("jti")

        if not email:
            raise ValueError("Invalid token: missing subject")

        try:
            if redis_client.get(f"blacklist:{jti}"):
                raise ValueError("Invalid token: revoked")
        except redis.RedisError as e:
            logger.warning(f"Redis unavailable during WS auth: {e}")

        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise ValueError("User not found")
        if not user.is_active:
            raise ValueError("Invalid user: inactive")

        return user
