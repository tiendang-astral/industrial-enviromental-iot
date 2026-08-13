package com.corp.iot.processing.dto;

import java.util.UUID;

// Payload publish xuống Gateway qua MQTT topic gateway/{mac_address}/command
// (xem ARCHITECTURE.md § Contract MQTT Command/ACK).
public record CommandMqttPayload(
        UUID commandId,
        String pinType,
        Integer pinNumber,
        String commandType
) {
}
