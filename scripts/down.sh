#!/usr/bin/env bash
# Dừng toàn bộ app: 5 service local (start bởi scripts/up.sh) + hạ tầng docker compose.
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run"

cd "$ROOT_DIR"

for name in backend ingestion-service processing-service frontend frontend-admin; do
  pid_file="$RUN_DIR/$name.pid"
  if [ -f "$pid_file" ]; then
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      echo "==> Stopping $name (pid $pid)..."
      # gradlew bootRun / npm run dev spawn a child JVM/node process — kill cả process group.
      pkill -P "$pid" 2>/dev/null || true
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
  fi
done

echo "==> Stopping infrastructure (docker compose)..."
docker compose down

echo "==> Done."
