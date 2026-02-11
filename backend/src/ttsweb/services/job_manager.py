"""In-memory job manager with status tracking and auto-cleanup."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from ttsweb.schemas import JobStatus

logger = logging.getLogger("ttsweb.job_manager")


@dataclass
class JobState:
    """Internal state for a single TTS job."""

    job_id: str
    status: JobStatus = JobStatus.QUEUED
    progress: float | None = None
    error: str | None = None
    result_audio: bytes | None = None
    sample_rate: int = 24_000
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    cancelled: bool = False
    _task: asyncio.Task[Any] | None = field(default=None, repr=False)


class JobManager:
    """Track and manage TTS generation jobs."""

    def __init__(self, ttl_seconds: int = 3600) -> None:
        self._jobs: dict[str, JobState] = {}
        self._ttl_seconds = ttl_seconds
        self._cleanup_task: asyncio.Task[Any] | None = None

    def start_cleanup_loop(self) -> None:
        """Start the background cleanup loop."""
        self._cleanup_task = asyncio.create_task(self._cleanup_expired())

    async def stop(self) -> None:
        """Stop cleanup and cancel all pending jobs."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._cleanup_task

    # ── Job lifecycle ───────────────────────────────────────────────────

    def create_job(self) -> JobState:
        """Create a new job and return its state."""
        job_id = str(uuid.uuid4())
        job = JobState(job_id=job_id)
        self._jobs[job_id] = job
        logger.info("Job created", extra={"job_id": job_id})
        return job

    def get_job(self, job_id: str) -> JobState | None:
        return self._jobs.get(job_id)

    def update_job(
        self,
        job_id: str,
        *,
        status: JobStatus | None = None,
        progress: float | None = None,
        error: str | None = None,
        result_audio: bytes | None = None,
        sample_rate: int | None = None,
    ) -> None:
        """Update job state fields."""
        job = self._jobs.get(job_id)
        if not job:
            logger.warning("Tried to update non-existent job %s", job_id)
            return

        if status is not None:
            job.status = status
        if progress is not None:
            job.progress = progress
        if error is not None:
            job.error = error
        if result_audio is not None:
            job.result_audio = result_audio
        if sample_rate is not None:
            job.sample_rate = sample_rate
        job.updated_at = datetime.now(UTC)

    def cancel_job(self, job_id: str) -> bool:
        """Request cancellation for a job. Returns True if the job was found."""
        job = self._jobs.get(job_id)
        if not job:
            return False

        if job.status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED):
            return False

        job.cancelled = True
        job.status = JobStatus.CANCELLED
        job.updated_at = datetime.now(UTC)

        if job._task and not job._task.done():
            job._task.cancel()

        logger.info("Job cancelled", extra={"job_id": job_id})
        return True

    def set_task(self, job_id: str, task: asyncio.Task[Any]) -> None:
        """Associate an asyncio.Task with a job for cancellation support."""
        job = self._jobs.get(job_id)
        if job:
            job._task = task

    def is_cancelled(self, job_id: str) -> bool:
        """Check if a job has been cancelled."""
        job = self._jobs.get(job_id)
        return job.cancelled if job else False

    # ── Cleanup ─────────────────────────────────────────────────────────

    async def _cleanup_expired(self) -> None:
        """Periodically remove completed/failed jobs older than TTL."""
        terminal = {JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED}
        while True:
            try:
                await asyncio.sleep(60)
                now = time.time()
                to_remove = []
                for job_id, job in self._jobs.items():
                    if job.status in terminal:
                        age = now - job.updated_at.timestamp()
                        if age > self._ttl_seconds:
                            to_remove.append(job_id)

                for job_id in to_remove:
                    del self._jobs[job_id]
                    logger.debug("Cleaned up expired job %s", job_id)

                if to_remove:
                    logger.info("Cleaned up %d expired jobs", len(to_remove))

            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("Error in job cleanup loop")
