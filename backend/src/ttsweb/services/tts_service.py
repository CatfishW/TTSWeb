"""High-level TTS service — orchestrates model calls and job updates."""

from __future__ import annotations

import asyncio
import contextlib
import io
import logging
import tempfile
from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np
import soundfile as sf

from ttsweb.schemas import (
    CustomVoiceRequest,
    JobStatus,
    VoiceCloneRequest,
    VoiceDesignCloneRequest,
    VoiceDesignRequest,
)

if TYPE_CHECKING:
    from ttsweb.services.job_manager import JobManager
    from ttsweb.services.model_manager import ModelManager

logger = logging.getLogger("ttsweb.tts_service")


def _numpy_to_wav_bytes(audio: np.ndarray, sample_rate: int) -> bytes:
    """Convert a numpy float32 waveform to WAV bytes."""
    buf = io.BytesIO()
    sf.write(buf, audio, sample_rate, format="WAV", subtype="PCM_16")
    buf.seek(0)
    return buf.read()


class TTSService:
    """Orchestrates TTS generation across all modes."""

    def __init__(self, model_manager: ModelManager, job_manager: JobManager) -> None:
        self._mm = model_manager
        self._jm = job_manager

    # ── Custom Voice ────────────────────────────────────────────────────

    async def generate_custom_voice(self, job_id: str, req: CustomVoiceRequest) -> None:
        """Run custom voice generation in background."""
        await self._mm.acquire()
        try:
            self._jm.update_job(job_id, status=JobStatus.PROCESSING, progress=0.1)

            if self._jm.is_cancelled(job_id):
                return

            if self._mm.mock_mode:
                wav_bytes, sr = self._mm.generate_mock_audio(duration_s=2.0)
            else:
                model = self._mm.get_custom_voice_model()
                kwargs: dict = {
                    "text": req.text,
                    "language": req.language,
                    "speaker": req.speaker,
                }
                if req.instruct:
                    kwargs["instruct"] = req.instruct

                wavs, sr = await asyncio.to_thread(model.generate_custom_voice, **kwargs)
                wav_bytes = _numpy_to_wav_bytes(wavs[0], sr)

            self._jm.update_job(
                job_id,
                status=JobStatus.COMPLETED,
                progress=1.0,
                result_audio=wav_bytes,
                sample_rate=24_000,
            )
            logger.info("Custom voice job completed", extra={"job_id": job_id})

        except asyncio.CancelledError:
            self._jm.update_job(job_id, status=JobStatus.CANCELLED)
        except Exception as e:
            logger.exception("Custom voice job failed", extra={"job_id": job_id})
            self._jm.update_job(job_id, status=JobStatus.FAILED, error=str(e))
        finally:
            self._mm.release()

    # ── Voice Design ────────────────────────────────────────────────────

    async def generate_voice_design(self, job_id: str, req: VoiceDesignRequest) -> None:
        """Run voice design generation in background."""
        await self._mm.acquire()
        try:
            self._jm.update_job(job_id, status=JobStatus.PROCESSING, progress=0.1)

            if self._jm.is_cancelled(job_id):
                return

            if self._mm.mock_mode:
                wav_bytes, sr = self._mm.generate_mock_audio(duration_s=2.0)
            else:
                model = self._mm.get_voice_design_model()
                wavs, sr = await asyncio.to_thread(
                    model.generate_voice_design,
                    text=req.text,
                    language=req.language,
                    instruct=req.instruct,
                )
                wav_bytes = _numpy_to_wav_bytes(wavs[0], sr)

            self._jm.update_job(
                job_id,
                status=JobStatus.COMPLETED,
                progress=1.0,
                result_audio=wav_bytes,
                sample_rate=24_000,
            )
            logger.info("Voice design job completed", extra={"job_id": job_id})

        except asyncio.CancelledError:
            self._jm.update_job(job_id, status=JobStatus.CANCELLED)
        except Exception as e:
            logger.exception("Voice design job failed", extra={"job_id": job_id})
            self._jm.update_job(job_id, status=JobStatus.FAILED, error=str(e))
        finally:
            self._mm.release()

    # ── Voice Clone ─────────────────────────────────────────────────────

    async def generate_voice_clone(
        self, job_id: str, req: VoiceCloneRequest, audio_bytes: bytes
    ) -> None:
        """Run voice clone generation in background."""
        await self._mm.acquire()
        tmp_path: Path | None = None
        try:
            self._jm.update_job(job_id, status=JobStatus.PROCESSING, progress=0.1)

            if self._jm.is_cancelled(job_id):
                return

            if self._mm.mock_mode:
                wav_bytes, sr = self._mm.generate_mock_audio(duration_s=2.5)
            else:
                # Write uploaded audio to a temp file for the model
                with tempfile.NamedTemporaryFile(
                    suffix=".wav", delete=False,
                ) as tmp:
                    tmp.write(audio_bytes)
                    tmp_path = Path(tmp.name)

                model = self._mm.get_base_model()
                kwargs: dict = {
                    "text": req.text,
                    "language": req.language,
                    "ref_audio": str(tmp_path),
                    "x_vector_only_mode": req.x_vector_only_mode,
                }
                if req.ref_text:
                    kwargs["ref_text"] = req.ref_text

                wavs, sr = await asyncio.to_thread(model.generate_voice_clone, **kwargs)
                wav_bytes = _numpy_to_wav_bytes(wavs[0], sr)

            self._jm.update_job(
                job_id,
                status=JobStatus.COMPLETED,
                progress=1.0,
                result_audio=wav_bytes,
                sample_rate=24_000,
            )
            logger.info("Voice clone job completed", extra={"job_id": job_id})

        except asyncio.CancelledError:
            self._jm.update_job(job_id, status=JobStatus.CANCELLED)
        except Exception as e:
            logger.exception("Voice clone job failed", extra={"job_id": job_id})
            self._jm.update_job(job_id, status=JobStatus.FAILED, error=str(e))
        finally:
            self._mm.release()
            # Clean up temp file
            if tmp_path and tmp_path.exists():
                with contextlib.suppress(OSError):
                    tmp_path.unlink()

    # ── Voice Design → Clone ────────────────────────────────────────────

    async def generate_voice_design_clone(
        self, job_id: str, req: VoiceDesignCloneRequest
    ) -> None:
        """Run voice-design-then-clone composite workflow."""
        await self._mm.acquire()
        try:
            self._jm.update_job(job_id, status=JobStatus.PROCESSING, progress=0.1)

            if self._jm.is_cancelled(job_id):
                return

            if self._mm.mock_mode:
                wav_bytes, sr = self._mm.generate_mock_audio(duration_s=3.0)
            else:
                # Step 1: Design the voice
                design_model = self._mm.get_voice_design_model()
                ref_wavs, sr = await asyncio.to_thread(
                    design_model.generate_voice_design,
                    text=req.design_text,
                    language=req.design_language,
                    instruct=req.design_instruct,
                )

                self._jm.update_job(job_id, progress=0.4)

                if self._jm.is_cancelled(job_id):
                    return

                # Step 2: Create clone prompt from designed voice
                clone_model = self._mm.get_base_model()
                voice_clone_prompt = await asyncio.to_thread(
                    clone_model.create_voice_clone_prompt,
                    ref_audio=(ref_wavs[0], sr),
                    ref_text=req.design_text,
                )

                self._jm.update_job(job_id, progress=0.6)

                # Step 3: Clone with the prompt
                wavs, sr = await asyncio.to_thread(
                    clone_model.generate_voice_clone,
                    text=req.clone_texts,
                    language=req.clone_languages,
                    voice_clone_prompt=voice_clone_prompt,
                )

                # Concatenate all outputs into a single WAV
                combined = np.concatenate(wavs, axis=0)
                wav_bytes = _numpy_to_wav_bytes(combined, sr)

            self._jm.update_job(
                job_id,
                status=JobStatus.COMPLETED,
                progress=1.0,
                result_audio=wav_bytes,
                sample_rate=24_000,
            )
            logger.info("Voice design-clone job completed", extra={"job_id": job_id})

        except asyncio.CancelledError:
            self._jm.update_job(job_id, status=JobStatus.CANCELLED)
        except Exception as e:
            logger.exception("Voice design-clone job failed", extra={"job_id": job_id})
            self._jm.update_job(job_id, status=JobStatus.FAILED, error=str(e))
        finally:
            self._mm.release()
