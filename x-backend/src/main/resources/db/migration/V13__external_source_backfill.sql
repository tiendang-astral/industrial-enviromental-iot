-- Backfill dữ liệu lịch sử theo từng kênh của external source — xem context/DATABASE.md
-- § external_source_job_backfill, context/ARCHITECTURE.md § Flow: External source backfill.
--
-- Kênh dữ liệu được gắn SAU khi job đã chạy thì mất sạch phần lịch sử trước đó: câu SQL chỉ đọc
-- dòng mới hơn incremental_cursor, và Processing Service vứt mọi field chưa có datastream.
-- Backfill đọc lại phần đã mất bằng đúng câu SQL của job, chỉ đổi giá trị bind vào :cursor.

-- Mốc sớm nhất mà kênh có số đo liền mạch — dữ liệu của kênh là dải [oldest_reading_at → nay].
-- Backfill chỉ nới dải này sang trái, nên ngắt giữa chừng làm dải ngắn đi chứ không thủng ở giữa.
-- NULL với source_type='GATEWAY_PIN' (chỉ external mới có khái niệm đọc lại lịch sử).
ALTER TABLE datastream
    ADD COLUMN oldest_reading_at TIMESTAMPTZ;

-- Kênh external đang có: dữ liệu bắt đầu từ mốc đọc hiện tại của job trở đi.
UPDATE datastream d
SET oldest_reading_at = j.incremental_cursor::timestamptz
FROM external_source_job j
WHERE d.source_type = 'EXTERNAL_SOURCE_JOB'
  AND d.source_id = j.id
  AND j.incremental_cursor IS NOT NULL;

-- Bảng tác vụ vá — bảng log (không soft delete), x-backend ghi, x-ingestion-service chạy và
-- cập nhật tiến độ. Neo vào job vì câu SQL thuộc về job; datastream_id nói vá cột nào.
CREATE TABLE external_source_job_backfill (
    id                     BIGSERIAL PRIMARY KEY,
    tenant_id              BIGINT      NOT NULL,
    external_source_job_id BIGINT      NOT NULL,
    datastream_id          BIGINT      NOT NULL,
    -- Dải cần vá = [target_from, covered_from], cả hai cố định suốt tác vụ.
    target_from            TIMESTAMPTZ NOT NULL,
    covered_from           TIMESTAMPTZ NOT NULL,
    -- Đang lùi tới đâu trong dải đó — đọc mới → cũ để dữ liệu luôn liền mạch. Tiến độ =
    -- (covered_from - cursor_at) / (covered_from - target_from).
    cursor_at              TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_backfill_range CHECK (target_from < covered_from),
    status                 VARCHAR     NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED')),
    row_count              BIGINT      NOT NULL DEFAULT 0,
    error                  TEXT,
    started_at             TIMESTAMPTZ,
    finished_at            TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by             BIGINT,
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_backfill_job FOREIGN KEY (tenant_id, external_source_job_id)
        REFERENCES external_source_job (tenant_id, id),
    CONSTRAINT fk_backfill_datastream FOREIGN KEY (datastream_id)
        REFERENCES datastream (id) ON DELETE CASCADE
);

-- Bấm hai lần không sinh hai lượt cày song song trên database khách hàng.
CREATE UNIQUE INDEX uq_backfill_open ON external_source_job_backfill (datastream_id)
    WHERE status IN ('PENDING', 'RUNNING');

-- Sweep của x-ingestion-service quét tác vụ chưa xong, cũ trước.
CREATE INDEX ix_backfill_due ON external_source_job_backfill (status, created_at)
    WHERE status IN ('PENDING', 'RUNNING');

CREATE INDEX ix_backfill_recent ON external_source_job_backfill (tenant_id, datastream_id, created_at DESC);
