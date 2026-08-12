#!/usr/bin/env bash
# Giả lập 1 gateway thật publish batch reading lên MQTT — dùng để verify DoD Phase 3
# (xem PLAN.md § Phase 3, contract payload ở context/ARCHITECTURE.md § Flow: Gateway sensor data).
#
# Cần: mosquitto_pub (gói mosquitto-clients) + gateway/pin đã tạo sẵn qua x-frontend
# (Phase 2) khớp đúng MAC/pinNumber/type truyền vào.
#
# Usage:
#   ./scripts/simulate-gateway.sh --mac AA:BB:CC:DD:EE:FF
#   ./scripts/simulate-gateway.sh --mac AA:BB:CC:DD:EE:FF --interval 10
#   ./scripts/simulate-gateway.sh --mac AA:BB:CC:DD:EE:FF --reading AI:1:23.5 --reading DI:1:1
#   ./scripts/simulate-gateway.sh --mac AA:BB:CC:DD:EE:FF --measured-at 2026-08-12T09:41:00Z   # test dedup: chạy 2 lần cùng timestamp
set -euo pipefail

HOST="localhost"
PORT="1883"
MAC=""
INTERVAL=""
MEASURED_AT=""
READINGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mac) MAC="$2"; shift 2 ;;
    --host) HOST="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --interval) INTERVAL="$2"; shift 2 ;;
    --measured-at) MEASURED_AT="$2"; shift 2 ;;
    --reading) READINGS+=("$2"); shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$MAC" ]]; then
  echo "Usage: $0 --mac <mac_address> [--host H] [--port P] [--interval SECONDS] [--measured-at ISO8601] [--reading TYPE:PINNUM:VALUE]..." >&2
  exit 1
fi

if [[ ${#READINGS[@]} -eq 0 ]]; then
  READINGS=("AI:1:23.5" "DI:1:1")
fi

if ! command -v mosquitto_pub >/dev/null 2>&1; then
  echo "mosquitto_pub không có sẵn — cài mosquitto-clients (VD: brew install mosquitto)" >&2
  exit 1
fi

build_payload() {
  local measured_at="$1"
  local readings_json=""
  local first=true
  for r in "${READINGS[@]}"; do
    IFS=':' read -r type pin_number value <<< "$r"
    if [[ "$first" == true ]]; then first=false; else readings_json+=","; fi
    readings_json+="{\"type\":\"${type}\",\"pinNumber\":${pin_number},\"value\":${value}}"
  done
  echo "{\"measuredAt\":\"${measured_at}\",\"readings\":[${readings_json}]}"
}

publish_once() {
  local measured_at="${MEASURED_AT:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
  local payload
  payload="$(build_payload "$measured_at")"
  local topic="gateway/${MAC}/data"
  echo "==> Publishing to ${topic}: ${payload}"
  mosquitto_pub -h "$HOST" -p "$PORT" -t "$topic" -q 1 -m "$payload"
}

if [[ -n "$INTERVAL" ]]; then
  echo "==> Looping every ${INTERVAL}s (Ctrl+C to stop)"
  while true; do
    publish_once
    sleep "$INTERVAL"
  done
else
  publish_once
fi
