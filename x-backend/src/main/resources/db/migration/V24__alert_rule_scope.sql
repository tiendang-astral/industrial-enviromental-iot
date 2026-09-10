-- Quy tắc cảnh báo chọn được ĐÍCH DANH thiết bị / nguồn dữ liệu, thay vì chỉ chọn được LOẠI.
--
-- Trước đó phạm vi chỉ có `source_type`: chọn được "cảm biến gateway" hay "database ngoài", nhưng
-- không chọn được CÁI NÀO. Đơn vị cắm hai database ngoài thì mọi quy tắc bắn cho cả hai; chín
-- gateway thì bắn cho cả chín.
--
-- NULL = không giới hạn, giữ đúng ngữ nghĩa cũ nên quy tắc đang chạy không đổi hành vi.
ALTER TABLE alert_rule_group
    ADD COLUMN gateway_ids jsonb,
    ADD COLUMN external_source_ids jsonb,
    -- Danh sách chỉ có nghĩa với đúng loại của nó: "áp cho cảm biến gateway nhưng chỉ nguồn số 3"
    -- là cấu hình vô nghĩa, chặn ở DB để không phụ thuộc mình tầng service.
    ADD CONSTRAINT ck_alert_rule_group_scope CHECK (
        (gateway_ids IS NULL OR source_type = 'GATEWAY_PIN')
        AND (external_source_ids IS NULL OR source_type = 'EXTERNAL_SOURCE_JOB')
    );

-- Chép xuống rule con y hệt `source_type`: engine chỉ đọc alert_rule, không biết nhóm tồn tại.
ALTER TABLE alert_rule
    ADD COLUMN gateway_ids jsonb,
    ADD COLUMN external_source_ids jsonb,
    ADD CONSTRAINT ck_alert_rule_scope CHECK (
        (gateway_ids IS NULL OR source_type = 'GATEWAY_PIN')
        AND (external_source_ids IS NULL OR source_type = 'EXTERNAL_SOURCE_JOB')
    );

-- KHÔNG index hai cột này: engine lọc chúng trong bộ nhớ (AlertEvaluationService) chứ không lọc
-- trong SQL, vì khoá cache Redis alert-rules:{tenant}:{node}:{metric} cố ý không chứa phạm vi.
--
-- `source_type` vẫn để nullable dù form nay bắt buộc chọn: quy tắc tạo trước bản này đang mang NULL
-- ("mọi nguồn") và vẫn phải chạy đúng như cũ cho tới khi người dùng tự mở ra sửa.
