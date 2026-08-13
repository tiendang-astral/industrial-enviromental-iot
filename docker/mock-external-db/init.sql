-- Bảng mock 1 "trạm quan trắc môi trường" ngoài hệ thống — dùng để test tính năng External
-- Source (Phase 5, xem context/ARCHITECTURE.md § Flow: External source data). KHÔNG liên quan
-- gì tới schema thật của platform (bảng metric/datastream...) — đây là dữ liệu phía "khách hàng".

CREATE TABLE IF NOT EXISTS sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    measured_at TIMESTAMPTZ NOT NULL,
    site_code VARCHAR NOT NULL DEFAULT 'FARM-01',
    temperature_c DOUBLE PRECISION NOT NULL,
    humidity_pct DOUBLE PRECISION NOT NULL,
    pressure_hpa DOUBLE PRECISION NOT NULL,
    co2_ppm DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_sensor_readings_measured_at ON sensor_readings (measured_at);

-- Seed 4 giờ dữ liệu lịch sử (1 dòng/phút, dao động sin + nhiễu random quanh baseline thực tế)
-- để có sẵn dữ liệu ngay khi kết nối lần đầu, không phải đợi insert-loop.sh chèn dần.
INSERT INTO sensor_readings (measured_at, site_code, temperature_c, humidity_pct, pressure_hpa, co2_ppm)
SELECT
    now() - (n || ' minutes')::interval,
    'FARM-01',
    round((26 + 3 * sin(n / 30.0) + (random() - 0.5) * 1.5)::numeric, 2),
    round((65 + 8 * cos(n / 45.0) + (random() - 0.5) * 3)::numeric, 2),
    round((1008 + (random() - 0.5) * 4)::numeric, 2),
    round((450 + 50 * sin(n / 20.0) + (random() - 0.5) * 20)::numeric, 1)
FROM generate_series(240, 1, -1) AS n;
