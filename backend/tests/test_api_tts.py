"""Tests for TTS API endpoints."""

import pytest


@pytest.mark.asyncio
async def test_custom_voice_returns_202(client):
    resp = await client.post(
        "/api/v1/tts/custom-voice",
        json={"text": "Hello world", "speaker": "Ryan", "language": "English"},
    )
    assert resp.status_code == 202
    data = resp.json()
    assert "job_id" in data
    assert data["status"] == "queued"


@pytest.mark.asyncio
async def test_custom_voice_missing_speaker_returns_422(client):
    resp = await client.post(
        "/api/v1/tts/custom-voice",
        json={"text": "Hello"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_voice_design_returns_202(client):
    resp = await client.post(
        "/api/v1/tts/voice-design",
        json={
            "text": "Quick test",
            "language": "English",
            "instruct": "Young female, cheerful",
        },
    )
    assert resp.status_code == 202


@pytest.mark.asyncio
async def test_voice_clone_requires_consent(client):
    resp = await client.post(
        "/api/v1/tts/voice-clone",
        data={
            "text": "Clone test",
            "language": "English",
            "consent_acknowledged": "false",
        },
        files={"audio": ("test.wav", b"fake audio data", "audio/wav")},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_voice_clone_with_consent_returns_202(client):
    resp = await client.post(
        "/api/v1/tts/voice-clone",
        data={
            "text": "Clone test",
            "language": "English",
            "consent_acknowledged": "true",
        },
        files={"audio": ("test.wav", b"fake audio data", "audio/wav")},
    )
    assert resp.status_code == 202


@pytest.mark.asyncio
async def test_voice_design_clone_returns_202(client):
    resp = await client.post(
        "/api/v1/tts/voice-design-clone",
        json={
            "design_text": "Reference text.",
            "design_language": "English",
            "design_instruct": "Male baritone",
            "clone_texts": ["Text A", "Text B"],
            "clone_languages": ["English", "English"],
        },
    )
    assert resp.status_code == 202


@pytest.mark.asyncio
async def test_voice_design_clone_mismatched_lengths(client):
    resp = await client.post(
        "/api/v1/tts/voice-design-clone",
        json={
            "design_text": "Ref.",
            "design_instruct": "Voice",
            "clone_texts": ["A", "B"],
            "clone_languages": ["English"],  # mismatched
        },
    )
    assert resp.status_code == 400
