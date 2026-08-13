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
        Instant measuredAt
) {
}
