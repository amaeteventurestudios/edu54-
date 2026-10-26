#!/usr/bin/env bash
# Dev server for screenshots and manual checks: its own throwaway data dir (never the demo database), stub inference.
#   tools/dev-shots-server.sh [port]   -> http://127.0.0.1:8103, every account's password is "shots-password-1"
#   BACKEND=ollama uses the real model; KEEP=1 keeps the data dir; stop with: kill "$(cat /tmp/umanah-shots.pid)"
set -euo pipefail
PORT="${1:-8103}"; D=/tmp/umanah-shots
[ -f /tmp/umanah-shots.pid ] && kill "$(cat /tmp/umanah-shots.pid)" 2>/dev/null && sleep 1 || true
[ "${KEEP:-0}" = 1 ] || rm -rf "$D"
mkdir -p "$D"
cd "$(dirname "$0")/../services/api"
export UMANAH_ENGINES="${UMANAH_ENGINES-kiwix=http://127.0.0.1:8112/}" PATH="$HOME/.local/bin:$PATH" UMANAH_DATA_DIR=$D UMANAH_INFERENCE_BACKEND=${BACKEND:-stub} UMANAH_DEMO_PASSWORD=shots-password-1
echo $$ > /tmp/umanah-shots.pid
exec uv run uvicorn umanah_api.main:app --port "$PORT"
