package com.corp.iot.ingestion.external.dto;

import java.time.Instant;

// Kafka event publish lên topic external-data-raw — contract JSON thuần, xem
// ARCHITECTURE.md § Flow: External source data (polling). x-processing-service tự định
// nghĩa DTO riêng khớp field này (không share DTO giữa 2 service).
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
