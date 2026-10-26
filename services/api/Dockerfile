# Umanah API (FastAPI + SQLite). Built from the repo root:  docker build -f services/api/Dockerfile -t umanah/api:0.1.0 .
FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim AS build
WORKDIR /app
COPY services/api/pyproject.toml services/api/uv.lock ./
COPY services/api/src ./src
RUN uv sync --frozen --no-dev --no-editable

FROM python:3.14-slim-bookworm
RUN useradd --uid 1000 --create-home umanah
WORKDIR /app
COPY --from=build /app/.venv /app/.venv
COPY content /app/content
COPY config /app/config
ENV PATH="/app/.venv/bin:$PATH" UMANAH_CONTENT_DIR=/app/content UMANAH_DATA_DIR=/data UMANAH_WEB_DIST="" UMANAH_LABOS_CONFIG_DIR=/app/config
USER umanah
EXPOSE 8101
# UMANAH_HOST/UMANAH_PORT let a second instance (EDU54) listen elsewhere; the AI Lab keeps 0.0.0.0:8101 in its container.
CMD ["sh", "-c", "exec uvicorn umanah_api.main:app --host ${UMANAH_HOST:-0.0.0.0} --port ${UMANAH_PORT:-8101}"]
