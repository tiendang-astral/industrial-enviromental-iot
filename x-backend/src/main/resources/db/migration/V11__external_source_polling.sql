-- Phase 5: External source polling — xem context/DATABASE.md § external_source/datastream/dashboard,
-- context/ARCHITECTURE.md § Flow: External source data (polling).

-- Chỉ hỗ trợ PostgreSQL ở Phase 5 — mở rộng MySQL/MongoDB bằng migration sau (đổi CHECK này).
ALTER TABLE external_source
    ADD CONSTRAINT ck_external_source_connection_type CHECK (connection_type IN ('POSTGRESQL'));

-- Field/cột trong query_config.valueColumns mà datastream này bind vào — cần vì 1 external_source_job
-- có thể sinh nhiều datastream (khác gateway_pin luôn 1-1, source_field luôn NULL).
ALTER TABLE datastream
    ADD COLUMN source_field VARCHAR;
ALTER TABLE datastream
    ADD CONSTRAINT ck_datastream_source_field CHECK (
        (source_type = 'GATEWAY_PIN' AND source_field IS NULL)
        OR (source_type = 'EXTERNAL_SOURCE_JOB' AND source_field IS NOT NULL)
    );
CREATE UNIQUE INDEX uq_datastream_external_field ON datastream (tenant_id, source_type, source_id, source_field)
    WHERE source_type = 'EXTERNAL_SOURCE_JOB';

-- Dashboard theo nguồn (board riêng, layout riêng cho từng external_source) — song song dashboard
-- theo node hiện có. NULL = board theo node (như trước), NOT NULL = board theo nguồn.
ALTER TABLE dashboard
    ADD COLUMN external_source_id BIGINT;
ALTER TABLE dashboard
    ADD CONSTRAINT fk_dashboard_source FOREIGN KEY (tenant_id, external_source_id) REFERENCES external_source (tenant_id, id);

-- Postgres coi nhiều NULL là phân biệt trong unique constraint thường — phải COALESCE để giữ đúng
-- "1 board/user/node HOẶC 1 board/user/nguồn" (cùng pattern uq_user_role_scope).
DROP INDEX uq_dashboard_user_node;
CREATE UNIQUE INDEX uq_dashboard_user_node ON dashboard (tenant_id, user_id, tenant_node_id, COALESCE(external_source_id, 0));
