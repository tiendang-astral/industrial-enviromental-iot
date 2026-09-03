package com.corp.iot.backend.externalsourcejob.dto;

import jakarta.validation.constraints.NotBlank;

// Mapped trực tiếp vào cột external_source_job.query_config (jsonb). sql là câu SELECT do người
// dùng viết, bắt buộc chứa :cursor — đó là hợp đồng duy nhất giữa câu truy vấn và cơ chế đọc tăng
// dần (xem SqlQueryValidator, ARCHITECTURE.md § Flow: External source data). timestampColumn là
// tên cột trong KẾT QUẢ (bí danh nếu có AS), dùng để lấy mốc thời gian và tính cursor mới.
public record ExternalSourceQueryConfig(
        @NotBlank String sql,
        @NotBlank String timestampColumn
) {
}
