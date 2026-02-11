"""Tests for job management endpoints."""

import asyncio

import pytest


@pytest.mark.asyncio
async def test_job_status_after_creation(client):
    # Create a job via custom voice
    resp = await client.post(
        "/api/v1/tts/custom-voice",
        json={"text": "Test", "speaker": "Ryan"},
    )
    job_id = resp.json()["job_id"]

    # Wait briefly for the mock job to complete
    await asyncio.sleep(0.5)

    # Poll status
    resp = await client.get(f"/api/v1/jobs/{job_id}/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"] == job_id
    assert data["status"] in ("queued", "processing", "completed")


@pytest.mark.asyncio
async def test_job_result_download(client):
    # Create and wait for completion
    resp = await client.post(
        "/api/v1/tts/custom-voice",
        json={"text": "Download test", "speaker": "Vivian"},
    )
    job_id = resp.json()["job_id"]

    # Wait for completion
    for _ in range(20):
        await asyncio.sleep(0.3)
        status_resp = await client.get(f"/api/v1/jobs/{job_id}/status")
        if status_resp.json()["status"] == "completed":
            break

    # Download result
    resp = await client.get(f"/api/v1/jobs/{job_id}/result")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "audio/wav"
    assert len(resp.content) > 0
    # Verify WAV header
    assert resp.content[:4] == b"RIFF"


@pytest.mark.asyncio
async def test_job_not_found(client):
    resp = await client.get("/api/v1/jobs/nonexistent-id/status")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cancel_job(client):
    resp = await client.post(
        "/api/v1/tts/custom-voice",
        json={"text": "Cancel test", "speaker": "Ryan"},
    )
    job_id = resp.json()["job_id"]

    # Attempt cancel (may or may not succeed depending on timing)
    resp = await client.post(f"/api/v1/jobs/{job_id}/cancel")
    assert resp.status_code in (200, 409)  # 409 if already completed
