package com.corp.iot.backend.externalsourcejob.dto;

import java.time.Instant;

// Một lần chạy trong lịch sử — FE dựng dải nhịp chạy và tự gom theo giờ cho biểu đồ số dòng.
public record ExternalSourceJobRunResponse(
        Long id,
        String status,
        long rowCount,
        String error,
        Instant startedAt,
        Instant finishedAt
) {
}
