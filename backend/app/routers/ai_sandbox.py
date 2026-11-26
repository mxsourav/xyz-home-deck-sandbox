"""AI telemetry triage router wired to NVIDIA NIM with deterministic fallback."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.nim_client import TelemetrySnapshot, nim_client_service

router = APIRouter(prefix="/api/ai", tags=["ai-sandbox"])


class AnalyzeRequest(BaseModel):
    """Structured elder + sensor telemetry payload for NVIDIA NIM evaluation."""

    elder_name: str = Field(default="Subhashree Devi", min_length=1, max_length=120)
    elder_age: int = Field(default=74, ge=18, le=120)
    language: Literal["en", "hi", "bn"] = "en"
    heart_rate: float = Field(default=74.0, ge=20.0, le=240.0)
    spo2: float = Field(default=98.0, ge=50.0, le=100.0)
    body_temp_f: float = Field(default=98.4, ge=90.0, le=110.0)
    lpg_ppm: float = Field(default=42.0, ge=0.0, le=5000.0)
    radar_state: str = Field(default="PRESENT_STILL", min_length=1, max_length=64)
    ac_mains_connected: bool = True
    escalation_stage: int = Field(default=0, ge=0, le=4)
    custom_prompt: str | None = Field(default=None, max_length=2000)


class AnalyzeResponse(BaseModel):
    """Structured triage response returned to the SPA."""

    mode: Literal["nim-live", "local-fallback"]
    model: str
    risk_level: Literal["NORMAL", "CAUTION", "CRITICAL"]
    clinical_summary: str
    recommended_action: str
    latency_ms: int


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_telemetry(payload: AnalyzeRequest) -> AnalyzeResponse:
    """Evaluate live telemetry via NVIDIA NIM or deterministic local clinical rules."""
    snapshot = TelemetrySnapshot(
        elder_name=payload.elder_name.strip(),
        elder_age=payload.elder_age,
        language=payload.language,
        heart_rate=payload.heart_rate,
        spo2=payload.spo2,
        body_temp_f=payload.body_temp_f,
        lpg_ppm=payload.lpg_ppm,
        radar_state=payload.radar_state.strip(),
        ac_mains_connected=payload.ac_mains_connected,
        escalation_stage=payload.escalation_stage,
        custom_prompt=payload.custom_prompt,
    )
    result = await nim_client_service.analyze_telemetry(snapshot)

    return AnalyzeResponse(
        mode=result.mode,
        model=result.model,
        risk_level=result.risk_level,
        clinical_summary=result.clinical_summary,
        recommended_action=result.recommended_action,
        latency_ms=result.latency_ms,
    )
