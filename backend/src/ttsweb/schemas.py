"""Pydantic v2 schemas — single source of truth for the API contract."""

from __future__ import annotations

import enum
from datetime import datetime  # noqa: TCH003 — Pydantic needs this at runtime

from pydantic import BaseModel, Field

# ── Enums ───────────────────────────────────────────────────────────────────

class JobStatus(enum.StrEnum):
    QUEUED = "queued"
    PROCESSING = "processing"
    STREAMING = "streaming"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TTSMode(enum.StrEnum):
    CUSTOM_VOICE = "custom_voice"
    VOICE_DESIGN = "voice_design"
    VOICE_CLONE = "voice_clone"
    VOICE_DESIGN_CLONE = "voice_design_clone"


# ── TTS Requests ────────────────────────────────────────────────────────────

class CustomVoiceRequest(BaseModel):
    """Generate speech with a preset speaker voice."""
    text: str = Field(..., min_length=1, max_length=10_000, description="Text to synthesize.")
    language: str = Field(
        "Auto",
        description="Target language. Use 'Auto' for auto-detection.",
        examples=["Chinese", "English", "Japanese", "Auto"],
    )
    speaker: str = Field(
        ..., min_length=1, description="Preset speaker name (e.g. 'Vivian', 'Ryan').",
    )
    instruct: str | None = Field(
        None,
        max_length=2000,
        description="Optional instruction for tone/emotion (e.g. 'Speak angrily').",
    )


class VoiceDesignRequest(BaseModel):
    """Generate speech with a natural-language voice description."""
    text: str = Field(..., min_length=1, max_length=10_000, description="Text to synthesize.")
    language: str = Field(
        "Auto",
        description="Target language.",
        examples=["Chinese", "English"],
    )
    instruct: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Natural-language description of the target voice.",
    )


class VoiceCloneRequest(BaseModel):
    """Clone a voice from reference audio and synthesize new text.

    The audio file is sent as multipart form data alongside this JSON body.
    """
    text: str = Field(..., min_length=1, max_length=10_000, description="Text to synthesize.")
    language: str = Field("Auto", description="Target language.")
    ref_text: str | None = Field(
        None,
        max_length=5000,
        description="Transcript of the reference audio. Improves quality when provided.",
    )
    x_vector_only_mode: bool = Field(
        False,
        description="If true, only speaker embedding is extracted (ref_text not needed).",
    )
    instruct: str | None = Field(
        None,
        max_length=2000,
        description="Optional style instruction (e.g., 'speak cheerfully').",
    )
    consent_acknowledged: bool = Field(
        True,
        description="Must be true. Confirms the caller has consent to clone this voice.",
    )


class VoiceDesignCloneRequest(BaseModel):
    """Design a voice via NL description, then clone it for multiple texts."""
    design_text: str = Field(
        ..., min_length=1, max_length=10_000,
        description="Reference text for the designed voice.",
    )
    design_language: str = Field("Auto", description="Language for the design reference.")
    design_instruct: str = Field(
        ..., min_length=1, max_length=2000,
        description="NL description of the target voice persona.",
    )
    clone_texts: list[str] = Field(
        ..., min_length=1, max_length=20,
        description="Texts to synthesize with the designed voice.",
    )
    clone_languages: list[str] = Field(
        ..., min_length=1, max_length=20,
        description="Language for each clone text (parallel with clone_texts).",
    )


# ── Tokenizer Requests ─────────────────────────────────────────────────────

class TokenizerDecodeRequest(BaseModel):
    """Decode token IDs back into audio."""
    tokens: list[int] = Field(..., min_length=1, description="Token IDs to decode.")


# ── WebSocket ───────────────────────────────────────────────────────────────

class WSRequest(BaseModel):
    """Incoming WebSocket message to start a TTS job."""
    mode: TTSMode
    # Fields from the individual request types are spread in:
    text: str = Field(..., min_length=1, max_length=10_000)
    language: str = "Auto"
    speaker: str | None = None
    instruct: str | None = None
    ref_text: str | None = None
    x_vector_only_mode: bool = False
    consent_acknowledged: bool = False
    # Voice-design-clone specifics
    design_text: str | None = None
    design_language: str | None = None
    design_instruct: str | None = None
    clone_texts: list[str] | None = None
    clone_languages: list[str] | None = None


class WSMessage(BaseModel):
    """Outgoing WebSocket control message."""
    type: str = Field(..., description="'status' | 'done' | 'error'")
    status: str | None = None
    job_id: str | None = None
    error: str | None = None
    detail: str | None = None


# ── Responses ───────────────────────────────────────────────────────────────

class TTSJobResponse(BaseModel):
    """Returned immediately when a TTS job is created."""
    job_id: str
    status: JobStatus = JobStatus.QUEUED
    created_at: datetime


class JobStatusResponse(BaseModel):
    """Returned when polling job status."""
    job_id: str
    status: JobStatus
    progress: float | None = Field(None, ge=0, le=1, description="0.0–1.0 if known.")
    error: str | None = None
    audio_url: str | None = Field(None, description="Relative path to download result.")
    created_at: datetime
    updated_at: datetime


class SpeakerInfo(BaseModel):
    name: str
    languages: list[str]
    description: str


class LanguageInfo(BaseModel):
    code: str
    name: str


class ModelInfo(BaseModel):
    name: str
    variant: str
    loaded: bool
    description: str


class HealthResponse(BaseModel):
    status: str
    version: str
    mock_mode: bool
    gpu_available: bool
    models_loaded: list[str]


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
    request_id: str | None = None
