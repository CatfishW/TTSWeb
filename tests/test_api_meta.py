"""Tests for metadata and health endpoints."""

import pytest


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert data["mock_mode"] is True


@pytest.mark.asyncio
async def test_ready(client):
    resp = await client.get("/api/v1/ready")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ready"


@pytest.mark.asyncio
async def test_speakers(client):
    resp = await client.get("/api/v1/speakers")
    assert resp.status_code == 200
    speakers = resp.json()
    assert isinstance(speakers, list)
    assert len(speakers) > 0
    assert "name" in speakers[0]
    assert "languages" in speakers[0]


@pytest.mark.asyncio
async def test_languages(client):
    resp = await client.get("/api/v1/languages")
    assert resp.status_code == 200
    langs = resp.json()
    assert isinstance(langs, list)
    assert len(langs) == 10  # 10 supported languages
    codes = [lang["code"] for lang in langs]
    assert "en" in codes
    assert "zh" in codes


@pytest.mark.asyncio
async def test_models(client):
    resp = await client.get("/api/v1/models")
    assert resp.status_code == 200
    models = resp.json()
    assert isinstance(models, list)
    assert len(models) == 4
    variants = {m["variant"] for m in models}
    assert variants == {"custom_voice", "voice_design", "base", "tokenizer"}
