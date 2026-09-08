-- Trang Cảnh báo bỏ bộ lọc khoảng thời gian: giờ chỉ lấy N dòng mới nhất rồi phân trang ở client.
--
-- `ix_alert_recent (tenant_id, status, started_at DESC)` chỉ phục vụ được truy vấn CÓ lọc status.
-- Khi không lọc, Postgres phải quét rồi sort toàn bộ alert của tenant để lấy 500 dòng đầu.
CREATE INDEX ix_alert_started ON alert (tenant_id, started_at DESC);
