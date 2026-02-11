FROM python:3.12-slim AS base

WORKDIR /app

# Install system deps for soundfile
RUN apt-get update && \
    apt-get install -y --no-install-recommends libsndfile1 && \
    rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --no-cache-dir .

COPY src/ ./src/

EXPOSE 8100

CMD ["uvicorn", "ttsweb.main:app", "--host", "0.0.0.0", "--port", "8100"]
