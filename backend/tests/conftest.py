"""Shared test fixtures."""

from __future__ import annotations

import os

# Force mock mode for all tests
os.environ["TTSWEB_MOCK_MODE"] = "true"

import pytest
from httpx import ASGITransport, AsyncClient

from ttsweb.config import get_settings
from ttsweb.main import create_app
from ttsweb.services.job_manager import JobManager
from ttsweb.services.model_manager import ModelManager
from ttsweb.services.tokenizer_service import TokenizerService
from ttsweb.services.tts_service import TTSService


@pytest.fixture
def app():
    """Create a fresh app instance with state manually initialized.

    httpx's AsyncClient doesn't trigger FastAPI lifespan, so we
    populate app.state directly with the same services as the real app.
    """
    application = create_app()
    settings = get_settings()
    model_manager = ModelManager(settings)
    job_manager = JobManager(ttl_seconds=settings.job_ttl_seconds)
    tts_service = TTSService(model_manager, job_manager)
    tokenizer_service = TokenizerService(model_manager)

    application.state.settings = settings
    application.state.model_manager = model_manager
    application.state.job_manager = job_manager
    application.state.tts_service = tts_service
    application.state.tokenizer_service = tokenizer_service

    return application


@pytest.fixture
async def client(app):
    """Async HTTP client that talks to the test app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
