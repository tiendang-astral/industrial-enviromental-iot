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
        Instant measuredAt
) {
}
