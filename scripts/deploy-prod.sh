#!/usr/bin/env bash
# Deploy toàn bộ hệ thống (hạ tầng + 3 backend service + 2 frontend).
#
#   scripts/deploy-prod.sh            # build ảnh còn thiếu rồi khởi động
#   scripts/deploy-prod.sh --build    # build lại TẤT CẢ (bắt buộc khi đổi URL frontend,
#                                     #   vì Vite nướng VITE_* vào bundle lúc build)
#   scripts/deploy-prod.sh --pull     # cập nhật ảnh hạ tầng trước khi lên
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/compose/docker-compose.prod.yml"
ENV_FILE="$ROOT_DIR/.env.production"

cd "$ROOT_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "!! Thiếu .env.production" >&2
  echo "   cp .env.example .env.production   rồi điền giá trị thật" >&2
  exit 1
fi

# Bí mật để rỗng thì service sẽ lên rồi chết theo kiểu khó đoán — chặn ngay tại đây.
missing=()
for key in POSTGRES_PASSWORD INFLUX_TOKEN INFLUX_PASSWORD MINIO_ROOT_PASSWORD \
           APP_JWT_SECRET APP_ENCRYPTION_KEY EMQX_DASHBOARD_PASSWORD MQTT_SERVICE_PASSWORD; do
  value="$(grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2-)"
  [ -z "$value" ] && missing+=("$key")
done
if [ ${#missing[@]} -gt 0 ]; then
  echo "!! Các biến bắt buộc còn trống trong .env.production:" >&2
  printf '   - %s\n' "${missing[@]}" >&2
  echo "   Sinh khoá: openssl rand -base64 48" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

compose() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

# Bắt lỗi cấu hình trước khi kéo/build bất cứ thứ gì
compose config --quiet

# số bản x concurrency > số partition thì bản thừa không được giao partition nào
slots=$(( PROCESSING_REPLICAS * PROCESSING_CONCURRENCY ))
if [ "$slots" -gt "$KAFKA_TELEMETRY_PARTITIONS" ]; then
  echo "!! PROCESSING_REPLICAS x PROCESSING_CONCURRENCY = $slots > KAFKA_TELEMETRY_PARTITIONS = $KAFKA_TELEMETRY_PARTITIONS" >&2
  echo "   Consumer thừa sẽ ngồi không. Tăng partition hoặc giảm replicas/concurrency." >&2
  exit 1
fi

case "${1:-}" in
  --build) echo "==> Build lại toàn bộ ảnh..."; compose build --no-cache ;;
  --pull)  echo "==> Cập nhật ảnh hạ tầng..."; compose pull ;;
esac

echo "==> Khởi động (backend chạy Flyway xong mới tới ingestion/processing)..."
compose up -d --build --remove-orphans

echo "==> Chờ các service healthy..."
for svc in backend ingestion processing; do
  printf "    %-12s" "$svc"
  for _ in $(seq 1 60); do
    state="$(compose ps --format json "$svc" 2>/dev/null | grep -o '"Health":"[a-z]*"' | head -1 | cut -d'"' -f4)"
    [ "$state" = "healthy" ] && break
    sleep 5
  done
  echo "${state:-unknown}"
done

compose ps

cat <<EOF

==> Đã lên.

  Frontend (tenant)   http://localhost:${TENANT_WEB_PORT}
  Frontend (admin)    http://localhost:${ADMIN_WEB_PORT}
  MQTT (gateway)      tcp://<host>:${MQTT_PORT}
  EMQX Dashboard      http://localhost:${EMQX_DASHBOARD_PORT}

  Quy mô hiện tại: processing ${PROCESSING_REPLICAS} bản x ${PROCESSING_CONCURRENCY} thread
                   / ${KAFKA_TELEMETRY_PARTITIONS} partition

  VIỆC CÒN LẠI SAU LẦN DEPLOY ĐẦU — EMQX đang tắt ẩn danh, chưa có tài khoản nào:
    1. Vào EMQX Dashboard, tạo user "${MQTT_SERVICE_USERNAME}" đúng mật khẩu trong .env.production
    2. Tạo tài khoản RIÊNG cho từng gateway, kèm ACL chỉ cho phép topic gateway/<mac>/#
    Chưa làm bước 1 thì ingestion/processing không nối được vào EMQX.

  Log:  docker compose --env-file .env.production -f compose/docker-compose.prod.yml logs -f <service>
  Dừng: scripts/down-prod.sh
EOF
