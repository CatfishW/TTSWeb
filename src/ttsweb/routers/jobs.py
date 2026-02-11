"""Job management endpoints — status polling, cancellation, result download."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response

from ttsweb.schemas import JobStatus, JobStatusResponse

logger = logging.getLogger("ttsweb.routers.jobs")

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get(
    "/{job_id}/status",
    response_model=JobStatusResponse,
    summary="Get job status",
    description="Poll for the current status, progress, and result availability of a TTS job.",
)
async def get_job_status(job_id: str, request: Request):
    job_manager = request.app.state.job_manager
    job = job_manager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    audio_url = f"/api/v1/jobs/{job_id}/result" if job.status == JobStatus.COMPLETED else None

    return JobStatusResponse(
        job_id=job.job_id,
        status=job.status,
        progress=job.progress,
        error=job.error,
        audio_url=audio_url,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.post(
    "/{job_id}/cancel",
    summary="Cancel a running job",
    description="Request cancellation of a queued or processing job.",
)
async def cancel_job(job_id: str, request: Request):
    job_manager = request.app.state.job_manager

    success = job_manager.cancel_job(job_id)
    if not success:
        job = job_manager.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        raise HTTPException(
            status_code=409,
            detail=f"Job {job_id} is already in terminal state: {job.status.value}",
        )

    return {"job_id": job_id, "status": "cancelled"}


@router.get(
    "/{job_id}/result",
    summary="Download completed audio",
    description="Download the generated WAV file for a completed job.",
    response_class=Response,
)
async def get_job_result(job_id: str, request: Request):
    job_manager = request.app.state.job_manager
    job = job_manager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    if job.status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=409,
            detail=f"Job {job_id} is not completed (status: {job.status.value})",
        )

    if not job.result_audio:
        raise HTTPException(status_code=500, detail="Job completed but audio data is missing")

    return Response(
        content=job.result_audio,
        media_type="audio/wav",
        headers={
            "Content-Disposition": f"attachment; filename={job_id}.wav",
            "X-Sample-Rate": str(job.sample_rate),
        },
    )
