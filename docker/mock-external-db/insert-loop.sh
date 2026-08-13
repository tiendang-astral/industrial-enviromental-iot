#!/usr/bin/env sh
# Chèn 1 dòng dữ liệu sensor mới mỗi 20s vào mock-external-db — mô phỏng trạm quan trắc
# ngoài liên tục ghi dữ liệu, để test tính năng polling incremental thật (không chỉ dữ liệu
# lịch sử tĩnh từ init.sql).
set -eu

echo "==> Bắt đầu chèn dữ liệu sensor mock mỗi 20s vào mock-external-db..."

while true; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "
    INSERT INTO sensor_readings (measured_at, site_code, temperature_c, humidity_pct, pressure_hpa, co2_ppm)
    VALUES (
      now(),
      'FARM-01',
      round((26 + (random() - 0.5) * 3)::numeric, 2),
      round((65 + (random() - 0.5) * 6)::numeric, 2),
      round((1008 + (random() - 0.5) * 4)::numeric, 2),
      round((450 + (random() - 0.5) * 40)::numeric, 1)
    );
  "
  echo "$(date '+%H:%M:%S') inserted 1 row"
  sleep 20
done
