-- Template chuyển từ "danh sách luật" sang "bố cục có sẵn": mỗi entry mang thêm `layout {x,y,w,h}`
-- trên lưới 12 cột, và áp mẫu nay GHI ĐÈ board thay vì cộng dồn (xem DATABASE.md § dashboard_template).
--
-- Toạ độ viết tay được vì cả LINE lẫn VALUE đều nhận nhiều kênh: node có 1 hay 5 kênh cùng chỉ số
-- thì vẫn đúng MỘT ô, nên mẫu không cần biết trước node đích có bao nhiêu kênh.
--
-- Ràng buộc kích thước (khớp WidgetSizeSpec ở backend và dashboardLayout.ts ở frontend):
--   VALUE  w 2..6   h 2..4
--   LINE   w 4..12  h 3..8

UPDATE dashboard_template SET layout_json = '[
    {"widgetType": "LINE",  "metric": "temperature", "layout": {"x": 0, "y": 0, "w": 8, "h": 4}, "config": {}},
    {"widgetType": "VALUE", "metric": "humidity",    "layout": {"x": 8, "y": 0, "w": 4, "h": 4}, "config": {}}
]'::jsonb, updated_at = now()
WHERE name = 'Giám sát cơ bản';

-- Ba số đo nền ở hàng trên để liếc một cái là xong, hai khí cần theo dõi xu hướng thì vẽ biểu đồ.
UPDATE dashboard_template SET layout_json = '[
    {"widgetType": "VALUE", "metric": "temperature", "layout": {"x": 0, "y": 0, "w": 4, "h": 2}, "config": {}},
    {"widgetType": "VALUE", "metric": "humidity",    "layout": {"x": 4, "y": 0, "w": 4, "h": 2}, "config": {}},
    {"widgetType": "VALUE", "metric": "co2",         "layout": {"x": 8, "y": 0, "w": 4, "h": 2}, "config": {}},
    {"widgetType": "LINE",  "metric": "nh3",         "layout": {"x": 0, "y": 2, "w": 6, "h": 4}, "config": {}},
    {"widgetType": "LINE",  "metric": "h2s",         "layout": {"x": 6, "y": 2, "w": 6, "h": 4}, "config": {}}
]'::jsonb, updated_at = now()
WHERE name = 'Môi trường chuồng trại';

-- Toàn số đo: đây là bảng an toàn, cần đọc giá trị hiện tại chứ không cần xu hướng.
UPDATE dashboard_template SET layout_json = '[
    {"widgetType": "VALUE", "metric": "o2",  "layout": {"x": 0, "y": 0, "w": 4, "h": 2}, "config": {}},
    {"widgetType": "VALUE", "metric": "co",  "layout": {"x": 4, "y": 0, "w": 4, "h": 2}, "config": {}},
    {"widgetType": "VALUE", "metric": "ch4", "layout": {"x": 8, "y": 0, "w": 4, "h": 2}, "config": {}},
    {"widgetType": "VALUE", "metric": "h2s", "layout": {"x": 0, "y": 2, "w": 6, "h": 2}, "config": {}},
    {"widgetType": "VALUE", "metric": "nh3", "layout": {"x": 6, "y": 2, "w": 6, "h": 2}, "config": {}}
]'::jsonb, updated_at = now()
WHERE name = 'Khí độc & an toàn';

UPDATE dashboard_template SET layout_json = '[
    {"widgetType": "LINE",  "metric": "pm25", "layout": {"x": 0, "y": 0, "w": 6, "h": 4}, "config": {}},
    {"widgetType": "LINE",  "metric": "co2",  "layout": {"x": 6, "y": 0, "w": 6, "h": 4}, "config": {}},
    {"widgetType": "VALUE", "metric": "o3",   "layout": {"x": 0, "y": 4, "w": 6, "h": 2}, "config": {}},
    {"widgetType": "VALUE", "metric": "co",   "layout": {"x": 6, "y": 4, "w": 6, "h": 2}, "config": {}}
]'::jsonb, updated_at = now()
WHERE name = 'Chất lượng không khí';

-- Nhiệt độ là thứ người ta mở trang thời tiết để xem, cho nó nguyên một hàng; bốn số phụ xếp đều dưới.
UPDATE dashboard_template SET layout_json = '[
    {"widgetType": "LINE",  "metric": "temperature",    "layout": {"x": 0, "y": 0, "w": 12, "h": 4}, "config": {}},
    {"widgetType": "VALUE", "metric": "humidity",       "layout": {"x": 0, "y": 4, "w": 3,  "h": 2}, "config": {}},
    {"widgetType": "VALUE", "metric": "pressure",       "layout": {"x": 3, "y": 4, "w": 3,  "h": 2}, "config": {}},
    {"widgetType": "VALUE", "metric": "wind_speed",     "layout": {"x": 6, "y": 4, "w": 3,  "h": 2}, "config": {}},
    {"widgetType": "VALUE", "metric": "wind_direction", "layout": {"x": 9, "y": 4, "w": 3,  "h": 2}, "config": {}}
]'::jsonb, updated_at = now()
WHERE name = 'Thời tiết ngoài trời';

-- Công suất là đại lượng cần nhìn theo thời gian; điện áp/dòng chỉ cần giá trị tức thời, xếp dọc bên phải.
UPDATE dashboard_template SET layout_json = '[
    {"widgetType": "LINE",  "metric": "power",   "layout": {"x": 0, "y": 0, "w": 8, "h": 4}, "config": {}},
    {"widgetType": "VALUE", "metric": "voltage", "layout": {"x": 8, "y": 0, "w": 4, "h": 2}, "config": {}},
    {"widgetType": "VALUE", "metric": "current", "layout": {"x": 8, "y": 2, "w": 4, "h": 2}, "config": {}}
]'::jsonb, updated_at = now()
WHERE name = 'Điện năng';
