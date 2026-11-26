"""Health and readiness check endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def read_health() -> dict[str, object]:
    """Return service health and NVIDIA NIM configuration status."""
    settings = get_settings()
    return {
        "status": "ok",
        "service": "xyz-home-deck-api",
        "version": settings.app_version,
        "phase": settings.phase,
        "nim_configured": settings.is_nim_configured,
        "nim_model": settings.nvidia_nim_model,
        "nim_base_url": settings.nvidia_nim_base_url,
        "mode": "nim-live" if settings.is_nim_configured else "local-fallback",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
