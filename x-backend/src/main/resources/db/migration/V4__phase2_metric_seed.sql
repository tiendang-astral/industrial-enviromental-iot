-- Phase 2: seed metric master data (system data, chia sẻ chéo tenant).
INSERT INTO metric (code, name, unit, data_type, min_value, max_value, created_at) VALUES
    ('temperature', 'Nhiệt độ', '°C', 'NUMBER', -50, 100, now()),
    ('humidity', 'Độ ẩm', '%RH', 'NUMBER', 0, 100, now()),
    ('pressure', 'Áp suất', 'hPa', 'NUMBER', 800, 1200, now()),
    ('pm25', 'Bụi mịn PM2.5', 'µg/m³', 'NUMBER', 0, 1000, now()),
    ('co2', 'CO2', 'ppm', 'NUMBER', 0, 10000, now()),
    ('light', 'Ánh sáng', 'lux', 'NUMBER', 0, 200000, now()),
    ('voltage', 'Điện áp', 'V', 'NUMBER', 0, 500, now()),
    ('current', 'Dòng điện', 'A', 'NUMBER', 0, 100, now()),
    ('power', 'Công suất', 'W', 'NUMBER', 0, 100000, now());
