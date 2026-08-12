package com.corp.iot.ingestion.dto;

import java.time.Instant;
import java.util.List;

// Payload MQTT gateway publish lên topic gateway/{mac_address}/data — xem contract
// ở ARCHITECTURE.md § Flow: Gateway sensor data. 1 message = 1 chu kỳ đọc, gộp tất
// cả pin INPUT (AI/DI) gateway vừa đọc được.
public record GatewayBatchPayload(Instant measuredAt, List<Reading> readings) {

    public record Reading(String type, Integer pinNumber, Double value) {
    }
}
