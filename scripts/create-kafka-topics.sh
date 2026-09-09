#!/usr/bin/env bash
# Tạo Kafka topics cần thiết cho Ingestion Pipeline (xem context/ARCHITECTURE.md § Kafka topics).
# Idempotent — chạy lại không lỗi nếu topic đã tồn tại, và tự NÂNG số partition nếu topic cũ
# đang ít hơn mức cấu hình dưới đây.
#
# Số partition = trần cứng của số consumer hoạt động trong 1 consumer group (1 partition chỉ được
# giao cho đúng 1 consumer). 3 partition cũ nghĩa là bật quá 3 bản x-processing-service thì bản
# thứ 4 trở đi ngồi không.
#
# LƯU Ý: partition chỉ TĂNG được, không giảm. Và lúc tăng, công thức murmur2(key) % số_partition
# đổi nên một gateway có thể nhảy sang partition khác — trong vài giây chuyển đổi, message cũ và
# mới của cùng gateway nằm ở 2 partition, hai consumer đọc song song và thứ tự có thể đảo. Làm
# lúc chưa có dữ liệu production thì không ảnh hưởng gì.
set -euo pipefail

BROKER="localhost:9092"
REPLICATION=1

# topic:partitions — telemetry cần nhiều (thông lượng cao), command ít (do người bấm, lưu lượng nhỏ)
TOPICS=(
  "sensor-data-raw:24"
  "external-data-raw:24"
  "gateway-commands:6"
)

kt() {
  docker exec iiot-kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server "$BROKER" "$@"
}

for entry in "${TOPICS[@]}"; do
  topic="${entry%%:*}"
  partitions="${entry##*:}"

  echo "==> Creating topic '$topic' with $partitions partitions (if not exists)..."
  kt --create --if-not-exists --topic "$topic" --partitions "$partitions" --replication-factor "$REPLICATION"

  current=$(kt --describe --topic "$topic" | grep -o 'PartitionCount: *[0-9]*' | grep -o '[0-9]*')
  if [ "$current" -lt "$partitions" ]; then
    echo "==> Topic '$topic' đang có $current partition, nâng lên $partitions..."
    kt --alter --topic "$topic" --partitions "$partitions"
  elif [ "$current" -gt "$partitions" ]; then
    echo "!!! Topic '$topic' đang có $current partition, NHIỀU hơn mức cấu hình ($partitions)."
    echo "!!! Kafka không giảm được partition — bỏ qua. Muốn giảm thì phải xoá và tạo lại topic."
  fi
done

echo "==> Current topics:"
kt --list
