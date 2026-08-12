package com.corp.iot.ingestion.dto;

import java.time.Instant;

// Kafka event publish lên topic sensor-data-raw — contract JSON thuần (không dùng
// Spring Kafka type-header serializer) xem ARCHITECTURE.md § Flow: Gateway sensor data.
// x-processing-service tự định nghĩa DTO riêng khớp field này (CONVENTIONS.md — không
// share DTO giữa 2 service), nên đổi field ở đây bắt buộc kèm contract test.
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
