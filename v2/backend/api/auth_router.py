"""Auth endpoints — register, login, API key management."""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.middleware import AuthContext, create_access_token, get_auth_context
from backend.db.models import APIKey, Tenant, User
from backend.db.session import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    tenant_name: str
    tenant_slug: str


class LoginRequest(BaseModel):
    email: str
    password: str
    tenant_slug: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    tenant_id: str
    user_id: str


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    import bcrypt

    # Check slug uniqueness
    existing = await db.scalar(select(Tenant).where(Tenant.slug == body.tenant_slug))
    if existing:
        raise HTTPException(status_code=400, detail="Tenant slug already taken")

    tenant = Tenant(name=body.tenant_name, slug=body.tenant_slug)
    db.add(tenant)
    await db.flush()

    pw_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    user = User(tenant_id=tenant.id, email=body.email, password_hash=pw_hash, role="owner")
    db.add(user)
    await db.flush()

    token = create_access_token(tenant.id, user.id, scopes=["*"])
    return TokenResponse(access_token=token, tenant_id=tenant.id, user_id=user.id)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    import bcrypt

    tenant = await db.scalar(select(Tenant).where(Tenant.slug == body.tenant_slug))
    if not tenant:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = await db.scalar(
        select(User).where(User.tenant_id == tenant.id, User.email == body.email)
    )
    if not user or not bcrypt.checkpw(body.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(tenant.id, user.id)
    return TokenResponse(access_token=token, tenant_id=tenant.id, user_id=user.id)


class CreateAPIKeyRequest(BaseModel):
    name: str
    scopes: list[str] = ["*"]


class APIKeyResponse(BaseModel):
    id: str
    key: str  # only returned once at creation
    prefix: str
    name: str
    scopes: list[str]
    created_at: str


@router.post("/api-keys", response_model=APIKeyResponse)
async def create_api_key(
    body: CreateAPIKeyRequest,
    auth: AuthContext = Depends(get_auth_context),
    db: AsyncSession = Depends(get_db),
):
    raw = "jv2_" + secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    prefix = raw[:12]

    api_key = APIKey(
        tenant_id=auth.tenant_id,
        key_hash=key_hash,
        key_prefix=prefix,
        name=body.name,
        scopes=body.scopes,
    )
    db.add(api_key)
    await db.flush()

    return APIKeyResponse(
        id=api_key.id,
        key=raw,
        prefix=prefix,
        name=body.name,
        scopes=body.scopes,
        created_at=api_key.created_at.isoformat(),
    )


@router.get("/api-keys")
async def list_api_keys(
    auth: AuthContext = Depends(get_auth_context),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(APIKey).where(APIKey.tenant_id == auth.tenant_id, APIKey.is_active == True)  # noqa: E712
    )
    keys = result.scalars().all()
    return [
        {
            "id": k.id,
            "prefix": k.key_prefix,
            "name": k.name,
            "scopes": k.scopes,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            "created_at": k.created_at.isoformat(),
        }
        for k in keys
    ]
