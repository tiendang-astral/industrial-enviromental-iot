package com.corp.iot.processing.realtime;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisOperations;
import org.springframework.data.redis.core.SessionCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

// Publish reading mới lên Redis pub/sub channel realtime:{tenantId}:{tenantNodeId}
// (xem DATABASE.md §5) — x-backend subscribe ở Phase 4, chưa có consumer nào ở Phase 3.
@Slf4j
@Component
@RequiredArgsConstructor
public class RealtimePublisher {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;


    /**
     * Publish cả lô trong MỘT round-trip.
     *
     * Số lệnh PUBLISH không giảm được — pub/sub bắt buộc một lệnh cho mỗi sự kiện vì frontend cần
     * từng sự kiện riêng để cập nhật từng widget. Cái tiết kiệm được là round-trip: 500 -> 1.
     *
     * Ngữ nghĩa không đổi: subscriber vẫn nhận đúng N message riêng biệt, đúng thứ tự (Redis chạy
     * pipeline tuần tự), nên RedisRealtimeBridge và frontend không phải sửa gì.
     */
    public void publishSensorReadings(List<SensorReading> readings) {
        List<String[]> pending = new ArrayList<>(readings.size());
        for (SensorReading r : readings) {
            try {
                pending.add(new String[]{channel(r.tenantId(), r.tenantNodeId()),
                        objectMapper.writeValueAsString(new RealtimeReadingPayload(
                                r.gatewayId(), r.metricCode(), r.pinType(), r.pinNumber(), r.value(), r.measuredAt()))});
            } catch (Exception e) {
                log.error("Failed to serialize realtime event for gatewayId={}", r.gatewayId(), e);
            }
        }
        sendPipelined(pending);
    }

    public void publishExternalReadings(List<ExternalReading> readings) {
        List<String[]> pending = new ArrayList<>(readings.size());
        for (ExternalReading r : readings) {
            try {
                pending.add(new String[]{channel(r.tenantId(), r.tenantNodeId()),
                        objectMapper.writeValueAsString(new RealtimeExternalReadingPayload(
                                r.datastreamId(), r.metricCode(), r.value(), r.measuredAt()))});
            } catch (Exception e) {
                log.error("Failed to serialize realtime external event for datastreamId={}", r.datastreamId(), e);
            }
        }
        sendPipelined(pending);
    }

    private void sendPipelined(List<String[]> pending) {
        if (pending.isEmpty()) {
            return;
        }
        try {
            redisTemplate.executePipelined(new SessionCallback<Object>() {
                @Override
                @SuppressWarnings("unchecked")
                public <K, V> Object execute(RedisOperations<K, V> operations) {
                    RedisOperations<String, String> ops = (RedisOperations<String, String>) operations;
                    for (String[] item : pending) {
                        ops.convertAndSend(item[0], item[1]);
                    }
                    return null;
                }
            });
        } catch (Exception e) {
            // Mất realtime chỉ làm UI chậm cập nhật, không được phép làm hỏng luồng ghi.
            log.error("Failed to publish {} realtime events", pending.size(), e);
        }
    }

    private static String channel(Long tenantId, Long tenantNodeId) {
        return "realtime:" + tenantId + ":" + tenantNodeId;
    }

    public record SensorReading(
            Long tenantId, Long tenantNodeId, Long gatewayId, String metricCode,
            String pinType, Integer pinNumber, Double value, Instant measuredAt) {
    }

    public record ExternalReading(
            Long tenantId, Long tenantNodeId, Long datastreamId, String metricCode, Double value, Instant measuredAt) {
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

    // Payload thứ tư trên cùng channel — FE phân biệt qua field alertId có mặt, khớp badge cảnh báo
    // theo datastreamId đang hiển thị (xem ARCHITECTURE.md § Flow: Alert).
    public void publishAlertStatus(
            Long tenantId, Long tenantNodeId, Long alertId, Long ruleId, String ruleName, Long datastreamId,
            String status, String severity, Double value, Instant measuredAt) {
        String channel = "realtime:" + tenantId + ":" + tenantNodeId;
        try {
            String payload = objectMapper.writeValueAsString(new RealtimeAlertPayload(
                    alertId, ruleId, ruleName, datastreamId, status, severity, value, measuredAt));
            redisTemplate.convertAndSend(channel, payload);
        } catch (Exception e) {
            log.error("Failed to publish realtime alert event to channel={}", channel, e);
        }
    }

    private record RealtimeAlertPayload(
            Long alertId, Long ruleId, String ruleName, Long datastreamId, String status, String severity,
            Double value, Instant measuredAt) {
    }
}
