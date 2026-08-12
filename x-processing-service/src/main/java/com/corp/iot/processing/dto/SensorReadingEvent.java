package com.corp.iot.processing.dto;

import java.time.Instant;

// Bản sao riêng của Processing Service, khớp contract JSON x-ingestion-service publish
// lên topic sensor-data-raw (xem ARCHITECTURE.md § Flow: Gateway sensor data). Không
// share DTO giữa 2 service (CONVENTIONS.md) — đổi field ở đây bắt buộc kèm contract test.
public record SensorReadingEvent(
        String messageId,
        Long tenantId,
        Long gatewayId,
        Long tenantNodeId,
        String macAddress,
        String pinType,
        Integer pinNumber,
        Double value,
        Instant measuredAt
) {
}
