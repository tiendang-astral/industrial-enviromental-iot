#!/usr/bin/env bash
# Khởi động toàn bộ app cho local dev: hạ tầng (docker compose) + 5 service
# (x-backend, x-ingestion-service, x-processing-service, x-frontend, x-frontend-admin).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$RUN_DIR" "$LOG_DIR"

cd "$ROOT_DIR"

echo "==> Starting infrastructure (docker compose)..."
docker compose up -d

echo "==> Waiting for Postgres to be healthy..."
until docker compose ps postgres --format json | grep -q '"Health":"healthy"'; do
  sleep 1
done

echo "==> Waiting for Kafka to be healthy..."
until docker compose ps kafka --format json | grep -q '"Health":"healthy"'; do
  sleep 1
done

echo "==> Ensuring Kafka topics exist..."
"$ROOT_DIR/scripts/create-kafka-topics.sh"

start_service() {
  local name="$1"
  local dir="$2"
  local cmd="$3"

  if [ -f "$RUN_DIR/$name.pid" ] && kill -0 "$(cat "$RUN_DIR/$name.pid")" 2>/dev/null; then
    echo "==> $name already running (pid $(cat "$RUN_DIR/$name.pid")), skip"
    return
  fi

  echo "==> Starting $name..."
  pushd "$ROOT_DIR/$dir" >/dev/null
  nohup bash -c "$cmd" >"$LOG_DIR/$name.log" 2>&1 &
  echo $! >"$RUN_DIR/$name.pid"
  popd >/dev/null
}

start_service "backend" "x-backend" "./gradlew bootRun"
start_service "ingestion-service" "x-ingestion-service" "./gradlew bootRun"
start_service "processing-service" "x-processing-service" "./gradlew bootRun"
start_service "frontend" "x-frontend" "npm run dev"
start_service "frontend-admin" "x-frontend-admin" "npm run dev"

cat <<EOF

==> Tất cả đã khởi động. Log tại: $LOG_DIR/<service>.log

  Backend              http://localhost:8080
  Ingestion Service    http://localhost:8081
  Processing Service   http://localhost:8082
  Frontend (tenant)    http://localhost:5173
  Frontend (admin)     http://localhost:5174
  EMQX Dashboard       http://localhost:18083 (admin/public)
  MinIO Console        http://localhost:19001 (iiot/iiot12345)
  InfluxDB UI          http://localhost:8086

Dừng toàn bộ: scripts/down.sh
EOF
