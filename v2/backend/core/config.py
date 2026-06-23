"""Central configuration via Pydantic Settings."""
from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Jarvis V2"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = Field(..., description="JWT signing key — must be set in env")
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8000"]

    # Database
    DATABASE_URL: str = Field(
        "postgresql+asyncpg://jarvis:jarvis@localhost:5432/jarvis_v2",
        description="Async PostgreSQL DSN",
    )

    # Redis
    REDIS_URL: Optional[str] = Field(None, description="Redis URL for Pub/Sub + cache")

    # LLM
    OPENROUTER_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    DEFAULT_MODEL: str = "anthropic/claude-sonnet-4-5"
    FAST_MODEL: str = "anthropic/claude-haiku-4-5"
    MAX_TOKENS: int = 4096

    # Auth
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Rate limits (per tenant per minute)
    RATE_LIMIT_WORKFLOWS: int = 60
    RATE_LIMIT_API: int = 600

    # Tool sandbox
    SANDBOX_TIMEOUT_SECONDS: int = 30
    SANDBOX_MEMORY_MB: int = 256

    # Browser automation
    PLAYWRIGHT_HEADLESS: bool = True
    SCREENSHOT_INTERVAL_SECONDS: float = 2.0

    # Self-improvement
    OPTIMIZER_MIN_SAMPLES: int = 10
    OPTIMIZER_IMPROVEMENT_THRESHOLD: float = 0.05

    model_config = {"env_file": ".env", "case_sensitive": True}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
