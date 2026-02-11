"""Metadata endpoints — speakers, languages, models."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Request

from ttsweb.schemas import LanguageInfo, ModelInfo, SpeakerInfo

logger = logging.getLogger("ttsweb.routers.meta")

router = APIRouter(tags=["Metadata"])

# ── Static Data ─────────────────────────────────────────────────────────────

SUPPORTED_LANGUAGES = [
    LanguageInfo(code="zh", name="Chinese"),
    LanguageInfo(code="en", name="English"),
    LanguageInfo(code="ja", name="Japanese"),
    LanguageInfo(code="ko", name="Korean"),
    LanguageInfo(code="de", name="German"),
    LanguageInfo(code="fr", name="French"),
    LanguageInfo(code="ru", name="Russian"),
    LanguageInfo(code="pt", name="Portuguese"),
    LanguageInfo(code="es", name="Spanish"),
    LanguageInfo(code="it", name="Italian"),
]

# Speaker list from Qwen3-TTS-12Hz-1.7B-CustomVoice
SPEAKERS = [
    SpeakerInfo(
        name="Vivian",
        languages=["Chinese", "English"],
        description="Female, warm and expressive. Native Chinese, fluent English.",
    ),
    SpeakerInfo(
        name="Ryan",
        languages=["English", "Chinese"],
        description="Male, clear and confident voice. Native English speaker.",
    ),
    SpeakerInfo(
        name="Aria",
        languages=["English"],
        description="Female, professional and calm tone. Great for narration.",
    ),
    SpeakerInfo(
        name="Oliver",
        languages=["English"],
        description="Male, friendly and conversational voice.",
    ),
    SpeakerInfo(
        name="Bella",
        languages=["Chinese"],
        description="Female, youthful and energetic voice. Native Chinese speaker.",
    ),
    SpeakerInfo(
        name="Ethan",
        languages=["Chinese", "English"],
        description="Male, deep and authoritative voice.",
    ),
    SpeakerInfo(
        name="Claire",
        languages=["English", "French"],
        description="Female, elegant and articulate voice.",
    ),
    SpeakerInfo(
        name="Lucas",
        languages=["English", "German"],
        description="Male, warm and steady voice.",
    ),
    SpeakerInfo(
        name="Sophia",
        languages=["Japanese", "English"],
        description="Female, gentle and melodic voice.",
    ),
    SpeakerInfo(
        name="Leo",
        languages=["Korean", "English"],
        description="Male, dynamic and expressive voice.",
    ),
]


@router.get(
    "/speakers",
    response_model=list[SpeakerInfo],
    summary="List available preset speakers",
    description="Returns all speakers available for the custom-voice mode.",
)
async def list_speakers():
    return SPEAKERS


@router.get(
    "/languages",
    response_model=list[LanguageInfo],
    summary="List supported languages",
    description="Returns all languages supported by Qwen3-TTS.",
)
async def list_languages():
    return SUPPORTED_LANGUAGES


@router.get(
    "/models",
    response_model=list[ModelInfo],
    summary="List model status",
    description="Returns information about available model variants and their load status.",
)
async def list_models(request: Request):
    mm = request.app.state.model_manager
    loaded = set(mm.loaded_models)

    return [
        ModelInfo(
            name="Qwen3-TTS-12Hz-1.7B-CustomVoice",
            variant="custom_voice",
            loaded="custom_voice" in loaded or mm.mock_mode,
            description="Preset speaker voices with optional instruction control.",
        ),
        ModelInfo(
            name="Qwen3-TTS-12Hz-1.7B-VoiceDesign",
            variant="voice_design",
            loaded="voice_design" in loaded or mm.mock_mode,
            description="Natural-language voice design — describe and generate.",
        ),
        ModelInfo(
            name="Qwen3-TTS-12Hz-1.7B-Base",
            variant="base",
            loaded="base" in loaded or mm.mock_mode,
            description="Voice cloning from reference audio.",
        ),
        ModelInfo(
            name="Qwen3-TTS-Tokenizer-12Hz",
            variant="tokenizer",
            loaded="tokenizer" in loaded or mm.mock_mode,
            description="Audio tokenizer for encode/decode operations.",
        ),
    ]
