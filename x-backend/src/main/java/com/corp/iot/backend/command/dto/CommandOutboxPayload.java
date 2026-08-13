package com.corp.iot.backend.command.dto;

import java.util.UUID;

// Payload publish nguyên văn lên Kafka gateway-commands (xem ARCHITECTURE.md § Contract MQTT
// Command/ACK) — Outbox Publisher ở Processing Service publish đúng payload_json này, không transform.
public record CommandOutboxPayload(
        UUID commandId,
        Long tenantId,
        Long gatewayId,
        Long tenantNodeId,
        String pinType,
        Integer pinNumber,
        String commandType
) {
}
