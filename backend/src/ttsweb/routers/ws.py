"""WebSocket endpoint for streaming TTS audio delivery."""

from __future__ import annotations

import asyncio
import contextlib
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ttsweb.schemas import (
    CustomVoiceRequest,
    JobStatus,
    TTSMode,
    VoiceCloneRequest,
    VoiceDesignCloneRequest,
    VoiceDesignRequest,
    WSRequest,
)

logger = logging.getLogger("ttsweb.routers.ws")

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/tts")
async def tts_websocket(websocket: WebSocket):
    """Stream TTS audio over WebSocket.

    Protocol:
    1. Client sends JSON with TTS params (same as REST, plus `mode` field)
    2. Server sends JSON status messages: {"type": "status", "status": "processing"}
    3. Server sends binary audio chunks as they're generated
    4. Server sends {"type": "done", "job_id": "..."} or {"type": "error", ...}
    5. Client can send {"type": "cancel"} at any time to abort
    """
    await websocket.accept()

    tts_service = websocket.app.state.tts_service
    job_manager = websocket.app.state.job_manager

    try:
        # Wait for the initial request message
        data = await websocket.receive_json()
        ws_req = WSRequest(**data)

        # Create a job
        job = job_manager.create_job()

        await websocket.send_json({
            "type": "status",
            "status": "queued",
            "job_id": job.job_id,
        })

        # Dispatch generation based on mode
        if ws_req.mode == TTSMode.CUSTOM_VOICE:
            req = CustomVoiceRequest(
                text=ws_req.text,
                language=ws_req.language,
                speaker=ws_req.speaker or "Vivian",
                instruct=ws_req.instruct,
            )
            gen_coro = tts_service.generate_custom_voice(job.job_id, req)

        elif ws_req.mode == TTSMode.VOICE_DESIGN:
            req = VoiceDesignRequest(
                text=ws_req.text,
                language=ws_req.language,
                instruct=ws_req.instruct or "",
            )
            gen_coro = tts_service.generate_voice_design(job.job_id, req)

        elif ws_req.mode == TTSMode.VOICE_CLONE:
            # For WebSocket voice clone, the audio should be sent as the next binary message
            await websocket.send_json({"type": "status", "status": "awaiting_audio"})
            audio_data = await websocket.receive_bytes()


            req = VoiceCloneRequest(
                text=ws_req.text,
                language=ws_req.language,
                ref_text=ws_req.ref_text,
                x_vector_only_mode=ws_req.x_vector_only_mode,
                consent_acknowledged=ws_req.consent_acknowledged,
            )
            gen_coro = tts_service.generate_voice_clone(job.job_id, req, audio_data)

        elif ws_req.mode == TTSMode.VOICE_DESIGN_CLONE:
            req = VoiceDesignCloneRequest(
                design_text=ws_req.design_text or ws_req.text,
                design_language=ws_req.design_language or ws_req.language,
                design_instruct=ws_req.design_instruct or ws_req.instruct or "",
                clone_texts=ws_req.clone_texts or [ws_req.text],
                clone_languages=ws_req.clone_languages or [ws_req.language],
            )
            gen_coro = tts_service.generate_voice_design_clone(job.job_id, req)
        else:
            await websocket.send_json({
                "type": "error",
                "error": "invalid_mode",
                "detail": f"Unknown mode: {ws_req.mode}",
            })
            await websocket.close(code=1008)
            return

        await websocket.send_json({"type": "status", "status": "processing"})

        # Run generation as a task so we can listen for cancel messages
        gen_task = asyncio.create_task(gen_coro)
        job_manager.set_task(job.job_id, gen_task)

        # Monitor task completion while listening for cancel
        cancel_listener = asyncio.create_task(
            _listen_for_cancel(websocket, job_manager, job.job_id)
        )

        try:
            await gen_task
        except asyncio.CancelledError:
            pass
        finally:
            cancel_listener.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await cancel_listener

        # Send result
        updated_job = job_manager.get_job(job.job_id)
        if updated_job and updated_job.status == JobStatus.COMPLETED and updated_job.result_audio:
            # Send audio as binary
            await websocket.send_bytes(updated_job.result_audio)
            await websocket.send_json({
                "type": "done",
                "job_id": job.job_id,
            })
        elif updated_job and updated_job.status == JobStatus.CANCELLED:
            await websocket.send_json({
                "type": "status",
                "status": "cancelled",
                "job_id": job.job_id,
            })
        elif updated_job and updated_job.status == JobStatus.FAILED:
            await websocket.send_json({
                "type": "error",
                "error": "generation_failed",
                "detail": updated_job.error or "Unknown error",
                "job_id": job.job_id,
            })

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.exception("WebSocket error")
        with contextlib.suppress(Exception):
            await websocket.send_json({
                "type": "error",
                "error": "internal_error",
                "detail": str(e),
            })
    finally:
        with contextlib.suppress(Exception):
            await websocket.close()


async def _listen_for_cancel(
    websocket: WebSocket, job_manager, job_id: str
) -> None:
    """Listen for cancel messages from the client."""
    try:
        while True:
            data = await websocket.receive_json()
            if isinstance(data, dict) and data.get("type") == "cancel":
                job_manager.cancel_job(job_id)
                logger.info("WebSocket cancel received", extra={"job_id": job_id})
                break
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    except Exception:
        pass
