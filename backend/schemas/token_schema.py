from typing import Optional

from pydantic import BaseModel


class LoginRequest(BaseModel):

    email: str
    password: str


class TokenResponse(BaseModel):

    access_token: str
    refresh_token: Optional[str] = None


class AccessTokenResponse(BaseModel):

    access_token: str


class RefreshTokenRequest(BaseModel):

    refresh_token: str


class TokenData(BaseModel):

    email: Optional[str] = None
    username: Optional[str] = None
