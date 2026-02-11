"""Tests for the job manager."""


from ttsweb.schemas import JobStatus
from ttsweb.services.job_manager import JobManager


class TestJobManager:
    def test_create_job(self):
        jm = JobManager()
        job = jm.create_job()
        assert job.status == JobStatus.QUEUED
        assert job.job_id

    def test_get_job(self):
        jm = JobManager()
        job = jm.create_job()
        found = jm.get_job(job.job_id)
        assert found is not None
        assert found.job_id == job.job_id

    def test_get_missing_job(self):
        jm = JobManager()
        assert jm.get_job("nonexistent") is None

    def test_update_job(self):
        jm = JobManager()
        job = jm.create_job()
        jm.update_job(job.job_id, status=JobStatus.PROCESSING, progress=0.5)
        updated = jm.get_job(job.job_id)
        assert updated.status == JobStatus.PROCESSING
        assert updated.progress == 0.5

    def test_cancel_job(self):
        jm = JobManager()
        job = jm.create_job()
        result = jm.cancel_job(job.job_id)
        assert result is True
        assert jm.get_job(job.job_id).status == JobStatus.CANCELLED

    def test_cancel_completed_job_fails(self):
        jm = JobManager()
        job = jm.create_job()
        jm.update_job(job.job_id, status=JobStatus.COMPLETED)
        result = jm.cancel_job(job.job_id)
        assert result is False

    def test_cancel_nonexistent_job(self):
        jm = JobManager()
        assert jm.cancel_job("nope") is False

    def test_is_cancelled(self):
        jm = JobManager()
        job = jm.create_job()
        assert jm.is_cancelled(job.job_id) is False
        jm.cancel_job(job.job_id)
        assert jm.is_cancelled(job.job_id) is True
