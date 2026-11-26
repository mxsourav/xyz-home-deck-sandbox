"""FastAPI application entrypoint for XYZ Home Deck."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import ai_sandbox, health

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Phase 1 backend service for XYZ Home Deck Virtual Tour & Sandbox, "
        "providing health diagnostics and an NVIDIA NIM OpenAI-compatible wrapper."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(ai_sandbox.router)


@app.get("/")
def read_root() -> dict[str, object]:
    """Return concise service metadata at the root endpoint."""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "phase": settings.phase,
        "health_endpoint": "/api/health",
        "ai_endpoint": "/api/ai/analyze",
    }
