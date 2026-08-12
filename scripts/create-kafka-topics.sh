#!/usr/bin/env bash
# Tạo Kafka topics cần thiết cho Ingestion Pipeline (xem context/ARCHITECTURE.md § Kafka topics).
# Idempotent — chạy lại không lỗi nếu topic đã tồn tại.
set -euo pipefail

BROKER="localhost:9092"
PARTITIONS=3
REPLICATION=1

TOPICS=(
  "sensor-data-raw"
  "external-data-raw"
  "gateway-commands"
)

for topic in "${TOPICS[@]}"; do
  echo "==> Creating topic '$topic' (if not exists)..."
  docker exec iiot-kafka /opt/kafka/bin/kafka-topics.sh \
    --bootstrap-server "$BROKER" \
    --create --if-not-exists \
    --topic "$topic" \
    --partitions "$PARTITIONS" \
    --replication-factor "$REPLICATION"
done

echo "==> Current topics:"
docker exec iiot-kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server "$BROKER" --list
