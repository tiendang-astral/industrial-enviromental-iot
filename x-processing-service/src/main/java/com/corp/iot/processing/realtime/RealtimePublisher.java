package com.corp.iot.processing.realtime;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;

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

    private record RealtimeReadingPayload(
            Long gatewayId, String metric, String pinType, Integer pinNumber, Double value, Instant measuredAt) {
    }
}
