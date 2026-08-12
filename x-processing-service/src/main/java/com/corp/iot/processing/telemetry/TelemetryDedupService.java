package com.corp.iot.processing.telemetry;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

// Dedup theo messageId (Redis telemetry-dedup, TTL 6h — xem DATABASE.md §5).
// SETNX: true = lần đầu thấy messageId này (nên xử lý tiếp), false = đã xử lý rồi (skip).
@Service
@RequiredArgsConstructor
public class TelemetryDedupService {

    private static final String KEY_PREFIX = "telemetry-dedup:";

    private final StringRedisTemplate redisTemplate;

    @Value("${app.redis.telemetry-dedup-ttl-hours}")
    private long ttlHours;

    public boolean markIfNew(Long tenantId, String messageId) {
        String key = KEY_PREFIX + tenantId + ":" + messageId;
        Boolean firstSeen = redisTemplate.opsForValue().setIfAbsent(key, "1", Duration.ofHours(ttlHours));
        return Boolean.TRUE.equals(firstSeen);
    }
}
