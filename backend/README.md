# TTSWeb Backend

Backend service for TTSWeb — exposes the full [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) capability surface via REST + WebSocket APIs.

## Quick Start

```bash
# Create a virtual environment
python3.12 -m venv .venv && source .venv/bin/activate

# Install (dev mode)
pip install -e ".[dev]"

# Run in mock mode (no GPU needed)
TTSWEB_MOCK_MODE=true uvicorn ttsweb.main:app --host 127.0.0.1 --port 8100 --reload
```

Open http://127.0.0.1:8100/api/docs for interactive Swagger UI.

## With GPU

```bash
# Install with GPU dependencies
pip install -e ".[gpu]"

# Run (auto-detects GPU)
uvicorn ttsweb.main:app --host 0.0.0.0 --port 8100
```

## Docker

```bash
docker compose up --build
```

## Environment Variables

See [.env.example](.env.example) for all supported configuration.

| Variable | Default | Description |
|----------|---------|-------------|
| `TTSWEB_HOST` | `0.0.0.0` | Bind address |
| `TTSWEB_PORT` | `8100` | Bind port |
| `TTSWEB_CORS_ORIGINS` | `localhost:3000,5173` | Allowed CORS origins |
| `TTSWEB_MOCK_MODE` | `false` | Force mock mode |
| `TTSWEB_MAX_CONCURRENT_JOBS` | `4` | Concurrent inference limit |
| `TTSWEB_MAX_TEXT_LENGTH` | `10000` | Max input text chars |
| `TTSWEB_MAX_AUDIO_UPLOAD_MB` | `25` | Max upload size (MB) |
| `TTSWEB_LOG_LEVEL` | `info` | Log level |

## Architecture

```
src/ttsweb/
├── main.py              # FastAPI app factory + lifespan
├── config.py            # pydantic-settings configuration
├── schemas.py           # Request/response Pydantic models (API contract)
├── middleware.py         # Request ID, logging, error handling
├── routers/
│   ├── tts.py           # POST endpoints for all 4 TTS modes
│   ├── tokenizer.py     # Encode/decode endpoints
│   ├── jobs.py          # Job status, cancel, result download
│   ├── meta.py          # Speakers, languages, models
│   ├── health.py        # Liveness + readiness probes
│   └── ws.py            # WebSocket streaming
└── services/
    ├── model_manager.py # Lazy-load models, concurrency, mock mode
    ├── tts_service.py   # TTS orchestration (all modes)
    ├── tokenizer_service.py
    └── job_manager.py   # In-memory job tracking + cleanup
```

## Testing

```bash
pip install -e ".[dev]"
pytest tests/ -v
```

## API Documentation

See [API_CONTRACT.md](API_CONTRACT.md) for the full frontend integration guide.
