package com.corp.iot.processing.realtime;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.UUID;

// Publish reading mới lên Redis pub/sub channel realtime:{tenantId}:{tenantNodeId}
// (xem DATABASE.md §5) — x-backend subscribe ở Phase 4, chưa có consumer nào ở Phase 3.
@Slf4j
@Component
@RequiredArgsConstructor
public class RealtimePublisher {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public void publishSensorReading(
            Long tenantId, Long tenantNodeId, Long gatewayId, String metricCode,
            String pinType, Integer pinNumber, Double value, Instant measuredAt) {
        String channel = "realtime:" + tenantId + ":" + tenantNodeId;
        try {
            String payload = objectMapper.writeValueAsString(
                    new RealtimeReadingPayload(gatewayId, metricCode, pinType, pinNumber, value, measuredAt));
            redisTemplate.convertAndSend(channel, payload);
        } catch (Exception e) {
            log.error("Failed to publish realtime event to channel={}", channel, e);
        }
    }

    // Payload khác luồng sensor (có datastreamId thẳng thay vì gatewayId/pinType/pinNumber) vì
    // external không có khái niệm pin — FE match trực tiếp theo datastreamId (xem ARCHITECTURE.md
    // § Flow: External source data).
    public void publishExternalReading(Long tenantId, Long tenantNodeId, Long datastreamId, String metricCode, Double value, Instant measuredAt) {
        String channel = "realtime:" + tenantId + ":" + tenantNodeId;
        try {
            String payload = objectMapper.writeValueAsString(
                    new RealtimeExternalReadingPayload(datastreamId, metricCode, value, measuredAt));
            redisTemplate.convertAndSend(channel, payload);
        } catch (Exception e) {
            log.error("Failed to publish realtime external event to channel={}", channel, e);
        }
    }

    private record RealtimeReadingPayload(
            Long gatewayId, String metric, String pinType, Integer pinNumber, Double value, Instant measuredAt) {
    }

    private record RealtimeExternalReadingPayload(
            Long datastreamId, String metric, Double value, Instant measuredAt) {
    }

    // Payload khác 2 loại reading ở trên (không có metric/value/measuredAt) — FE phân biệt qua
    // field commandId có mặt, match trực tiếp bằng commandId (đã biết từ response lúc tạo lệnh),
    // không cần gatewayId/pinId (xem ARCHITECTURE.md § Contract MQTT Command/ACK).
    public void publishCommandStatus(
            Long tenantId, Long tenantNodeId, UUID commandId, String status, String powerReportedState, String error) {
        String channel = "realtime:" + tenantId + ":" + tenantNodeId;
        try {
            String payload = objectMapper.writeValueAsString(
                    new RealtimeCommandPayload(commandId, status, powerReportedState, error));
            redisTemplate.convertAndSend(channel, payload);
        } catch (Exception e) {
            log.error("Failed to publish realtime command event to channel={}", channel, e);
        }
    }

    private record RealtimeCommandPayload(UUID commandId, String status, String powerReportedState, String error) {
    }
}
