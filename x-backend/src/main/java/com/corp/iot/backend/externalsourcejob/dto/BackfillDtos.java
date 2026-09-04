package com.corp.iot.backend.externalsourcejob.dto;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;

// DTO cho 3 endpoint backfill của 1 kênh dữ liệu. Gom một file vì đều nhỏ và chỉ dùng chung
// trong luồng vá lịch sử.
public final class BackfillDtos {

    private BackfillDtos() {
    }

    // startFrom dùng lại đúng từ vựng lúc tạo job (NEW_ONLY/ALL_HISTORY/FROM_DATE) để người dùng
    // không phải học khái niệm mới. NEW_ONLY ở đây vô nghĩa (không có gì để vá) nên bị từ chối.
    public record BackfillRequest(
            @NotNull StartFrom startFrom,
            Instant startFromDate
    ) {
    }

    public record BackfillResponse(
            Long id,
            Long datastreamId,
            Instant targetFrom,
            Instant coveredFrom,
            Instant cursorAt,
            String status,
            long rowCount,
            String error,
            Instant startedAt,
            Instant finishedAt,
            // % đã vá, tính theo khoảng thời gian đã lùi được — null khi chưa chạy hoặc dải rỗng.
            Integer progressPercent
    ) {
    }
}
