"""TTS generation endpoints — all four modes."""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from ttsweb.schemas import (
    CustomVoiceRequest,
    TTSJobResponse,
    VoiceCloneRequest,
    VoiceDesignCloneRequest,
    VoiceDesignRequest,
)

logger = logging.getLogger("ttsweb.routers.tts")

router = APIRouter(prefix="/tts", tags=["TTS Generation"])


def _get_services(request: Request):
    return request.app.state.tts_service, request.app.state.job_manager


# ── Custom Voice ────────────────────────────────────────────────────────────

@router.post(
    "/custom-voice",
    response_model=TTSJobResponse,
    status_code=202,
    summary="Synthesize speech with a preset speaker",
    description=(
        "Submit text to be spoken by a preset speaker voice. "
        "Returns immediately with a job ID; poll /jobs/{id}/status for results."
    ),
)
async def create_custom_voice(req: CustomVoiceRequest, request: Request):
    tts_service, job_manager = _get_services(request)
    settings = request.app.state.settings

    if len(req.text) > settings.max_text_length:
        raise HTTPException(
            status_code=400,
            detail=f"Text exceeds {settings.max_text_length} character limit",
        )

    job = job_manager.create_job()
    task = asyncio.create_task(tts_service.generate_custom_voice(job.job_id, req))
    job_manager.set_task(job.job_id, task)

    return TTSJobResponse(job_id=job.job_id, status=job.status, created_at=job.created_at)


# ── Voice Design ────────────────────────────────────────────────────────────

@router.post(
    "/voice-design",
    response_model=TTSJobResponse,
    status_code=202,
    summary="Synthesize speech with a natural-language voice description",
    description=(
        "Describe the target voice in natural language (age, gender, emotion, style) "
        "and submit text to synthesize."
    ),
)
async def create_voice_design(req: VoiceDesignRequest, request: Request):
    tts_service, job_manager = _get_services(request)
    settings = request.app.state.settings

    if len(req.text) > settings.max_text_length:
        raise HTTPException(
            status_code=400,
            detail=f"Text exceeds {settings.max_text_length} character limit",
        )

    job = job_manager.create_job()
    task = asyncio.create_task(tts_service.generate_voice_design(job.job_id, req))
    job_manager.set_task(job.job_id, task)

    return TTSJobResponse(job_id=job.job_id, status=job.status, created_at=job.created_at)


# ── Voice Clone ─────────────────────────────────────────────────────────────

@router.post(
    "/voice-clone",
    response_model=TTSJobResponse,
    status_code=202,
    summary="Clone a voice from reference audio",
    description=(
        "Upload a reference audio clip and provide text to synthesize in the cloned voice. "
        "Requires consent_acknowledged=true."
    ),
)
async def create_voice_clone(
    request: Request,
    audio: UploadFile = File(  # noqa: B008
        ..., description="Reference audio file (WAV, MP3, FLAC)",
    ),
    text: str = Form(..., min_length=1, max_length=10_000),
    language: str = Form("Auto"),
    ref_text: str | None = Form(None, max_length=5000),
    x_vector_only_mode: bool = Form(False),
    consent_acknowledged: bool = Form(True),
    instruct: str | None = Form(None, max_length=2000),
):
    settings = request.app.state.settings
    tts_service = request.app.state.tts_service
    job_manager = request.app.state.job_manager


    if len(text) > settings.max_text_length:
        raise HTTPException(
            status_code=400,
            detail=f"Text exceeds {settings.max_text_length} character limit",
        )

    # Read and validate audio
    audio_bytes = await audio.read()
    if len(audio_bytes) > settings.max_audio_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Audio file exceeds {settings.max_audio_upload_mb}MB limit",
        )
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Audio file is empty")

    req = VoiceCloneRequest(
        text=text,
        language=language,
        ref_text=ref_text,
        x_vector_only_mode=x_vector_only_mode,
        consent_acknowledged=consent_acknowledged,
        instruct=instruct,
    )

    job = job_manager.create_job()
    task = asyncio.create_task(tts_service.generate_voice_clone(job.job_id, req, audio_bytes))
    job_manager.set_task(job.job_id, task)

    return TTSJobResponse(job_id=job.job_id, status=job.status, created_at=job.created_at)


# ── Voice Design → Clone ───────────────────────────────────────────────────

@router.post(
    "/voice-design-clone",
    response_model=TTSJobResponse,
    status_code=202,
    summary="Design a voice, then clone it for multiple texts",
    description=(
        "Two-step composite: (1) design a voice from your NL description, "
        "(2) clone that voice for one or more target texts."
    ),
)
async def create_voice_design_clone(req: VoiceDesignCloneRequest, request: Request):
    tts_service, job_manager = _get_services(request)
    settings = request.app.state.settings

    # Validate all texts
    all_texts = [req.design_text] + req.clone_texts
    for t in all_texts:
        if len(t) > settings.max_text_length:
            raise HTTPException(
            status_code=400,
            detail=f"Text exceeds {settings.max_text_length} character limit",
        )

    if len(req.clone_texts) != len(req.clone_languages):
        raise HTTPException(
            status_code=400,
            detail="clone_texts and clone_languages must have the same length",
        )

    job = job_manager.create_job()
    task = asyncio.create_task(tts_service.generate_voice_design_clone(job.job_id, req))
    job_manager.set_task(job.job_id, task)

    return TTSJobResponse(job_id=job.job_id, status=job.status, created_at=job.created_at)
