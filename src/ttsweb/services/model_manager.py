"""Model manager — lazy-loads Qwen3-TTS models with concurrency control.

In mock mode (no GPU or TTSWEB_MOCK_MODE=true), returns synthetic audio data
so the rest of the stack can be developed/tested without hardware.
"""

from __future__ import annotations

import asyncio
import logging
import math
import struct
from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    from ttsweb.config import Settings
    pass

logger = logging.getLogger("ttsweb.model_manager")

# Default sample rate matching Qwen3-TTS output
SAMPLE_RATE = 24_000


def _detect_gpu() -> bool:
    """Return True if a CUDA GPU is available."""
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        return False


def _generate_mock_wav(duration_s: float = 1.5, sample_rate: int = SAMPLE_RATE) -> bytes:
    """Generate a short sine-wave WAV for mock mode.

    Creates a pleasant two-tone chime so the frontend can verify playback.
    """
    num_samples = int(sample_rate * duration_s)
    t = np.linspace(0, duration_s, num_samples, dtype=np.float32)

    # Two-tone chime: 440 Hz + 554 Hz (A4 + C#5), with fade-out envelope
    envelope = np.exp(-2.0 * t)
    wave = 0.3 * envelope * (
        np.sin(2 * math.pi * 440 * t) + 0.6 * np.sin(2 * math.pi * 554 * t)
    )
    wave = np.clip(wave, -1.0, 1.0)

    # Convert to 16-bit PCM
    pcm = (wave * 32767).astype(np.int16)
    pcm_bytes = pcm.tobytes()

    # Build WAV header
    data_size = len(pcm_bytes)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + data_size,
        b"WAVE",
        b"fmt ",
        16,          # chunk size
        1,           # PCM format
        1,           # mono
        sample_rate,
        sample_rate * 2,  # byte rate
        2,           # block align
        16,          # bits per sample
        b"data",
        data_size,
    )
    return header + pcm_bytes


class ModelManager:
    """Manages Qwen3-TTS model lifecycle and concurrent access."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._mock_mode = settings.mock_mode or not _detect_gpu()
        self._semaphore = asyncio.Semaphore(settings.max_concurrent_jobs)

        # Real model instances (populated lazily)
        self._custom_voice_model = None
        self._voice_design_model = None
        self._base_model = None
        self._tokenizer = None

        # Track which models are loaded
        self._loaded: set[str] = set()

        if self._mock_mode:
            logger.warning("Running in MOCK mode — no real models loaded")
        else:
            logger.info("GPU detected — real model inference enabled")

    @property
    def mock_mode(self) -> bool:
        return self._mock_mode

    @property
    def gpu_available(self) -> bool:
        return not self._mock_mode or _detect_gpu()

    @property
    def loaded_models(self) -> list[str]:
        if self._mock_mode:
            return ["mock"]
        return sorted(self._loaded)

    # ── Lazy Loading ────────────────────────────────────────────────────

    def _load_custom_voice(self):
        """Load the CustomVoice model."""
        import torch
        from qwen_tts import Qwen3TTSModel

        logger.info("Loading CustomVoice model: %s", self._settings.model_custom_voice)
        self._custom_voice_model = Qwen3TTSModel.from_pretrained(
            self._settings.model_custom_voice,
            device_map="cuda:0",
            dtype=torch.bfloat16,
            attn_implementation="flash_attention_2",
        )
        self._loaded.add("custom_voice")
        logger.info("CustomVoice model loaded")

    def _load_voice_design(self):
        """Load the VoiceDesign model."""
        import torch
        from qwen_tts import Qwen3TTSModel

        logger.info("Loading VoiceDesign model: %s", self._settings.model_voice_design)
        self._voice_design_model = Qwen3TTSModel.from_pretrained(
            self._settings.model_voice_design,
            device_map="cuda:0",
            dtype=torch.bfloat16,
            attn_implementation="flash_attention_2",
        )
        self._loaded.add("voice_design")
        logger.info("VoiceDesign model loaded")

    def _load_base(self):
        """Load the Base model (for voice clone)."""
        import torch
        from qwen_tts import Qwen3TTSModel

        logger.info("Loading Base model: %s", self._settings.model_base)
        self._base_model = Qwen3TTSModel.from_pretrained(
            self._settings.model_base,
            device_map="cuda:0",
            dtype=torch.bfloat16,
            attn_implementation="flash_attention_2",
        )
        self._loaded.add("base")
        logger.info("Base model loaded")

    def _load_tokenizer(self):
        """Load the speech tokenizer."""
        from qwen_tts import Qwen3TTSTokenizer

        logger.info("Loading tokenizer: %s", self._settings.model_tokenizer)
        self._tokenizer = Qwen3TTSTokenizer.from_pretrained(
            self._settings.model_tokenizer,
            device_map="cuda:0",
        )
        self._loaded.add("tokenizer")
        logger.info("Tokenizer loaded")

    # ── Accessors ───────────────────────────────────────────────────────

    def get_custom_voice_model(self):
        if self._mock_mode:
            return None
        if self._custom_voice_model is None:
            self._load_custom_voice()
        return self._custom_voice_model

    def get_voice_design_model(self):
        if self._mock_mode:
            return None
        if self._voice_design_model is None:
            self._load_voice_design()
        return self._voice_design_model

    def get_base_model(self):
        if self._mock_mode:
            return None
        if self._base_model is None:
            self._load_base()
        return self._base_model

    def get_tokenizer(self):
        if self._mock_mode:
            return None
        if self._tokenizer is None:
            self._load_tokenizer()
        return self._tokenizer

    # ── Concurrency Gate ────────────────────────────────────────────────

    async def acquire(self) -> None:
        """Acquire a slot for model inference."""
        await self._semaphore.acquire()

    def release(self) -> None:
        """Release an inference slot."""
        self._semaphore.release()

    # ── Mock Data ───────────────────────────────────────────────────────

    def generate_mock_audio(self, duration_s: float = 1.5) -> tuple[bytes, int]:
        """Return (wav_bytes, sample_rate) of synthetic audio."""
        return _generate_mock_wav(duration_s, SAMPLE_RATE), SAMPLE_RATE
