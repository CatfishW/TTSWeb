"""Tokenizer service — encode audio to tokens and decode tokens to audio."""

from __future__ import annotations

import io
import logging
from typing import TYPE_CHECKING

import soundfile as sf

if TYPE_CHECKING:
    from ttsweb.services.model_manager import ModelManager

logger = logging.getLogger("ttsweb.tokenizer_service")


class TokenizerService:
    """Wraps Qwen3-TTS tokenizer encode/decode."""

    def __init__(self, model_manager: ModelManager) -> None:
        self._mm = model_manager

    async def encode(self, audio_bytes: bytes) -> list[int]:
        """Encode audio bytes into token IDs."""
        if self._mm.mock_mode:
            # Return deterministic mock tokens
            return [100, 200, 300, 400, 500, 600, 700, 800]

        import asyncio

        # Write audio to a temp buffer, read with soundfile
        buf = io.BytesIO(audio_bytes)
        data, sr = sf.read(buf, dtype="float32")

        tokenizer = self._mm.get_tokenizer()
        enc = await asyncio.to_thread(tokenizer.encode, (data, sr))
        # enc may be a tensor or list; normalise
        if hasattr(enc, "tolist"):
            return enc.tolist()
        return list(enc)

    async def decode(self, tokens: list[int]) -> tuple[bytes, int]:
        """Decode token IDs back into WAV bytes."""
        if self._mm.mock_mode:
            return self._mm.generate_mock_audio(duration_s=1.0)

        import asyncio

        tokenizer = self._mm.get_tokenizer()
        wavs, sr = await asyncio.to_thread(tokenizer.decode, tokens)

        buf = io.BytesIO()
        sf.write(buf, wavs[0], sr, format="WAV", subtype="PCM_16")
        buf.seek(0)
        return buf.read(), sr
