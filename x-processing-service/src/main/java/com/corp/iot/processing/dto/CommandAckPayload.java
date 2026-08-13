package com.corp.iot.processing.dto;

import java.util.UUID;

// Payload ACK Gateway publish lên topic gateway/{mac_address}/ack (xem ARCHITECTURE.md
// § Contract MQTT Command/ACK). result: "ACK" (thành công) | "NACK" (Gateway từ chối lệnh).
public record CommandAckPayload(
        UUID commandId,
        String pinType,
        Integer pinNumber,
        String result,
        String state
) {
}
