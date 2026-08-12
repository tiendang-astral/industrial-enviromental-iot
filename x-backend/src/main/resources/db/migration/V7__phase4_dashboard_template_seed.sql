-- Phase 4: seed 1 dashboard_template mẫu để demo tính năng "Áp dụng template".
-- layout_json là danh sách widget cần sinh: mỗi entry {widgetType, metric, config} —
-- khi áp dụng vào 1 node, hệ thống tìm mọi datastream có metric khớp tại node đó và
-- sinh 1 widget/datastream (xem DATABASE.md § dashboard_template).
INSERT INTO dashboard_template (name, description, layout_json, created_at, updated_at)
VALUES (
    'Giám sát cơ bản',
    'LINE nhiệt độ + VALUE độ ẩm cho mỗi datastream khớp metric tại node được áp dụng',
    '[
        {"widgetType": "LINE", "metric": "temperature", "config": {}},
        {"widgetType": "VALUE", "metric": "humidity", "config": {}}
    ]'::jsonb,
    now(),
    now()
);
