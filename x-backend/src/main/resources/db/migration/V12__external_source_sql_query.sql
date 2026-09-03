-- SQL là nguồn sự thật cho external source job: lọc nằm trong WHERE, biến đổi nằm trong SELECT,
-- :cursor là hợp đồng duy nhất giữa câu SQL của người dùng và cơ chế đọc tăng dần.
-- Xem context/DATABASE.md § external_source_job, context/ARCHITECTURE.md § Flow: External source data.

-- 1. incremental_cursor phải luôn có giá trị: :cursor bắt buộc bind được ở mọi lần chạy.
--    Job cũ đang NULL nghĩa là "đọc từ đầu" → epoch giữ đúng ngữ nghĩa đó.
UPDATE external_source_job
SET incremental_cursor = '1970-01-01T00:00:00Z'
WHERE incremental_cursor IS NULL;

-- 2. query_config {table, timestampColumn, valueColumns[]} + filter_config → {sql, timestampColumn}.
--    Sinh lại đúng câu SQL mà x-ingestion-service đang chạy để job đang hoạt động không đổi hành vi.
--    WITH ORDINALITY giữ nguyên thứ tự cột như valueColumns đã khai.
UPDATE external_source_job j
SET query_config = jsonb_build_object(
    'timestampColumn', j.query_config ->> 'timestampColumn',
    'sql',
        'SELECT ' || (j.query_config ->> 'timestampColumn')
        || coalesce((
               SELECT string_agg(', ' || col, '' ORDER BY ord)
               FROM jsonb_array_elements_text(j.query_config -> 'valueColumns') WITH ORDINALITY AS t(col, ord)
           ), '')
        || E'\nFROM   ' || (j.query_config ->> 'table')
        || E'\nWHERE  ' || (j.query_config ->> 'timestampColumn') || ' > :cursor'
        || coalesce((
               SELECT string_agg(
                          E'\n  AND  ' || (f ->> 'column') || ' ' || (f ->> 'operator') || ' ' || quote_literal(f ->> 'value'),
                          '' ORDER BY ord)
               FROM jsonb_array_elements(coalesce(j.filter_config, '[]'::jsonb)) WITH ORDINALITY AS t(f, ord)
           ), '')
        || E'\nORDER  BY ' || (j.query_config ->> 'timestampColumn')
        || E'\nLIMIT  500'
)
WHERE j.query_config ? 'table';

-- 3. Cột không còn nghĩa: điều kiện đã nằm trong WHERE, biến đổi đã nằm trong SELECT.
--    mapping_config chưa từng được đọc bởi service nào (reserved từ baseline).
ALTER TABLE external_source_job DROP COLUMN filter_config;
ALTER TABLE external_source_job DROP COLUMN mapping_config;

-- 4. Lịch sử chạy — bảng log (không soft delete), phục vụ dải nhịp chạy và biểu đồ dòng/giờ
--    ở trang chi tiết nguồn. external_source_job chỉ giữ được lần chạy gần nhất.
CREATE TABLE external_source_job_run (
    id                     BIGSERIAL PRIMARY KEY,
    tenant_id              BIGINT      NOT NULL,
    external_source_job_id BIGINT      NOT NULL,
    status                 VARCHAR     NOT NULL CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED')),
    row_count              BIGINT      NOT NULL DEFAULT 0,
    error                  TEXT,
    started_at             TIMESTAMPTZ NOT NULL,
    finished_at            TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_job_run_job FOREIGN KEY (tenant_id, external_source_job_id)
        REFERENCES external_source_job (tenant_id, id)
);

CREATE INDEX ix_job_run_recent ON external_source_job_run (tenant_id, external_source_job_id, started_at DESC);
