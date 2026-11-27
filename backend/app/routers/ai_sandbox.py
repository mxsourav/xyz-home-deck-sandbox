"""AI telemetry triage router wired to NVIDIA NIM with deterministic fallback."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.nim_client import (
    CarePlanRequestData,
    TelemetrySnapshot,
    nim_client_service,
)

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
    tof_posture_state: Literal[
        "UPRIGHT", "IN_BED", "BED_EDGE_DROP", "FLOOR_SILHOUETTE"
    ] = "UPRIGHT"
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
        tof_posture_state=payload.tof_posture_state,
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


class CarePlanRequest(BaseModel):
    """Comprehensive elder registration payload for AI care & alarm schedule JSON."""

    name: str = Field(default="Subhashree Devi", min_length=1, max_length=120)
    age: int = Field(default=78, ge=18, le=120)
    language: Literal["en", "hi", "bn"] = "bn"
    allergies: list[str] = Field(default_factory=list)
    conditions: list[str] = Field(default_factory=list)
    medications: list[str] = Field(default_factory=list)
    wake_time: str = Field(default="05:45", min_length=4, max_length=10)
    sleep_time: str = Field(default="21:30", min_length=4, max_length=10)


class CareAlarmItem(BaseModel):
    """Single alarm entry pushed to the 7-inch Kiosk scheduler."""

    time: str
    category: Literal["VITALS", "EXERCISE", "MEDICATION", "HYDRATION", "MEAL"]
    title: str
    spoken_prompt: str


class CarePlanResponse(BaseModel):
    """Structured AI-generated daily care schedule & dietary guardrails."""

    mode: Literal["nim-live", "local-fallback"]
    model: str
    latency_ms: int
    profile_summary: str
    ui_mode: Literal["STANDARD_50", "HIGH_ASSIST_78"]
    hydration_goal_ml: int
    sleep_watch_window: dict[str, object]
    daily_alarms: list[CareAlarmItem]
    nutrition_rules: dict[str, list[str]]


@router.post("/care-plan", response_model=CarePlanResponse)
async def generate_care_plan(payload: CarePlanRequest) -> CarePlanResponse:
    """Generate personalized daily care alarms, hydration/exercise plan, and nutrition rules."""
    req = CarePlanRequestData(
        name=payload.name.strip(),
        age=payload.age,
        language=payload.language,
        allergies=[a.strip() for a in payload.allergies if a.strip()],
        conditions=[c.strip() for c in payload.conditions if c.strip()],
        medications=[m.strip() for m in payload.medications if m.strip()],
        wake_time=payload.wake_time.strip(),
        sleep_time=payload.sleep_time.strip(),
    )
    res = await nim_client_service.generate_care_plan(req)
    return CarePlanResponse(
        mode=res.mode,
        model=res.model,
        latency_ms=res.latency_ms,
        profile_summary=res.profile_summary,
        ui_mode=res.ui_mode,
        hydration_goal_ml=res.hydration_goal_ml,
        sleep_watch_window=res.sleep_watch_window,
        daily_alarms=[CareAlarmItem(**alarm) for alarm in res.daily_alarms],
        nutrition_rules=res.nutrition_rules,
    )
