"""AI sandbox placeholder router wired to NVIDIA NIM."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.nim_client import nim_client_service

router = APIRouter(prefix="/api/ai", tags=["ai-sandbox"])


class AnalyzeRequest(BaseModel):
    """Structured request payload for Phase 1+ telemetry reasoning."""

    prompt: str = Field(
        default="Summarize baseline hardware and sensor telemetry status.",
        min_length=1,
        max_length=2000,
    )
    telemetry: dict[str, Any] = Field(default_factory=dict)
    language: str = Field(default="en", pattern="^(en|bn|hi)$")


class AnalyzeResponse(BaseModel):
    """Structured response payload returned to the SPA."""

    mode: str
    nim_configured: bool
    model: str
    summary: str
    escalation_stage_hint: str
    notes: list[str]


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_telemetry(payload: AnalyzeRequest) -> AnalyzeResponse:
    """Run placeholder or live NVIDIA NIM evaluation on telemetry data."""
    try:
        result = await nim_client_service.analyze_telemetry(
            prompt=payload.prompt,
            telemetry=payload.telemetry,
            language=payload.language,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"NVIDIA NIM upstream error: {type(exc).__name__}",
        ) from exc

    return AnalyzeResponse(
        mode=result.mode,
        nim_configured=result.nim_configured,
        model=result.model,
        summary=result.summary,
        escalation_stage_hint=result.escalation_stage_hint,
        notes=result.notes,
    )
