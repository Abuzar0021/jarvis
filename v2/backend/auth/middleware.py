"""JWT + API key authentication middleware."""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.core.config import settings

logger = logging.getLogger(__name__)

bearer = HTTPBearer(auto_error=False)


class AuthContext:
    def __init__(self, tenant_id: str, user_id: str | None, scopes: list[str]) -> None:
        self.tenant_id = tenant_id
        self.user_id = user_id
        self.scopes = scopes


def _hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def create_access_token(tenant_id: str, user_id: str, scopes: list[str] | None = None) -> str:
    payload = {
        "sub": user_id,
        "tid": tenant_id,
        "scopes": scopes or ["*"],
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "exp": int(datetime.now(timezone.utc).timestamp()) + settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_jwt(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


async def get_auth_context(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> AuthContext:
    """
    Supports two auth methods:
    1. Bearer JWT token (web sessions)
    2. API key with prefix jv2_ (programmatic access)
    """
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization")

    token = credentials.credentials

    # API key path
    if token.startswith("jv2_"):
        return await _verify_api_key(token, request)

    # JWT path
    try:
        payload = verify_jwt(token)
        return AuthContext(
            tenant_id=payload["tid"],
            user_id=payload["sub"],
            scopes=payload.get("scopes", ["*"]),
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {exc}")


async def _verify_api_key(raw_key: str, request: Request) -> AuthContext:
    from backend.db.session import AsyncSessionLocal
    from backend.db.models import APIKey
    from sqlalchemy import select

    key_hash = _hash_key(raw_key)
    async with AsyncSessionLocal() as db:
        row = await db.scalar(
            select(APIKey).where(APIKey.key_hash == key_hash, APIKey.is_active == True)  # noqa: E712
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
        if row.expires_at and row.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API key expired")
        # Update last_used_at (fire-and-forget)
        row.last_used_at = datetime.now(timezone.utc)
        await db.commit()
        return AuthContext(tenant_id=row.tenant_id, user_id=None, scopes=row.scopes or ["*"])
