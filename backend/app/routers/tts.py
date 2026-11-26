"""Neural multilingual TTS endpoint backed by Microsoft Edge TTS with LRU cache."""

from __future__ import annotations

from collections import OrderedDict
from typing import Literal

import edge_tts
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

router = APIRouter(prefix="/api", tags=["tts"])

VOICE_MAP: dict[Literal["en", "hi", "bn"], str] = {
    "bn": "bn-IN-TanishaaNeural",
    "hi": "hi-IN-SwaraNeural",
    "en": "en-IN-NeerjaNeural",
}

_MAX_CACHE_ENTRIES = 192
_audio_cache: OrderedDict[tuple[str, str, str], bytes] = OrderedDict()


def _format_rate(rate: float) -> str:
    """Convert decimal speech rate (e.g., 0.88) to edge-tts rate string ('-12%')."""
    pct = max(-50, min(50, round((rate - 1.0) * 100)))
    return f"{pct:+d}%"


@router.get("/tts")
async def synthesize_speech(
    text: str = Query(..., min_length=1, max_length=600),
    lang: Literal["en", "hi", "bn"] = Query(default="en"),
    rate: float = Query(default=1.0, ge=0.5, le=1.5),
) -> Response:
    """Synthesize crisp Indian English, Hindi, or Bengali MP3 audio with in-memory caching."""
    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(status_code=422, detail="TTS text must not be blank.")

    voice = VOICE_MAP[lang]
    rate_str = _format_rate(rate)
    cache_key = (voice, rate_str, clean_text)

    if cache_key in _audio_cache:
        _audio_cache.move_to_end(cache_key)
        return Response(
            content=_audio_cache[cache_key],
            media_type="audio/mpeg",
            headers={
                "Cache-Control": "public, max-age=86400",
                "X-TTS-Cache": "HIT",
                "X-TTS-Voice": voice,
            },
        )

    audio_chunks = bytearray()
    try:
        communicate = edge_tts.Communicate(clean_text, voice, rate=rate_str)
        async for chunk in communicate.stream():
            if chunk.get("type") == "audio":
                data = chunk.get("data")
                if isinstance(data, (bytes, bytearray)):
                    audio_chunks.extend(data)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Neural TTS synthesis error: {type(exc).__name__}",
        ) from exc

    if not audio_chunks:
        raise HTTPException(
            status_code=503,
            detail="Neural TTS returned zero audio bytes.",
        )

    mp3_bytes = bytes(audio_chunks)
    _audio_cache[cache_key] = mp3_bytes
    _audio_cache.move_to_end(cache_key)
    while len(_audio_cache) > _MAX_CACHE_ENTRIES:
        _audio_cache.popitem(last=False)

    return Response(
        content=mp3_bytes,
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "public, max-age=86400",
            "X-TTS-Cache": "MISS",
            "X-TTS-Voice": voice,
        },
    )
