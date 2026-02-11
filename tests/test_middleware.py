"""Tests for middleware — request ID propagation."""

import pytest


@pytest.mark.asyncio
async def test_request_id_in_response(client):
    resp = await client.get("/api/v1/health")
    assert "x-request-id" in resp.headers
    assert len(resp.headers["x-request-id"]) > 0


@pytest.mark.asyncio
async def test_custom_request_id_echoed(client):
    custom_id = "test-request-123"
    resp = await client.get(
        "/api/v1/health",
        headers={"X-Request-ID": custom_id},
    )
    assert resp.headers["x-request-id"] == custom_id
