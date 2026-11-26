"""Environment configuration for the XYZ Home Deck backend service."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_ROOT / ".env")

_PLACEHOLDER_KEYS = {"", "nvapi-xxxx", "your_nvidia_api_key", "changeme"}


def _parse_origins(raw_value: str) -> list[str]:
    origins: list[str] = []
    for item in raw_value.split(","):
        cleaned = item.strip().rstrip("/")
        if cleaned and cleaned not in origins:
            origins.append(cleaned)
    for local_default in ("http://localhost:5173", "http://127.0.0.1:5173"):
        if local_default not in origins:
            origins.append(local_default)
    return origins


@dataclass(frozen=True)
class Settings:
    """Immutable application settings loaded from environment variables."""

    app_name: str = "XYZ Home Deck API"
    app_version: str = "0.1.0"
    phase: int = 1
    nvidia_api_key: str = ""
    nvidia_nim_model: str = "meta/llama-3.1-8b-instruct"
    nvidia_nim_base_url: str = "https://integrate.api.nvidia.com/v1"
    cors_origins: list[str] = field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )

    @property
    def is_nim_configured(self) -> bool:
        """Return True only when a non-placeholder NVIDIA_API_KEY is present."""
        key = self.nvidia_api_key.strip()
        return key.lower() not in _PLACEHOLDER_KEYS and len(key) > 10


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached runtime settings loaded from environment variables."""
    api_key = os.getenv("NVIDIA_API_KEY", "").strip()
    model = os.getenv("NVIDIA_NIM_MODEL", "meta/llama-3.1-8b-instruct").strip()
    base_url = os.getenv(
        "NVIDIA_NIM_BASE_URL", "https://integrate.api.nvidia.com/v1"
    ).strip()
    frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    return Settings(
        nvidia_api_key=api_key,
        nvidia_nim_model=model or "meta/llama-3.1-8b-instruct",
        nvidia_nim_base_url=base_url or "https://integrate.api.nvidia.com/v1",
        cors_origins=_parse_origins(frontend_origin),
    )
