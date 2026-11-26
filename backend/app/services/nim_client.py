"""OpenAI-compatible NVIDIA NIM telemetry evaluator with deterministic fallback."""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from typing import Literal

from openai import AsyncOpenAI

from app.config import Settings, get_settings

RiskLevel = Literal["NORMAL", "CAUTION", "CRITICAL"]
InferenceMode = Literal["nim-live", "local-fallback"]

_VALID_RISK_LEVELS: set[str] = {"NORMAL", "CAUTION", "CRITICAL"}


@dataclass(frozen=True)
class TelemetrySnapshot:
    """Normalized elder + sensor telemetry payload submitted for AI triage."""

    elder_name: str
    elder_age: int
    language: str
    heart_rate: float
    spo2: float
    body_temp_f: float
    lpg_ppm: float
    radar_state: str
    ac_mains_connected: bool
    escalation_stage: int
    custom_prompt: str | None = None


@dataclass(frozen=True)
class NimAnalysisResult:
    """Structured triage result returned to the frontend AI sandbox card."""

    mode: InferenceMode
    model: str
    risk_level: RiskLevel
    clinical_summary: str
    recommended_action: str
    latency_ms: int


def _age_tier_label(age: int) -> str:
    if age >= 80:
        return "High-Assist Frail Senior (80+)"
    if age >= 70:
        return "Enhanced Legibility Senior (70-79)"
    return "Standard Active Senior (50-69)"


def _language_name(code: str) -> str:
    if code == "hi":
        return "Hindi (Devanagari, simple polite clinical wording)"
    if code == "bn":
        return "Bengali (Bangla script, simple polite clinical wording)"
    return "English (clear clinical engineering prose)"


def _extract_json_block(raw_text: str) -> dict[str, object] | None:
    """Parse JSON cleanly even if a model wraps output in markdown code fences."""
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            return None
    return None


def _evaluate_deterministic_fallback(
    snapshot: TelemetrySnapshot,
    *,
    model: str,
    start_ts: float,
    fallback_reason: str | None = None,
) -> NimAnalysisResult:
    """Evaluate telemetry deterministically using XYZ Home Deck age-adjusted clinical thresholds."""
    is_frail = snapshot.elder_age >= 80
    spo2_crit = 90.0
    spo2_warn = 94.0 if is_frail else 93.0
    hr_high_crit = 120.0 if is_frail else 125.0
    hr_low_crit = 46.0 if is_frail else 44.0
    hr_high_warn = 98.0 if is_frail else 104.0
    hr_low_warn = 54.0 if is_frail else 50.0
    temp_crit = 101.2 if is_frail else 101.5
    temp_warn = 99.5 if is_frail else 99.8

    findings: list[str] = []
    risk_level: RiskLevel = "NORMAL"

    if snapshot.lpg_ppm > 400:
        risk_level = "CRITICAL"
        findings.append(
            f"combustible gas spike at {snapshot.lpg_ppm:.0f} ppm triggering exhaust relay CH1"
        )
    if snapshot.escalation_stage >= 2:
        risk_level = "CRITICAL"
        findings.append(
            f"active Stage {snapshot.escalation_stage} unacknowledged emergency escalation"
        )
    if snapshot.spo2 < spo2_crit:
        risk_level = "CRITICAL"
        findings.append(f"severe hypoxemia at {snapshot.spo2:.0f}% SpO2")
    if snapshot.heart_rate > hr_high_crit or snapshot.heart_rate < hr_low_crit:
        risk_level = "CRITICAL"
        findings.append(f"out-of-range heart rate at {snapshot.heart_rate:.0f} BPM")
    if snapshot.body_temp_f >= temp_crit:
        risk_level = "CRITICAL"
        findings.append(f"high fever at {snapshot.body_temp_f:.1f}°F")

    if risk_level != "CRITICAL":
        if snapshot.escalation_stage == 1:
            risk_level = "CAUTION"
            findings.append("Stage 1 local confirmation alarm awaiting elder tap")
        if snapshot.radar_state == "BED_EMPTY_NIGHT":
            risk_level = "CAUTION"
            findings.append("night bed absence detected on 24GHz mmWave radar")
        if snapshot.lpg_ppm >= 200:
            risk_level = "CAUTION"
            findings.append(f"elevated MQ-2 gas reading at {snapshot.lpg_ppm:.0f} ppm")
        if snapshot.spo2 < spo2_warn:
            risk_level = "CAUTION"
            findings.append(f"borderline oxygen saturation at {snapshot.spo2:.0f}% SpO2")
        if snapshot.heart_rate > hr_high_warn or snapshot.heart_rate < hr_low_warn:
            risk_level = "CAUTION"
            findings.append(f"borderline pulse at {snapshot.heart_rate:.0f} BPM")
        if snapshot.body_temp_f >= temp_warn or snapshot.body_temp_f < 96.5:
            risk_level = "CAUTION"
            findings.append(f"thermal drift to {snapshot.body_temp_f:.1f}°F")
        if not snapshot.ac_mains_connected:
            risk_level = "CAUTION"
            findings.append("wall AC mains loss with hub running on 3S2P Li-ion UPS")

    if risk_level == "CRITICAL":
        issue_text = "; ".join(findings)
        clinical_summary = (
            f"{snapshot.elder_name} (age {snapshot.elder_age}) shows critical telemetry: "
            f"{issue_text}. Immediate bedside verification is required because combined "
            f"readings exceed age-adjusted safety thresholds."
        )
        if snapshot.lpg_ppm > 400:
            recommended_action = (
                "Keep ESP32-S3 Relay CH1 exhaust ventilation energized, sound the local piezo siren, "
                "and dispatch family/neighbor verification immediately for gas evacuation."
            )
        else:
            recommended_action = (
                "Escalate immediately to GSM SIM800L call + Telegram SOS with vitals "
                f"({snapshot.heart_rate:.0f} BPM, {snapshot.spo2:.0f}% SpO2, {snapshot.body_temp_f:.1f}°F) "
                "until caregiver confirmation."
            )
    elif risk_level == "CAUTION":
        issue_text = "; ".join(findings)
        clinical_summary = (
            f"{snapshot.elder_name} (age {snapshot.elder_age}) presents a non-critical caution "
            f"condition driven by {issue_text}. Baseline vitals remain "
            f"{snapshot.heart_rate:.0f} BPM HR, {snapshot.spo2:.0f}% SpO2, and {snapshot.body_temp_f:.1f}°F."
        )
        if snapshot.radar_state == "BED_EMPTY_NIGHT":
            recommended_action = (
                "Illuminate bedside pathway guidance, monitor 24GHz radar return timer, and trigger a "
                "gentle voice check-in if bed absence exceeds 15 minutes."
            )
        elif not snapshot.ac_mains_connected:
            recommended_action = (
                "Maintain 3S2P UPS brownout telemetry logging on INA219 and notify the guardian app "
                "of ongoing grid outage while local vitals monitoring continues."
            )
        else:
            recommended_action = (
                "Prompt a calming tactile check-in on the 7-inch kiosk and re-sample MAX30102/MLX90614 "
                "within 60 seconds before escalating to Stage 2 family alerts."
            )
    else:
        power_phrase = (
            "AC mains power steady"
            if snapshot.ac_mains_connected
            else "running smoothly on 3S2P UPS"
        )
        clinical_summary = (
            f"{snapshot.elder_name} (age {snapshot.elder_age}, {_age_tier_label(snapshot.elder_age)}) "
            f"shows stable baseline vitals at {snapshot.heart_rate:.0f} BPM, {snapshot.spo2:.0f}% SpO2, "
            f"and {snapshot.body_temp_f:.1f}°F. Air quality is safe ({snapshot.lpg_ppm:.0f} ppm LPG) "
            f"with radar state {snapshot.radar_state} and {power_phrase}."
        )
        recommended_action = (
            "Continue passive ESP32-S3 reflex monitoring and log the routine wellness check-in "
            "with zero guardian alert escalation."
        )

    if snapshot.custom_prompt and snapshot.custom_prompt.strip():
        note_prefix = (
            "Offline clinical rules evaluated your custom query: "
            if fallback_reason is None
            else f"Fallback rules ({fallback_reason}) evaluated your custom query: "
        )
        recommended_action = f"{recommended_action} [{note_prefix}\"{snapshot.custom_prompt.strip()[:120]}\"]"

    latency_ms = max(1, round((time.perf_counter() - start_ts) * 1000))
    return NimAnalysisResult(
        mode="local-fallback",
        model=model,
        risk_level=risk_level,
        clinical_summary=clinical_summary,
        recommended_action=recommended_action,
        latency_ms=latency_ms,
    )


class NimClientService:
    """Wraps NVIDIA NIM completions with seamless deterministic local fallback."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._client: AsyncOpenAI | None = None

    def _get_client(self) -> AsyncOpenAI | None:
        if not self._settings.is_nim_configured:
            return None
        if self._client is None:
            self._client = AsyncOpenAI(
                base_url=self._settings.nvidia_nim_base_url,
                api_key=self._settings.nvidia_api_key,
                timeout=20.0,
            )
        return self._client

    async def analyze_telemetry(self, snapshot: TelemetrySnapshot) -> NimAnalysisResult:
        """Evaluate telemetry with NVIDIA NIM when configured, else deterministic local rules."""
        start_ts = time.perf_counter()
        client = self._get_client()
        if client is None:
            return _evaluate_deterministic_fallback(
                snapshot,
                model=self._settings.nvidia_nim_model,
                start_ts=start_ts,
            )

        # Strictly use only 'system' and 'user' roles for full NVIDIA NIM compatibility.
        system_prompt = (
            "You are the clinical telemetry triage assistant for XYZ Home Deck, an offline-first "
            "elderly care and safety hub running on Raspberry Pi 4 and ESP32-S3. "
            "Respond ONLY with valid JSON containing exactly three keys: "
            '"risk_level" ("NORMAL", "CAUTION", or "CRITICAL"), '
            '"clinical_summary" (concise 2-sentence assessment tailored to the elder age and readings), and '
            '"recommended_action" (one clear next step for the hub or family guardian). '
            "Never wrap the JSON in markdown fences or add extra keys."
        )

        custom_section = (
            f"\nSpecific operator question: {snapshot.custom_prompt.strip()}"
            if snapshot.custom_prompt and snapshot.custom_prompt.strip()
            else ""
        )

        user_prompt = (
            f"Elder profile: {snapshot.elder_name}, age {snapshot.elder_age} "
            f"({_age_tier_label(snapshot.elder_age)})\n"
            f"Output prose language for clinical_summary and recommended_action: "
            f"{_language_name(snapshot.language)}\n"
            f"Live Telemetry Snapshot:\n"
            f"- Heart Rate (MAX30102): {snapshot.heart_rate:.0f} BPM\n"
            f"- Blood Oxygen SpO2 (MAX30102): {snapshot.spo2:.0f}%\n"
            f"- Body Temperature (MLX90614): {snapshot.body_temp_f:.1f}°F\n"
            f"- Combustible Gas / Smoke (MQ-2): {snapshot.lpg_ppm:.0f} ppm\n"
            f"- 24GHz mmWave Radar State (HLK-LD2410B): {snapshot.radar_state}\n"
            f"- AC Mains Connected: {snapshot.ac_mains_connected}\n"
            f"- Current Hub Escalation Stage (0-4): Stage {snapshot.escalation_stage}"
            f"{custom_section}"
        )

        try:
            completion = await client.chat.completions.create(
                model=self._settings.nvidia_nim_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                max_tokens=360,
            )
            raw_content = (completion.choices[0].message.content or "").strip()
            parsed = _extract_json_block(raw_content)

            deterministic_ref = _evaluate_deterministic_fallback(
                snapshot,
                model=self._settings.nvidia_nim_model,
                start_ts=start_ts,
            )

            if parsed is not None:
                raw_risk = str(parsed.get("risk_level", "")).strip().upper()
                risk_level: RiskLevel = (
                    raw_risk  # type: ignore[assignment]
                    if raw_risk in _VALID_RISK_LEVELS
                    else deterministic_ref.risk_level
                )
                clinical_summary = str(parsed.get("clinical_summary", "")).strip()
                recommended_action = str(parsed.get("recommended_action", "")).strip()
                if clinical_summary and recommended_action:
                    latency_ms = max(1, round((time.perf_counter() - start_ts) * 1000))
                    return NimAnalysisResult(
                        mode="nim-live",
                        model=self._settings.nvidia_nim_model,
                        risk_level=risk_level,
                        clinical_summary=clinical_summary,
                        recommended_action=recommended_action,
                        latency_ms=latency_ms,
                    )

            if raw_content:
                latency_ms = max(1, round((time.perf_counter() - start_ts) * 1000))
                return NimAnalysisResult(
                    mode="nim-live",
                    model=self._settings.nvidia_nim_model,
                    risk_level=deterministic_ref.risk_level,
                    clinical_summary=raw_content[:500],
                    recommended_action=deterministic_ref.recommended_action,
                    latency_ms=latency_ms,
                )

            return _evaluate_deterministic_fallback(
                snapshot,
                model=self._settings.nvidia_nim_model,
                start_ts=start_ts,
                fallback_reason="empty NIM response",
            )
        except Exception as exc:
            return _evaluate_deterministic_fallback(
                snapshot,
                model=self._settings.nvidia_nim_model,
                start_ts=start_ts,
                fallback_reason=type(exc).__name__,
            )


nim_client_service = NimClientService()
