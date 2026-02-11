"""Health and readiness endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Request

from ttsweb import __version__
from ttsweb.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Liveness check",
    description="Returns OK if the server is running.",
)
async def health(request: Request):
    mm = request.app.state.model_manager
    return HealthResponse(
        status="ok",
        version=__version__,
        mock_mode=mm.mock_mode,
        gpu_available=mm.gpu_available,
        models_loaded=mm.loaded_models,
    )


@router.get(
    "/ready",
    summary="Readiness check",
    description="Returns 200 when the service is ready to accept requests.",
)
async def ready(request: Request):
    return {"status": "ready"}
