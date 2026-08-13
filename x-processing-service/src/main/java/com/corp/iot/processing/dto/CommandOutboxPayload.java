package com.corp.iot.processing.dto;

import java.util.UUID;

// Bản sao riêng của Processing Service, khớp contract JSON x-backend ghi vào
// outbox_event.payload_json / publish nguyên văn lên Kafka gateway-commands
// (xem ARCHITECTURE.md § Contract MQTT Command/ACK). Không share DTO giữa 2 service.
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
