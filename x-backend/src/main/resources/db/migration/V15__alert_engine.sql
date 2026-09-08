-- Alert engine (Phase 6a) — xem context/ARCHITECTURE.md § Flow: Alert, context/DATABASE.md
-- § alert_rule / alert_channel / alert.
--
-- 3 bảng đã có DDL từ V1__baseline_schema.sql nhưng chưa code nào chạm vào. Đợt này chỉ bổ sung
-- 2 thứ mà luồng thật cần: soft delete cho bảng cấu hình, và index cho trang danh sách cảnh báo.

-- alert_rule là bảng CẤU HÌNH nên soft delete (CONVENTIONS.md §3). Xoá cứng sẽ làm mọi dòng
-- alert lịch sử trỏ tới rule_id không còn tồn tại — báo cáo sự cố mất luôn tên rule đã bắn.
ALTER TABLE alert_rule
    ADD COLUMN deleted_at TIMESTAMPTZ;

-- Trang Cảnh báo lọc theo trạng thái rồi sắp theo thời gian bắt đầu. ix_alert_rule_metric hiện có
-- phục vụ chiều ngược lại (engine tra rule), không dùng được cho truy vấn này.
CREATE INDEX ix_alert_recent ON alert (tenant_id, status, started_at DESC);
