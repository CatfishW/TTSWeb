"""FastAPI application factory and lifespan management."""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ttsweb import __version__
from ttsweb.config import get_settings
from ttsweb.middleware import LoggingMiddleware, RequestIDMiddleware, global_exception_handler
from ttsweb.routers import health, jobs, meta, tokenizer, tts, ws
from ttsweb.services.job_manager import JobManager
from ttsweb.services.model_manager import ModelManager
from ttsweb.services.tokenizer_service import TokenizerService
from ttsweb.services.tts_service import TTSService


def _setup_logging(level: str) -> None:
    """Configure structured JSON-style logging."""
    fmt = (
        '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s",'
        '"message":"%(message)s"}'
    )
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format=fmt,
        stream=sys.stdout,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger = logging.getLogger("ttsweb")
    settings = get_settings()

    _setup_logging(settings.log_level)
    logger.info("Starting TTSWeb v%s", __version__)

    # Initialize services
    model_manager = ModelManager(settings)
    job_manager = JobManager(ttl_seconds=settings.job_ttl_seconds)
    tts_service = TTSService(model_manager, job_manager)
    tokenizer_service = TokenizerService(model_manager)

    # Store on app state for router access
    app.state.settings = settings
    app.state.model_manager = model_manager
    app.state.job_manager = job_manager
    app.state.tts_service = tts_service
    app.state.tokenizer_service = tokenizer_service

    # Start background cleanup
    job_manager.start_cleanup_loop()

    logger.info(
        "TTSWeb ready (mock_mode=%s, max_concurrent=%d)",
        model_manager.mock_mode,
        settings.max_concurrent_jobs,
    )

    yield

    # Shutdown
    logger.info("Shutting down TTSWeb")
    await job_manager.stop()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="TTSWeb API",
        description=(
            "Backend service for TTSWeb — exposes Qwen3-TTS capabilities "
            "via REST and WebSocket APIs."
        ),
        version=__version__,
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # ── Middleware (order matters: outermost first) ──────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(LoggingMiddleware)

    # ── Exception handler ───────────────────────────────────────────────
    app.add_exception_handler(Exception, global_exception_handler)

    # ── API v1 routers ──────────────────────────────────────────────────
    api_prefix = "/api/v1"
    app.include_router(tts.router, prefix=api_prefix)
    app.include_router(tokenizer.router, prefix=api_prefix)
    app.include_router(jobs.router, prefix=api_prefix)
    app.include_router(meta.router, prefix=api_prefix)
    app.include_router(health.router, prefix=api_prefix)

    # WebSocket (also under API v1)
    app.include_router(ws.router, prefix=api_prefix)

    return app


# Module-level app instance for `uvicorn ttsweb.main:app`
app = create_app()
