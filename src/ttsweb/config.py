"""Application configuration via environment variables."""

from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """All configuration is sourced from environment variables prefixed with TTSWEB_."""

    model_config = {"env_prefix": "TTSWEB_"}

    # ── Server ──────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8100

    # ── CORS ────────────────────────────────────────────
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # ── Model paths / HF IDs ───────────────────────────
    model_custom_voice: str = "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"
    model_voice_design: str = "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
    model_base: str = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"
    model_tokenizer: str = "Qwen/Qwen3-TTS-Tokenizer-12Hz"

    # ── Runtime ─────────────────────────────────────────
    mock_mode: bool = False
    max_concurrent_jobs: int = 4
    max_text_length: int = 10_000
    max_audio_upload_mb: int = 25
    job_ttl_seconds: int = 3600

    # ── Logging ─────────────────────────────────────────
    log_level: str = "info"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_audio_upload_bytes(self) -> int:
        return self.max_audio_upload_mb * 1024 * 1024


def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
