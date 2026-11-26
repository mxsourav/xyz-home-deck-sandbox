"""Environment configuration for the XYZ Home Deck backend service."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_ROOT / ".env")

_PLACEHOLDER_KEYS = {
    "",
    "nvapi-xxxx",
    "nvapi-your-key-here",
    "your_nvidia_api_key",
    "changeme",
    "none",
    "null",
}

_REQUIRED_CORS_ORIGINS = (
    "https://xyz-home-deck-sandbox.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)

VERCEL_PREVIEW_ORIGIN_REGEX = r"^https://[a-zA-Z0-9-]+\.vercel\.app$"


def _is_valid_api_key(raw_value: str) -> bool:
    """Return True when the raw string looks like a configured non-placeholder key."""
    cleaned = raw_value.strip()
    if not cleaned:
        return False
    lowered = cleaned.lower()
    if lowered in _PLACEHOLDER_KEYS or lowered.startswith("nvapi-xxxx"):
        return False
    return len(cleaned) > 10


def _resolve_nvidia_api_key() -> str:
    """Support both NVIDIA_API_KEY and NVIDIA_NIM_API_KEY env vars safely."""
    for env_name in ("NVIDIA_API_KEY", "NVIDIA_NIM_API_KEY"):
        candidate = os.getenv(env_name, "").strip()
        if _is_valid_api_key(candidate):
            return candidate
    return ""


def _parse_origins(raw_value: str) -> list[str]:
    """Combine configured CORS origins with required production & local origins."""
    origins: list[str] = []
    for item in raw_value.split(","):
        cleaned = item.strip().rstrip("/")
        if cleaned and cleaned not in origins:
            origins.append(cleaned)
    for required_origin in _REQUIRED_CORS_ORIGINS:
        if required_origin not in origins:
            origins.append(required_origin)
    return origins


@dataclass(frozen=True)
class Settings:
    """Immutable application settings loaded from environment variables."""

    app_name: str = "XYZ Home Deck API"
    app_version: str = "0.6.0"
    phase: int = 6
    nvidia_api_key: str = ""
    nvidia_nim_model: str = "nvidia/nemotron-3.5-bolt-e4b"
    nvidia_nim_base_url: str = "https://integrate.api.nvidia.com/v1"
    cors_origins: list[str] = field(default_factory=lambda: list(_REQUIRED_CORS_ORIGINS))
    cors_origin_regex: str = VERCEL_PREVIEW_ORIGIN_REGEX

    @property
    def is_nim_configured(self) -> bool:
        """Return True only when a non-placeholder NVIDIA NIM key is present."""
        return _is_valid_api_key(self.nvidia_api_key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached runtime settings loaded from environment variables."""
    api_key = _resolve_nvidia_api_key()
    model = os.getenv("NVIDIA_NIM_MODEL", "nvidia/nemotron-3.5-bolt-e4b").strip()
    base_url = (
        os.getenv("NVIDIA_NIM_BASE_URL", "https://integrate.api.nvidia.com/v1")
        .strip()
        .rstrip("/")
    )
    frontend_origin = os.getenv(
        "FRONTEND_ORIGIN",
        "https://xyz-home-deck-sandbox.vercel.app,http://localhost:5173",
    )

    return Settings(
        nvidia_api_key=api_key,
        nvidia_nim_model=model or "meta/llama-3.1-8b-instruct",
        nvidia_nim_base_url=base_url or "https://integrate.api.nvidia.com/v1",
        cors_origins=_parse_origins(frontend_origin),
        cors_origin_regex=VERCEL_PREVIEW_ORIGIN_REGEX,
    )
