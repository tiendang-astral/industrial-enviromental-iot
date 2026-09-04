package com.corp.iot.processing.dto;

import java.time.Instant;

// Bản sao riêng của Processing Service, khớp contract JSON x-ingestion-service publish
// lên topic external-data-raw (xem ARCHITECTURE.md § Flow: External source data). Không
// share DTO giữa 2 service — đổi field ở đây bắt buộc kèm contract test.
public record ExternalReadingEvent(
        String messageId,
        Long tenantId,
        Long tenantNodeId,
        Long externalSourceJobId,
        String sourceField,
        Double value,
        Instant measuredAt,
        // true = message do luồng vá lịch sử sinh ra. Processing Service bỏ qua dedup với
        // chúng: dòng cũ đã từng bị publish rồi bị vứt vì chưa có kênh, messageId vẫn nằm
        // trong Redis nên sẽ bị chặn oan. Ghi InfluxDB idempotent theo tag+timestamp nên
        // bỏ dedup không mất tính đúng, chỉ mất một chút tiết kiệm.
        boolean backfill
) {
}
