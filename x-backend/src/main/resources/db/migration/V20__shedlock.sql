-- Khoá phân tán cho các job @Scheduled (Phase 9 — chuẩn bị chạy nhiều instance).
--
-- @Scheduled là đồng hồ của riêng từng tiến trình: mỗi bản service tự hẹn giờ, không biết bản khác
-- tồn tại. Ba câu quét việc hiện có (findDueJobs, findOpenTasks, findDueForDispatch) đều chỉ đánh
-- dấu "đã nhận" SAU khi làm xong, nên trong suốt lúc job đang chạy cửa vẫn mở cho bản thứ hai:
--   - external_source_job  -> 2 câu SQL bắn vào database khách, incremental_cursor đè nhau, mất dòng
--   - external_source_job_backfill -> status RUNNING vẫn nằm trong điều kiện chọn, hai bản vá chồng nhau
--   - outbox_event         -> lệnh relay publish 2 lần, thiết bị ngoài hiện trường nhận lệnh lặp
--
-- Bảng này ở x-backend vì đây là service duy nhất chạy Flyway; x-ingestion/x-processing đọc ghi nó
-- qua JdbcTemplate (không phải JPA entity) nên ddl-auto=validate của 2 service đó không đụng tới.
CREATE TABLE shedlock (
    name       VARCHAR(64)  NOT NULL,
    lock_until TIMESTAMP    NOT NULL,
    locked_at  TIMESTAMP    NOT NULL,
    locked_by  VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
);
