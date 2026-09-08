-- Giới hạn quy tắc theo LOẠI NGUỒN của kênh dữ liệu (Phase 6b) — xem context/DATABASE.md § alert_rule.
--
-- Trước đây rule khớp theo đúng 2 thứ: (subtree node, metric). Một node có cả cảm biến nhiệt độ
-- trong chuồng (gateway) lẫn nhiệt độ thời tiết ngoài trời (database ngoài) thì rule "chuồng quá
-- nóng" bắn luôn cho cả feed thời tiết — hai thứ bản chất khác nhau nhưng chung metric.
--
-- NULL = mọi nguồn, đúng bằng hành vi hiện tại, nên rule đang có không đổi gì và không cần vá dữ liệu.
ALTER TABLE alert_rule
    ADD COLUMN source_type VARCHAR
        CHECK (source_type IS NULL OR source_type IN ('GATEWAY_PIN', 'EXTERNAL_SOURCE_JOB'));

ALTER TABLE alert_rule_group
    ADD COLUMN source_type VARCHAR
        CHECK (source_type IS NULL OR source_type IN ('GATEWAY_PIN', 'EXTERNAL_SOURCE_JOB'));
