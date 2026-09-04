-- Seed thêm dashboard_template. Trước đó chỉ có đúng 1 mẫu ("Giám sát cơ bản", V7) phủ
-- temperature + humidity, tức 2/17 metric đã seed — áp mẫu ở phần lớn node không sinh được widget
-- nào và trông như tính năng hỏng.
--
-- `metric` phải khớp `metric.code` (V4, V8), nếu không thì DashboardTemplateServiceImpl bỏ qua
-- entry đó im lặng. Widget kiểu DEVICE_LIST/DEVICES_ONLINE chưa dùng được trong template vì cơ chế
-- áp mẫu đi từ metric ra datastream.
INSERT INTO dashboard_template (name, description, layout_json, created_at, updated_at)
VALUES
    (
        'Môi trường chuồng trại',
        'Nhiệt độ, độ ẩm và các khí sinh ra trong chuồng nuôi (NH₃, H₂S, CO₂)',
        '[
            {"widgetType": "VALUE", "metric": "temperature", "config": {}},
            {"widgetType": "VALUE", "metric": "humidity", "config": {}},
            {"widgetType": "LINE", "metric": "nh3", "config": {}},
            {"widgetType": "LINE", "metric": "h2s", "config": {}},
            {"widgetType": "VALUE", "metric": "co2", "config": {}}
        ]'::jsonb,
        now(),
        now()
    ),
    (
        'Khí độc & an toàn',
        'Các khí cần theo dõi để bảo đảm an toàn khi có người vào khu vực kín',
        '[
            {"widgetType": "VALUE", "metric": "o2", "config": {}},
            {"widgetType": "VALUE", "metric": "co", "config": {}},
            {"widgetType": "VALUE", "metric": "ch4", "config": {}},
            {"widgetType": "VALUE", "metric": "h2s", "config": {}},
            {"widgetType": "VALUE", "metric": "nh3", "config": {}}
        ]'::jsonb,
        now(),
        now()
    ),
    (
        'Chất lượng không khí',
        'Bụi mịn và các chỉ số không khí chung, xem diễn biến theo thời gian',
        '[
            {"widgetType": "LINE", "metric": "pm25", "config": {}},
            {"widgetType": "LINE", "metric": "co2", "config": {}},
            {"widgetType": "VALUE", "metric": "o3", "config": {}},
            {"widgetType": "VALUE", "metric": "co", "config": {}}
        ]'::jsonb,
        now(),
        now()
    ),
    (
        'Thời tiết ngoài trời',
        'Trạm quan trắc ngoài trời: nhiệt độ, độ ẩm, áp suất, gió',
        '[
            {"widgetType": "LINE", "metric": "temperature", "config": {}},
            {"widgetType": "VALUE", "metric": "humidity", "config": {}},
            {"widgetType": "VALUE", "metric": "pressure", "config": {}},
            {"widgetType": "VALUE", "metric": "wind_speed", "config": {}},
            {"widgetType": "VALUE", "metric": "wind_direction", "config": {}}
        ]'::jsonb,
        now(),
        now()
    ),
    (
        'Điện năng',
        'Công suất tiêu thụ cùng điện áp và dòng điện của thiết bị trong khu vực',
        '[
            {"widgetType": "LINE", "metric": "power", "config": {}},
            {"widgetType": "VALUE", "metric": "voltage", "config": {}},
            {"widgetType": "VALUE", "metric": "current", "config": {}}
        ]'::jsonb,
        now(),
        now()
    );
