-- Metric theo tenant: ngưỡng rời khỏi bảng metric, và tenant tự thêm được chỉ số riêng.
--
-- Ngưỡng cũ (-50..100 cho nhiệt độ, 0..500 cho NH3...) là DẢI VẬT LÝ HỢP LỆ của loại đo, không phải
-- ngưỡng cảnh báo. Dùng nó để tô màu thì không bao giờ kích hoạt: chuồng 31.5°C vẫn nằm gọn trong
-- -50..100. Ngưỡng có nghĩa luôn là của từng khách hàng (trại chăn nuôi 20..28, kho lạnh 0..8), nên
-- nó chuyển hẳn sang tenant_metric_setting và bảng metric không giữ giá trị mặc định nào nữa.

-- 1. Metric riêng của tenant. NULL = dòng hệ thống, dùng chung cho mọi tenant.
ALTER TABLE metric ADD COLUMN tenant_id BIGINT REFERENCES tenant (id);
CREATE INDEX ix_metric_tenant ON metric (tenant_id);

-- 2. Màu chỉ dành cho metric riêng; metric hệ thống giữ màu cứng ở x-frontend/src/lib/metricColors.ts.
--    Chỉ nhận token đã khai sẵn cả bản light lẫn dark trong index.css — lưu mã màu thô sẽ chìm ở
--    một trong hai theme.
ALTER TABLE metric ADD COLUMN color VARCHAR;
ALTER TABLE metric ADD CONSTRAINT ck_metric_color
    CHECK (color IS NULL OR color IN
        ('chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'chart-6', 'neutral'));
ALTER TABLE metric ADD CONSTRAINT ck_metric_color_scope
    CHECK ((tenant_id IS NULL) = (color IS NULL));

-- 3. Code chỉ cần duy nhất trong phạm vi sở hữu. COALESCE vì Postgres coi nhiều NULL là phân biệt
--    (cùng pattern uq_user_role_scope). Không chặn được tenant đặt trùng code hệ thống -> việc đó
--    do MetricServiceImpl chặn.
DROP INDEX uq_metric_code;
CREATE UNIQUE INDEX uq_metric_code ON metric (COALESCE(tenant_id, 0), lower(code));

-- 4. Bảng này giờ người dùng ghi được nên cần audit đầy đủ (CONVENTIONS.md § Database).
ALTER TABLE metric ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE metric ADD COLUMN created_by BIGINT;
ALTER TABLE metric ADD COLUMN updated_by BIGINT;

-- 5. Ngưỡng rời khỏi đây hoàn toàn. Một quy tắc duy nhất: ngưỡng luôn ở tenant_metric_setting.
ALTER TABLE metric DROP COLUMN min_value;
ALTER TABLE metric DROP COLUMN max_value;

-- 6. Ngưỡng riêng của từng tenant cho từng chỉ số. Có dòng = đã đặt ngưỡng, xoá dòng = về trống.
--    Cả hai cột NOT NULL: một đầu ngưỡng không đánh giá được gì, getMetricThreshold() cần đủ cặp.
CREATE TABLE tenant_metric_setting (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id  BIGINT NOT NULL REFERENCES tenant (id),
    metric_id  BIGINT NOT NULL REFERENCES metric (id),
    min_value  DOUBLE PRECISION NOT NULL,
    max_value  DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    created_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by BIGINT,
    CONSTRAINT ck_tenant_metric_threshold CHECK (min_value < max_value)
);
CREATE UNIQUE INDEX uq_tenant_metric_setting ON tenant_metric_setting (tenant_id, metric_id);
