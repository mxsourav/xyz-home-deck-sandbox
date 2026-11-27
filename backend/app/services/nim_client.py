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
UiMode = Literal["STANDARD_50", "HIGH_ASSIST_78"]
AlarmCategory = Literal["VITALS", "EXERCISE", "MEDICATION", "HYDRATION", "MEAL"]

_VALID_RISK_LEVELS: set[str] = {"NORMAL", "CAUTION", "CRITICAL"}
_VALID_ALARM_CATEGORIES: set[str] = {
    "VITALS",
    "EXERCISE",
    "MEDICATION",
    "HYDRATION",
    "MEAL",
}


@dataclass(frozen=True)
class CarePlanRequestData:
    """Normalized onboarding profile payload for AI daily care & alarm generation."""

    name: str
    age: int
    language: str
    allergies: list[str]
    conditions: list[str]
    medications: list[str]
    wake_time: str
    sleep_time: str


@dataclass(frozen=True)
class CarePlanResultData:
    """Structured machine-readable daily schedule & nutrition guardrails."""

    mode: InferenceMode
    model: str
    latency_ms: int
    profile_summary: str
    ui_mode: UiMode
    hydration_goal_ml: int
    sleep_watch_window: dict[str, object]
    daily_alarms: list[dict[str, str]]
    nutrition_rules: dict[str, list[str]]


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
    tof_posture_state: str = "UPRIGHT"
    ac_mains_connected: bool = True
    escalation_stage: int = 0
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
    if snapshot.tof_posture_state == "FLOOR_SILHOUETTE":
        risk_level = "CRITICAL"
        findings.append(
            "VL53L5CX 64-zone ToF floor silhouette (camera-free body-on-floor depth map)"
        )

    if risk_level != "CRITICAL":
        if snapshot.escalation_stage == 1:
            risk_level = "CAUTION"
            findings.append("Stage 1 local confirmation alarm awaiting elder tap")
        if snapshot.radar_state == "BED_EMPTY_NIGHT":
            risk_level = "CAUTION"
            findings.append("night bed absence detected on 24GHz mmWave radar")
        if snapshot.tof_posture_state == "BED_EDGE_DROP":
            risk_level = "CAUTION"
            findings.append("VL53L5CX bed-edge drop silhouette detected (camera-free)")
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
                "Illuminate bedside pathway guidance, monitor 24GHz radar return timer and the "
                "VL53L5CX bed-edge silhouette, and trigger a gentle voice check-in if bed absence "
                "exceeds 15 minutes."
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


_NIM_FALLBACK_MODELS: tuple[str, ...] = (
    "nvidia/nemotron-3.5-bolt-e4b",
    "nvidia/nemotron-3.5-lightning-30b-a3b",
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

    async def _complete_json_prompt(
        self,
        client: AsyncOpenAI,
        *,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int,
    ) -> tuple[str, str]:
        """Try primary configured NIM model then verified active serverless models."""
        candidates: list[str] = []
        for candidate in (self._settings.nvidia_nim_model, *_NIM_FALLBACK_MODELS):
            cleaned = candidate.strip()
            if cleaned and cleaned not in candidates:
                candidates.append(cleaned)

        last_exc: Exception | None = None
        for model_id in candidates:
            try:
                completion = await client.chat.completions.create(
                    model=model_id,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.2,
                    max_tokens=max_tokens,
                )
                content = (completion.choices[0].message.content or "").strip()
                if content:
                    return content, model_id
            except Exception as exc:
                last_exc = exc

        if last_exc is not None:
            raise last_exc
        return "", self._settings.nvidia_nim_model

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
            f"- VL53L5CX 64-Zone ToF Posture (camera-free night depth): {snapshot.tof_posture_state}\n"
            f"- AC Mains Connected: {snapshot.ac_mains_connected}\n"
            f"- Current Hub Escalation Stage (0-4): Stage {snapshot.escalation_stage}"
            f"{custom_section}"
        )

        try:
            raw_content, used_model = await self._complete_json_prompt(
                client,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=360,
            )
            parsed = _extract_json_block(raw_content)

            deterministic_ref = _evaluate_deterministic_fallback(
                snapshot,
                model=used_model,
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
                        model=used_model,
                        risk_level=risk_level,
                        clinical_summary=clinical_summary,
                        recommended_action=recommended_action,
                        latency_ms=latency_ms,
                    )

            if raw_content:
                latency_ms = max(1, round((time.perf_counter() - start_ts) * 1000))
                return NimAnalysisResult(
                    mode="nim-live",
                    model=used_model,
                    risk_level=deterministic_ref.risk_level,
                    clinical_summary=raw_content[:500],
                    recommended_action=deterministic_ref.recommended_action,
                    latency_ms=latency_ms,
                )

            return _evaluate_deterministic_fallback(
                snapshot,
                model=used_model,
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

    async def generate_care_plan(
        self, req: CarePlanRequestData
    ) -> CarePlanResultData:
        """Generate structured daily alarms & nutrition guardrails via NIM or deterministic fallback."""
        start_ts = time.perf_counter()
        fallback = _build_deterministic_care_plan(
            req, model=self._settings.nvidia_nim_model, start_ts=start_ts
        )

        client = self._get_client()
        if client is None:
            return fallback

        system_prompt = (
            "You are a geriatric clinical planner for XYZ Home Deck (Raspberry Pi 4 + ESP32-S3 hub). "
            "Respond ONLY with strict valid JSON matching these keys exactly: "
            '"profile_summary" (string, 1-2 sentences), '
            '"ui_mode" ("HIGH_ASSIST_78" if age >= 65 else "STANDARD_50"), '
            '"hydration_goal_ml" (integer 1500-3000), '
            '"sleep_watch_window" ({"start": "<HH:MM>", "end": "<HH:MM>", "absence_timeout_min": 15}), '
            '"daily_alarms" (array of 5-7 items each with "time" HH:MM, "category" in ["VITALS","EXERCISE","MEDICATION","HYDRATION","MEAL"], "title", and "spoken_prompt"), '
            '"nutrition_rules" ({"recommended": [3-4 concise items], "strictly_avoid": [3-4 concise items strictly honoring allergies and conditions]}). '
            "Never wrap output in markdown fences or add extra keys."
        )

        user_prompt = (
            f"Name: {req.name}\n"
            f"Age: {req.age} (UI Mode: {'HIGH_ASSIST_78' if req.age >= 65 else 'STANDARD_50'})\n"
            f"Spoken prompt language: {_language_name(req.language)}\n"
            f"Allergies: {', '.join(req.allergies) or 'None reported'}\n"
            f"Medical conditions: {', '.join(req.conditions) or 'None reported'}\n"
            f"Medications & timings: {', '.join(req.medications) or 'None'}\n"
            f"Wake-up time: {req.wake_time} | Sleep time: {req.sleep_time}\n"
            "Ensure exercise is age-safe (e.g., seated/joint-friendly if 65+ or Osteoarthritis; brisk walk/cardio if <65 without joint limits) "
            "and strictly ban all listed allergens under nutrition_rules.strictly_avoid."
        )

        try:
            raw_content, used_model = await self._complete_json_prompt(
                client,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=700,
            )
            parsed = _extract_json_block(raw_content)
            if not parsed:
                return fallback

            summary = str(parsed.get("profile_summary", "")).strip()
            raw_alarms = parsed.get("daily_alarms")
            raw_nutrition = parsed.get("nutrition_rules")

            if (
                not summary
                or not isinstance(raw_alarms, list)
                or len(raw_alarms) == 0
                or not isinstance(raw_nutrition, dict)
            ):
                return fallback

            clean_alarms: list[dict[str, str]] = []
            for item in raw_alarms[:8]:
                if not isinstance(item, dict):
                    continue
                cat = str(item.get("category", "HYDRATION")).strip().upper()
                if cat not in _VALID_ALARM_CATEGORIES:
                    cat = "HYDRATION"
                alarm_time = str(item.get("time", "09:00")).strip()[:16]
                title = str(item.get("title", "")).strip()
                spoken = str(item.get("spoken_prompt", "")).strip()
                if title and spoken:
                    clean_alarms.append(
                        {
                            "time": alarm_time,
                            "category": cat,
                            "title": title,
                            "spoken_prompt": spoken,
                        }
                    )

            if not clean_alarms:
                return fallback

            rec = [
                str(x).strip()
                for x in (raw_nutrition.get("recommended") or [])
                if str(x).strip()
            ]
            avoid = [
                str(x).strip()
                for x in (raw_nutrition.get("strictly_avoid") or [])
                if str(x).strip()
            ]

            raw_goal = parsed.get("hydration_goal_ml", fallback.hydration_goal_ml)
            try:
                hydration_goal = max(1200, min(3500, int(raw_goal)))  # type: ignore[arg-type]
            except (TypeError, ValueError):
                hydration_goal = fallback.hydration_goal_ml

            ui_mode: UiMode = (
                "HIGH_ASSIST_78" if req.age >= 65 else "STANDARD_50"
            )
            latency_ms = max(1, round((time.perf_counter() - start_ts) * 1000))
            return CarePlanResultData(
                mode="nim-live",
                model=used_model,
                latency_ms=latency_ms,
                profile_summary=summary,
                ui_mode=ui_mode,
                hydration_goal_ml=hydration_goal,
                sleep_watch_window={
                    "start": req.sleep_time,
                    "end": req.wake_time,
                    "absence_timeout_min": 15,
                },
                daily_alarms=clean_alarms,
                nutrition_rules={
                    "recommended": rec or fallback.nutrition_rules["recommended"],
                    "strictly_avoid": avoid or fallback.nutrition_rules["strictly_avoid"],
                },
            )
        except Exception:
            return fallback


def _parse_hhmm_minutes(hhmm: str, default_min: int) -> int:
    try:
        parts = hhmm.strip().split(":")
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 else 0
        if 0 <= h <= 23 and 0 <= m <= 59:
            return h * 60 + m
    except (ValueError, IndexError):
        pass
    return default_min


def _fmt_hhmm(total_minutes: int) -> str:
    wrapped = total_minutes % (24 * 60)
    return f"{wrapped // 60:02d}:{wrapped % 60:02d}"


def _build_deterministic_care_plan(
    req: CarePlanRequestData, *, model: str, start_ts: float
) -> CarePlanResultData:
    """Deterministic age-, allergy-, condition-, and sleep-schedule care generator."""
    is_senior = req.age >= 65
    ui_mode: UiMode = "HIGH_ASSIST_78" if is_senior else "STANDARD_50"
    wake_min = _parse_hhmm_minutes(req.wake_time, 6 * 60)
    lowered_conds = {c.lower() for c in req.conditions}
    has_arthritis = any("arthrit" in c or "joint" in c for c in lowered_conds)
    has_diabetes = any("diabet" in c for c in lowered_conds)
    has_hypertension = any("hypertens" in c or "bp" in c for c in lowered_conds)

    hydration_goal_ml = 1800 if is_senior else 2500

    # Schedule alarms organically after wake_time
    alarms: list[dict[str, str]] = [
        {
            "time": _fmt_hhmm(wake_min + 15),
            "category": "VITALS",
            "title": "Morning Baseline Vitals Check-In",
            "spoken_prompt": (
                f"Good morning {req.name}. Please place your finger on the pulse pad and look at the temperature sensor."
                if req.language == "en"
                else (
                    f"सुप्रभात {req.name}। कृपया अपनी दैनिक सुबह की स्वास्थ्य जांच दर्ज करें।"
                    if req.language == "hi"
                    else f"সুপ্রভাত {req.name}। অনুগ্রহ করে সকালের দৈনিক স্বাস্থ্য পরীক্ষা সম্পন্ন করুন।"
                )
            ),
        },
        {
            "time": _fmt_hhmm(wake_min + 75),
            "category": "EXERCISE",
            "title": (
                "15-Min Seated Chair Yoga & Joint Mobility"
                if (is_senior or has_arthritis)
                else "30-Min Brisk Walk & Cardiovascular Stretching"
            ),
            "spoken_prompt": (
                f"{req.name}, time for gentle seated chair yoga and slow breathing exercises."
                if (is_senior or has_arthritis)
                else f"{req.name}, scheduled 30-minute brisk morning walk and stretching starts now."
            ),
        },
        {
            "time": "08:30",
            "category": "MEDICATION",
            "title": (
                f"Medication & Water: {req.medications[0]}"
                if req.medications
                else "Morning Nutrition & Glass of Water"
            ),
            "spoken_prompt": (
                f"Reminder for {req.name}: Drink one full glass of water and take {req.medications[0]}."
                if req.medications
                else f"Reminder for {req.name}: Time for a glass of water and breakfast."
            ),
        },
        {
            "time": _fmt_hhmm(wake_min + 210),
            "category": "HYDRATION",
            "title": "Mid-Morning Hydration Check (250 ml)",
            "spoken_prompt": f"{req.name}, hydration reminder: please drink one glass of water to meet your {hydration_goal_ml} ml daily goal.",
        },
        {
            "time": "13:30",
            "category": "MEAL",
            "title": (
                req.medications[1]
                if len(req.medications) > 1
                else "Afternoon Lunch + Allergy-Safe Nutrition Check"
            ),
            "spoken_prompt": (
                f"Lunch reminder for {req.name}. Enjoy a balanced meal and take {req.medications[1]}."
                if len(req.medications) > 1
                else f"Afternoon meal reminder for {req.name}. Choose whole grains and hydrate afterwards."
            ),
        },
        {
            "time": "17:00",
            "category": "HYDRATION",
            "title": "Evening Water & Mobility Stretch (250 ml)",
            "spoken_prompt": f"Evening check-in for {req.name}: drink a glass of water and avoid long sitting intervals.",
        },
    ]

    if len(req.medications) > 0 and "08:30 PM" in req.medications[0]:
        alarms.append(
            {
                "time": "20:30",
                "category": "MEDICATION",
                "title": f"Evening Dose: {req.medications[0]}",
                "spoken_prompt": f"Evening medication reminder for {req.name}: please take your night dose before sleep watch activates at {req.sleep_time}.",
            }
        )

    recommended: list[str] = [
        f"Target {hydration_goal_ml} ml water spaced every 2 hours between {req.wake_time} and {req.sleep_time}",
        "Fresh seasonal steamed vegetables, lentil dal soups, and home-cooked light protein",
    ]
    if has_hypertension:
        recommended.append("Potassium-rich greens, oats, and low-sodium herbs (<1,500 mg sodium/day)")
    if has_diabetes:
        recommended.append("High-fiber complex millets/oats with steady meal intervals to avoid glycemic spikes")
    if is_senior or has_arthritis:
        recommended.append("Warm turmeric milk/fortified calcium & Vitamin D3 intake for bone support")

    avoid: list[str] = []
    if req.allergies:
        avoid.append(
            f"STRICTLY AVOID declared allergens: {', '.join(req.allergies)} (cross-check labels & pharmacy refills)"
        )
    if has_diabetes:
        avoid.append("Refined table sugar, sweetened packaged juices, and heavy late-night carbohydrates")
    if has_hypertension:
        avoid.append("Salty pickles, deep-fried snacks, and processed canned sodium")
    if not avoid:
        avoid.append("Ultra-processed trans fats, excessive caffeine after 16:00, and dehydration")

    summary = (
        f"{req.name} (Age {req.age}) configured for {'High-Assist Ergonomic HUD (0.78x voice)' if is_senior else 'Standard Multi-Metric Cockpit (1.0x voice)'} "
        f"with 24GHz mmWave night watch armed {req.sleep_time}–{req.wake_time}."
    )

    latency_ms = max(1, round((time.perf_counter() - start_ts) * 1000))
    return CarePlanResultData(
        mode="local-fallback",
        model=model,
        latency_ms=latency_ms,
        profile_summary=summary,
        ui_mode=ui_mode,
        hydration_goal_ml=hydration_goal_ml,
        sleep_watch_window={
            "start": req.sleep_time,
            "end": req.wake_time,
            "absence_timeout_min": 15,
        },
        daily_alarms=alarms,
        nutrition_rules={
            "recommended": recommended[:4],
            "strictly_avoid": avoid[:4],
        },
    )


nim_client_service = NimClientService()
