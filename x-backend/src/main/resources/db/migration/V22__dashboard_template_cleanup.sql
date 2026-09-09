-- Dọn mẫu dashboard: mẫu nào cũng phải dựng ra một board dùng được, mẫu sơ sài thì thà không gợi ý.
--
-- Toạ độ trong mẫu chỉ đúng khi MỌI entry dựng được widget. Entry trỏ tới chỉ số chưa có kênh nào
-- sẽ bị bỏ, để lại lỗ đúng chỗ nó — board dồn hết sang một bên. Hai mẫu dưới đây đang mắc lỗi đó.

-- "Điện năng" khai power/voltage/current — cả ba chỉ số hiện KHÔNG có kênh nào trên toàn platform,
-- nên áp mẫu chỉ ra board rỗng. Xoá hẳn; khi nào có kênh điện thì thêm lại bằng migration mới.
DELETE FROM dashboard_template WHERE name = 'Điện năng';

-- "Chất lượng không khí" khai pm25/co2/o3/co, nhưng pm25 và o3 chưa có kênh nào. Còn lại co2 và co
-- thì đều khai ở nửa phải (x=6) nên board hiện ra lệch hẳn một bên.
-- Giữ đúng hai chỉ số có thật và trải kín bề ngang: hai biểu đồ xu hướng cạnh nhau. Vai trò cũng
-- tách bạch với "Khí độc & an toàn" — bên kia là các ô số đọc tức thời, bên này là xu hướng.
UPDATE dashboard_template SET layout_json = '[
    {"widgetType": "LINE", "metric": "co2", "layout": {"x": 0, "y": 0, "w": 6, "h": 4}, "config": {}},
    {"widgetType": "LINE", "metric": "co",  "layout": {"x": 6, "y": 0, "w": 6, "h": 4}, "config": {}}
]'::jsonb,
    description = 'Xu hướng CO2 và CO theo thời gian',
    updated_at = now()
WHERE name = 'Chất lượng không khí';
