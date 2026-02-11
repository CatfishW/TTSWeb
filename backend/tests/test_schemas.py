"""Tests for Pydantic schemas — validation, defaults, edge cases."""

import pytest
from pydantic import ValidationError

from ttsweb.schemas import (
    CustomVoiceRequest,
    TokenizerDecodeRequest,
    TTSMode,
    VoiceCloneRequest,
    VoiceDesignCloneRequest,
    VoiceDesignRequest,
    WSRequest,
)


class TestCustomVoiceRequest:
    def test_valid_minimal(self):
        req = CustomVoiceRequest(text="Hello", speaker="Ryan")
        assert req.language == "Auto"
        assert req.instruct is None

    def test_valid_full(self):
        req = CustomVoiceRequest(
            text="Hello", language="English", speaker="Ryan", instruct="Speak angrily"
        )
        assert req.instruct == "Speak angrily"

    def test_empty_text_rejected(self):
        with pytest.raises(ValidationError):
            CustomVoiceRequest(text="", speaker="Ryan")

    def test_missing_speaker_rejected(self):
        with pytest.raises(ValidationError):
            CustomVoiceRequest(text="Hello")


class TestVoiceDesignRequest:
    def test_valid(self):
        req = VoiceDesignRequest(text="Hello", instruct="Young female voice")
        assert req.language == "Auto"

    def test_missing_instruct_rejected(self):
        with pytest.raises(ValidationError):
            VoiceDesignRequest(text="Hello")


class TestVoiceCloneRequest:
    def test_valid_with_consent(self):
        req = VoiceCloneRequest(
            text="Hello", consent_acknowledged=True
        )
        assert req.x_vector_only_mode is False

    def test_missing_consent_rejected(self):
        with pytest.raises(ValidationError):
            VoiceCloneRequest(text="Hello")


class TestVoiceDesignCloneRequest:
    def test_valid(self):
        req = VoiceDesignCloneRequest(
            design_text="Ref text",
            design_instruct="Male baritone",
            clone_texts=["A", "B"],
            clone_languages=["English", "English"],
        )
        assert req.design_language == "Auto"

    def test_empty_clone_texts_rejected(self):
        with pytest.raises(ValidationError):
            VoiceDesignCloneRequest(
                design_text="Ref",
                design_instruct="Voice",
                clone_texts=[],
                clone_languages=[],
            )


class TestTokenizerDecodeRequest:
    def test_valid(self):
        req = TokenizerDecodeRequest(tokens=[1, 2, 3])
        assert len(req.tokens) == 3

    def test_empty_tokens_rejected(self):
        with pytest.raises(ValidationError):
            TokenizerDecodeRequest(tokens=[])


class TestWSRequest:
    def test_custom_voice_mode(self):
        req = WSRequest(mode=TTSMode.CUSTOM_VOICE, text="Hello", speaker="Ryan")
        assert req.mode == TTSMode.CUSTOM_VOICE
