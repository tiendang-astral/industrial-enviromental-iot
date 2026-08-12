-- Bổ sung metric: gió (tốc độ, hướng) + O2 + các khí đặc thù cho môi trường công nghiệp/chuồng trại
-- (NH3, H2S: khí độc thường giám sát trong chuồng trại chăn nuôi; CH4, CO, O3: khí công nghiệp/an toàn cháy nổ).
INSERT INTO metric (code, name, unit, data_type, min_value, max_value, created_at) VALUES
    ('wind_speed', 'Tốc độ gió', 'm/s', 'NUMBER', 0, 60, now()),
    ('wind_direction', 'Hướng gió', '°', 'NUMBER', 0, 360, now()),
    ('o2', 'Nồng độ O2', '%VOL', 'NUMBER', 0, 25, now()),
    ('nh3', 'Amoniac (NH3)', 'ppm', 'NUMBER', 0, 500, now()),
    ('h2s', 'Hydro sulfide (H2S)', 'ppm', 'NUMBER', 0, 500, now()),
    ('ch4', 'Metan (CH4)', '%LEL', 'NUMBER', 0, 100, now()),
    ('co', 'Carbon monoxide (CO)', 'ppm', 'NUMBER', 0, 1000, now()),
    ('o3', 'Ozone (O3)', 'ppm', 'NUMBER', 0, 10, now());
