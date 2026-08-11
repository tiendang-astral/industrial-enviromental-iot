# Product

## 1. Sản phẩm này là gì

**Industrial Environmental IoT** là phần mềm thu thập dữ liệu cảm biến đa điểm, đa nguồn và hiển thị trực quan trên Dashboard.

Hai nguồn dữ liệu chính:

- **Gateway (MQTT):** Thu thập dữ liệu cảm biến qua giao thức MQTT từ Advantech Gateway (gateway được cấu hình/kết nối sẵn trong hệ thống trước đó).
- **Database/Datasource:** Kết nối và đọc trực tiếp dữ liệu từ các database/datasource khác (đã được cấu hình sẵn trong hệ thống trước đó).

Dữ liệu từ cả hai nguồn được chuẩn hóa, lưu trữ dạng time-series và hiển thị realtime trên Dashboard tùy biến, kèm cảnh báo tức thời khi có bất thường.

## 2. Người sử dụng sản phẩm

Các kỹ sư và người dùng vận hành có nhu cầu theo dõi dữ liệu môi trường/sản xuất đa điểm, đa nguồn, cần một phần mềm **nhỏ gọn, đủ dùng, không cồng kềnh** — không phải một nền tảng IoT phức tạp cho hàng loạt ngành.

## 3. Các chức năng cần có

- Thu thập dữ liệu từ Gateway (MQTT) gửi lên và hiển thị realtime.
- Thu thập dữ liệu từ Database/Datasource và hiển thị realtime.
- Quản trị theo tenant: Công ty → Chi nhánh → Khu sản xuất → Xưởng/Chuồng trại.
- Cảnh báo tức thời dựa trên dữ liệu realtime từ Gateway/Database, gửi qua Email, Telegram.
- Dashboard tùy biến với bộ widget kéo-thả.
- Bật/tắt relay và mở/đóng chân gateway (ở tầng ứng dụng) để nhận/không nhận dữ liệu.

## 4. Yêu cầu kỹ thuật

| Hạng mục | Yêu cầu |
|----------|---------|
| MQTT Broker | Cụm EMQX chịu tải cao, hỗ trợ hàng nghìn kết nối concurrent từ nhiều Gateway/Site đồng thời |
| Message Ingestion Pipeline | Tích hợp Kafka đảm bảo at-least-once delivery; data normalization, deduplication, schema validation trước khi ghi vào Time-Series DB; rate limiting & back-pressure control; horizontal scaling khi số site tăng |
| Time-Series Storage | InfluxDB — schema theo measurement/tag/field tối ưu cho sensor data; tự động aggregate raw → 1min → 5min → 1h → 1day; Retention Policy phân cấp tự động xóa dữ liệu cũ; indexing/partitioning đảm bảo truy vấn time-range < 500ms dù có hàng tỷ records; backup tự động theo lịch |
| Web Application / Dashboard | Layout cấu hình động theo từng chuồng/trại; widget kéo-thả, tùy biến per-site/per-user; biểu đồ time-series realtime qua WebSocket, hỗ trợ zoom/pan/custom time range |
| Alerting Engine | Logic điều kiện đa cấp (threshold, assert connection); notification đa kênh (Telegram Bot API, Email SMTP); lưu lịch sử cảnh báo |
| Reporting | Template engine tùy chỉnh theo loại báo cáo (môi trường, vận hành, sự cố, năng suất); truy vấn đa chiều (time range linh hoạt, multi-site, multi-sensor, event-based filtering); thống kê tần suất sự cố theo chuồng/khu vực |

## 5. Vai trò người dùng

| Phạm vi | Vai trò | Quyền hạn |
|---------|---------|-----------|
| Quản lý ứng dụng | Quản trị viên (System Admin) | Quản trị toàn hệ thống, quản lý tenant |
| Trong tenant | Quản trị viên (Tenant Admin) | Cấu hình tenant, quản lý người dùng, quản lý tổ chức (Công ty → Chi nhánh → Khu sản xuất → Xưởng/Chuồng trại) |
| Trong tenant | Kỹ thuật viên | Cấu hình gateway/datasource, xử lý cảnh báo, vận hành |
| Trong tenant | Nhân viên | Theo dõi dashboard, xem báo cáo |
