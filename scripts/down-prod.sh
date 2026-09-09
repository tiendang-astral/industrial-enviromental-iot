#!/usr/bin/env bash
# Dừng hệ thống production.
#
#   scripts/down-prod.sh              # dừng, GIỮ NGUYÊN dữ liệu
#   scripts/down-prod.sh --volumes    # dừng và XOÁ SẠCH volume (Postgres, InfluxDB, Kafka...)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/compose/docker-compose.prod.yml"
ENV_FILE="$ROOT_DIR/.env.production"

cd "$ROOT_DIR"

[ -f "$ENV_FILE" ] || { echo "!! Thiếu .env.production" >&2; exit 1; }

compose() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

if [ "${1:-}" = "--volumes" ]; then
  echo "!! Sắp XOÁ TOÀN BỘ dữ liệu production: Postgres, InfluxDB, Kafka, Redis, MinIO, EMQX."
  read -r -p "   Gõ 'xoa het' để xác nhận: " confirm
  [ "$confirm" = "xoa het" ] || { echo "   Huỷ."; exit 1; }
  compose down --volumes --remove-orphans
  echo "==> Đã dừng và xoá volume."
else
  # KHÔNG có --volumes: dữ liệu giữ nguyên, deploy lại là chạy tiếp.
  compose down --remove-orphans
  echo "==> Đã dừng. Volume giữ nguyên — scripts/deploy-prod.sh để chạy lại."
fi
