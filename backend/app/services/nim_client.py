"""OpenAI-compatible NVIDIA NIM client wrapper with safe Phase 1 stub fallback."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from openai import AsyncOpenAI

from app.config import Settings, get_settings


@dataclass(frozen=True)
class NimAnalysisResult:
    """Structured result returned by the NVIDIA NIM wrapper."""

    mode: str
    nim_configured: bool
    model: str
    summary: str
    escalation_stage_hint: str
    notes: list[str]


class NimClientService:
    """Wraps NVIDIA NIM completions while never crashing when NVIDIA_API_KEY is unset."""

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

    async def analyze_telemetry(
        self,
        *,
        prompt: str,
        telemetry: dict[str, Any],
        language: str = "en",
    ) -> NimAnalysisResult:
        """Analyze telemetry or return a deterministic stub when NIM is not configured."""
        client = self._get_client()
        if client is None:
            return NimAnalysisResult(
                mode="stub",
                nim_configured=False,
                model=self._settings.nvidia_nim_model,
                summary=(
                    "Phase 1 NIM placeholder active. Set NVIDIA_API_KEY in backend/.env "
                    "or Render environment settings to enable live NVIDIA NIM reasoning."
                ),
                escalation_stage_hint="stage_0_standby",
                notes=[
                    f"Requested prompt length: {len(prompt)} chars",
                    f"Telemetry fields received: {', '.join(sorted(telemetry.keys())) or 'none'}",
                    f"Target response language: {language}",
                ],
            )

        system_prompt = (
            "You are the telemetry reasoning assistant for XYZ Home Deck, an autonomous "
            "elderly care and safety guardian powered by Raspberry Pi 4 and ESP32-S3. "
            "Provide concise, calm, clinical engineering triage guidance grounded only in "
            "the submitted telemetry snapshot."
        )
        user_content = (
            f"Language: {language}\n"
            f"Telemetry snapshot: {telemetry}\n"
            f"Query: {prompt}"
        )

        completion = await client.chat.completions.create(
            model=self._settings.nvidia_nim_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.2,
            max_tokens=400,
        )
        reply = (completion.choices[0].message.content or "").strip()

        return NimAnalysisResult(
            mode="live",
            nim_configured=True,
            model=self._settings.nvidia_nim_model,
            summary=reply or "NVIDIA NIM returned an empty completion.",
            escalation_stage_hint="evaluated_by_nim",
            notes=[
                f"Base URL: {self._settings.nvidia_nim_base_url}",
                f"Target response language: {language}",
            ],
        )


nim_client_service = NimClientService()
