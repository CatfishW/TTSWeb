"""Tokenizer endpoints — encode audio to tokens, decode tokens to audio."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import Response

if TYPE_CHECKING:
    from ttsweb.schemas import TokenizerDecodeRequest

logger = logging.getLogger("ttsweb.routers.tokenizer")

router = APIRouter(prefix="/tokenizer", tags=["Tokenizer"])


@router.post(
    "/encode",
    summary="Encode audio to token IDs",
    description="Upload an audio file and receive its token representation.",
)
async def encode_audio(
    request: Request,
    audio: UploadFile = File(  # noqa: B008
        ..., description="Audio file to encode (WAV, MP3, FLAC)",
    ),
):
    settings = request.app.state.settings
    tokenizer_service = request.app.state.tokenizer_service

    audio_bytes = await audio.read()
    if len(audio_bytes) > settings.max_audio_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Audio file exceeds {settings.max_audio_upload_mb}MB limit",
        )
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Audio file is empty")

    tokens = await tokenizer_service.encode(audio_bytes)
    return {"tokens": tokens, "count": len(tokens)}


@router.post(
    "/decode",
    summary="Decode token IDs to audio",
    description="Send token IDs and receive the reconstructed audio as a WAV file.",
    response_class=Response,
)
async def decode_tokens(req: TokenizerDecodeRequest, request: Request):
    tokenizer_service = request.app.state.tokenizer_service

    wav_bytes, sr = await tokenizer_service.decode(req.tokens)
    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={
            "Content-Disposition": "attachment; filename=decoded.wav",
            "X-Sample-Rate": str(sr),
        },
    )
