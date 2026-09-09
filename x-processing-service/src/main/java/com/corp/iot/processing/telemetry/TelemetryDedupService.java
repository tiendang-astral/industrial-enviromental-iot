package com.corp.iot.processing.telemetry;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisOperations;
import org.springframework.data.redis.core.SessionCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Dedup theo messageId (Redis telemetry-dedup, TTL 6h — xem DATABASE.md §5).
 *
 * Tách làm hai bước {@link #findDuplicates} (đọc) và {@link #mark} (ghi) thay vì một lệnh SETNX
 * gộp: SETNX gộp đánh dấu TRƯỚC khi ghi InfluxDB, nên ghi lỗi là messageId đã bị đánh dấu và lần
 * đọc lại sẽ bị chặn oan — mất số đo vĩnh viễn trong 6 tiếng. Với xử lý theo lô, một lần Influx
 * timeout sẽ ăn cả 500 message chứ không phải một.
 *
 * Đổi lại có khe đua: hai consumer cùng nhận một messageId có thể cùng vượt qua bước đọc và cùng
 * ghi. Vô hại — InfluxDB idempotent theo tag + timestamp nên hai lần ghi ra đúng một điểm, và
 * uq_alert_open chặn alert trùng.
 */
@Service
@RequiredArgsConstructor
public class TelemetryDedupService {

    private static final String KEY_PREFIX = "telemetry-dedup:";
    private static final String MARK_VALUE = "1";

    private final StringRedisTemplate redisTemplate;

    @Value("${app.redis.telemetry-dedup-ttl-hours}")
    private long ttlHours;

    /** MGET 1 vòng cho cả lô thay vì N lần EXISTS. Trả về tập messageId đã thấy trước đó. */
    public Set<String> findDuplicates(List<DedupKey> batch) {
        if (batch.isEmpty()) {
            return Set.of();
        }
        List<String> values = redisTemplate.opsForValue()
                .multiGet(batch.stream().map(this::key).toList());
        Set<String> duplicates = new HashSet<>();
        for (int i = 0; i < batch.size(); i++) {
            if (values != null && values.get(i) != null) {
                duplicates.add(batch.get(i).messageId());
            }
        }
        return duplicates;
    }

    /** Đánh dấu cả lô trong 1 vòng pipeline, gọi SAU khi đã ghi InfluxDB xong. */
    public void markAll(List<DedupKey> batch) {
        if (!batch.isEmpty()) {
            mark(batch.stream().map(this::key).toList());
        }
    }

    /** Một lô có thể trộn nhiều tenant, nên khoá dedup phải đi theo cặp chứ không phải 1 tenantId. */
    public record DedupKey(Long tenantId, String messageId) {
    }

    @SuppressWarnings("unchecked")
    private void mark(List<String> keys) {
        Duration ttl = Duration.ofHours(ttlHours);
        redisTemplate.executePipelined(new SessionCallback<Object>() {
            @Override
            public <K, V> Object execute(RedisOperations<K, V> operations) {
                RedisOperations<String, String> ops = (RedisOperations<String, String>) operations;
                for (String key : keys) {
                    ops.opsForValue().setIfAbsent(key, MARK_VALUE, ttl);
                }
                return null;
            }
        });
    }

    private String key(DedupKey k) {
        return key(k.tenantId(), k.messageId());
    }

    private String key(Long tenantId, String messageId) {
        return KEY_PREFIX + tenantId + ":" + messageId;
    }
}
