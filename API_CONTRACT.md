# TTSWeb API Contract v1

> **Base URL**: `http://localhost:8100/api/v1`
> **Auth**: None (v1). Add bearer token or API key in future versions.
> **Content-Type**: `application/json` unless noted.
> **Errors**: All errors return `{"error": "...", "detail": "...", "request_id": "..."}`.
> **Request ID**: Every response includes an `X-Request-ID` header for tracing.

---

## Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/tts/custom-voice` | Synthesize with preset speaker |
| `POST` | `/tts/voice-design` | Synthesize with NL voice description |
| `POST` | `/tts/voice-clone` | Clone voice from reference audio |
| `POST` | `/tts/voice-design-clone` | Design voice → clone for multiple texts |
| `POST` | `/tokenizer/encode` | Audio → tokens |
| `POST` | `/tokenizer/decode` | Tokens → audio |
| `GET` | `/speakers` | List preset speakers |
| `GET` | `/languages` | List supported languages |
| `GET` | `/models` | List model variants & status |
| `GET` | `/jobs/{id}/status` | Poll job progress |
| `POST` | `/jobs/{id}/cancel` | Cancel a job |
| `GET` | `/jobs/{id}/result` | Download result WAV |
| `GET` | `/health` | Liveness check |
| `GET` | `/ready` | Readiness check |
| `WS` | `/ws/tts` | Streaming TTS over WebSocket |

---

## TTS Endpoints

All TTS endpoints return **`202 Accepted`** with a `job_id`. Poll `/jobs/{id}/status` or use WebSocket for real-time delivery.

### POST `/tts/custom-voice`

```json
{
  "text": "Hello, world!",
  "language": "English",
  "speaker": "Ryan",
  "instruct": "Speak cheerfully"  // optional
}
```

**Response** (202):
```json
{
  "job_id": "uuid",
  "status": "queued",
  "created_at": "2026-02-11T17:00:00Z"
}
```

### POST `/tts/voice-design`

```json
{
  "text": "The quick brown fox jumps.",
  "language": "English",
  "instruct": "Young female voice, bright and energetic, slight British accent"
}
```

### POST `/tts/voice-clone`

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `audio` | file | ✅ | Reference audio (WAV/MP3/FLAC, ≤25 MB) |
| `text` | string | ✅ | Text to synthesize |
| `language` | string | | Default: `"Auto"` |
| `ref_text` | string | | Transcript of reference audio |
| `x_vector_only_mode` | bool | | Default: `false` |
| `consent_acknowledged` | bool | ✅ | **Must be `true`** |

⚠️ Returns **`403`** if `consent_acknowledged` is not `true`.

### POST `/tts/voice-design-clone`

```json
{
  "design_text": "Reference sentence for voice creation.",
  "design_language": "English",
  "design_instruct": "Male, 30s, deep baritone, calm and measured",
  "clone_texts": ["First sentence.", "Second sentence."],
  "clone_languages": ["English", "English"]
}
```

---

## Job Lifecycle

```
queued → processing → completed | failed | cancelled
```

### GET `/jobs/{id}/status`

```json
{
  "job_id": "uuid",
  "status": "completed",
  "progress": 1.0,
  "error": null,
  "audio_url": "/api/v1/jobs/uuid/result",
  "created_at": "...",
  "updated_at": "..."
}
```

### POST `/jobs/{id}/cancel`

Returns `{"job_id": "...", "status": "cancelled"}` or `404`/`409`.

### GET `/jobs/{id}/result`

Returns `audio/wav` binary. Only available when `status == "completed"`.

---

## Tokenizer

### POST `/tokenizer/encode`

**Content-Type**: `multipart/form-data` with `audio` file field.

```json
// Response
{ "tokens": [100, 200, 300, ...], "count": 128 }
```

### POST `/tokenizer/decode`

```json
{ "tokens": [100, 200, 300, ...] }
```

Returns `audio/wav` binary.

---

## Metadata

### GET `/speakers`

```json
[
  { "name": "Vivian", "languages": ["Chinese", "English"], "description": "..." },
  { "name": "Ryan", "languages": ["English", "Chinese"], "description": "..." }
]
```

### GET `/languages`

```json
[
  { "code": "zh", "name": "Chinese" },
  { "code": "en", "name": "English" }
]
```

### GET `/health`

```json
{
  "status": "ok",
  "version": "0.1.0",
  "mock_mode": true,
  "gpu_available": false,
  "models_loaded": ["mock"]
}
```

---

## WebSocket Streaming

**URL**: `ws://localhost:8100/api/v1/ws/tts`

### Protocol

**1. Client → Server**: JSON request (same fields as REST, plus `mode`)

```json
{
  "mode": "custom_voice",
  "text": "Hello, world!",
  "language": "English",
  "speaker": "Ryan"
}
```

**2. Server → Client**: Status messages

```json
{"type": "status", "status": "processing", "job_id": "uuid"}
```

**3. Server → Client**: Binary audio data (complete WAV)

**4. Server → Client**: Done

```json
{"type": "done", "job_id": "uuid"}
```

**Cancel**: Send `{"type": "cancel"}` at any time.

**Voice Clone via WS**: Send JSON params first, then binary audio as the next message.

### Modes

| Mode | Required Fields |
|------|----------------|
| `custom_voice` | `text`, `speaker` |
| `voice_design` | `text`, `instruct` |
| `voice_clone` | `text`, `consent_acknowledged` + binary audio message |
| `voice_design_clone` | `design_text`, `design_instruct`, `clone_texts`, `clone_languages` |

---

## Error Codes

| HTTP | Meaning |
|------|---------|
| `400` | Invalid input (validation error, text too long) |
| `403` | Consent not acknowledged (voice clone) |
| `404` | Job not found |
| `409` | Job in terminal state (can't cancel/download) |
| `413` | Audio file too large |
| `500` | Internal server error |

---

## Frontend Integration Examples

### JavaScript `fetch`

```javascript
// 1. Start a custom voice job
const res = await fetch('http://localhost:8100/api/v1/tts/custom-voice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Hello from TTSWeb!',
    language: 'English',
    speaker: 'Ryan',
  }),
});
const { job_id } = await res.json();

// 2. Poll for completion
let status;
do {
  await new Promise(r => setTimeout(r, 1000));
  const poll = await fetch(`http://localhost:8100/api/v1/jobs/${job_id}/status`);
  status = await poll.json();
} while (status.status === 'queued' || status.status === 'processing');

// 3. Download audio
if (status.status === 'completed') {
  const audio = await fetch(`http://localhost:8100${status.audio_url}`);
  const blob = await audio.blob();
  const url = URL.createObjectURL(blob);
  new Audio(url).play();
}
```

### WebSocket

```javascript
const ws = new WebSocket('ws://localhost:8100/api/v1/ws/tts');

ws.onopen = () => {
  ws.send(JSON.stringify({
    mode: 'custom_voice',
    text: 'Streaming audio!',
    language: 'English',
    speaker: 'Vivian',
  }));
};

ws.onmessage = (event) => {
  if (event.data instanceof Blob) {
    // Binary: audio data
    const url = URL.createObjectURL(event.data);
    new Audio(url).play();
  } else {
    // JSON: status message
    const msg = JSON.parse(event.data);
    console.log('Status:', msg);
  }
};
```

### curl

```bash
# Custom voice
curl -X POST http://localhost:8100/api/v1/tts/custom-voice \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello!","language":"English","speaker":"Ryan"}'

# Voice clone (multipart)
curl -X POST http://localhost:8100/api/v1/tts/voice-clone \
  -F "audio=@reference.wav" \
  -F "text=Cloned speech!" \
  -F "language=English" \
  -F "ref_text=Original transcript" \
  -F "consent_acknowledged=true"

# Poll job
curl http://localhost:8100/api/v1/jobs/{job_id}/status

# Download result
curl -o output.wav http://localhost:8100/api/v1/jobs/{job_id}/result
```
