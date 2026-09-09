package com.corp.iot.processing.telemetry;

import com.corp.iot.processing.entity.Datastream;
import com.corp.iot.processing.entity.GatewayPin;
import com.corp.iot.processing.entity.Metric;
import com.corp.iot.processing.entity.SourceType;
import com.corp.iot.processing.repository.DatastreamRepository;
import com.corp.iot.processing.repository.GatewayPinRepository;
import com.corp.iot.processing.repository.MetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Cache cấu hình chân cảm biến, cùng khuôn với {@code GatewayResolverService} bên
 * x-ingestion-service (cache Redis, miss thì đọc Postgres rồi ghi lại).
 *
 * Chỉ phục vụ luồng GATEWAY. Luồng external chạy theo cron, tần suất thấp, không đáng đổi lấy
 * rủi ro cache sai.
 *
 * TTL để 60s chứ không phải 10 phút: {@code enabled} là field người dùng đổi được từ UI, nên nếu
 * sót một chỗ xoá cache ở x-backend thì thiệt hại giới hạn trong 1 phút. {@code metricCode} thì
 * không thể lệch — gateway_pin.metric_id không có đường sửa và datastream.metric_id là
 * updatable=false.
 *
 * KHÔNG cache trường hợp không tìm thấy: cache âm sẽ bắt x-backend phải xoá key cả khi TẠO pin mới.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PinResolverService {

    private static final String KEY_PREFIX = "pin-resolve:";
    private static final String DIRECTION_INPUT = "INPUT";

    private final StringRedisTemplate redisTemplate;
    private final GatewayPinRepository gatewayPinRepository;
    private final MetricRepository metricRepository;
    private final DatastreamRepository datastreamRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.redis.pin-resolve-ttl-seconds}")
    private long ttlSeconds;

    /**
     * Tra cấu hình chân cho cả lô bằng MỘT lệnh MGET.
     *
     * Khoá trùng được gộp trước khi hỏi Redis: một lô 500 số đo của 1 gateway 8 chân chỉ có 8 khoá
     * khác nhau, mỗi khoá lặp ~62 lần. Nên đây không chỉ là gộp round-trip mà còn giảm hẳn số lệnh.
     *
     * Khoá không resolve được KHÔNG có mặt trong map trả về — caller phải coi đó là "bỏ qua số đo
     * này" (log + skip), giống hệt hành vi cũ khi không tìm thấy pin.
     */
    public Map<PinKey, ResolvedPin> resolveAll(List<PinKey> keys) {
        if (keys.isEmpty()) {
            return Map.of();
        }
        List<PinKey> distinct = keys.stream().distinct().toList();
        List<String> cached = readCacheAll(distinct.stream().map(PinResolverService::cacheKey).toList());

        Map<PinKey, ResolvedPin> out = new HashMap<>(distinct.size());
        for (int i = 0; i < distinct.size(); i++) {
            PinKey key = distinct.get(i);
            String raw = (cached != null && i < cached.size()) ? cached.get(i) : null;
            ResolvedPin pin = raw == null ? null : deserialize(raw);
            if (pin == null) {
                // Không cache "không tìm thấy" (xem javadoc lớp) nên miss ở đây luôn phải hỏi Postgres.
                pin = loadFromDb(key.gatewayId(), key.pinType(), key.pinNumber()).orElse(null);
                if (pin != null) {
                    writeCache(cacheKey(key), pin);
                }
            }
            if (pin != null) {
                out.put(key, pin);
            }
        }
        return out;
    }

    // Redis hỏng -> null để cả lô rơi xuống Postgres, KHÔNG ném: error handler retry vô hạn nên
    // một cú nấc Redis sẽ treo partition.
    private List<String> readCacheAll(List<String> cacheKeys) {
        try {
            return redisTemplate.opsForValue().multiGet(cacheKeys);
        } catch (Exception e) {
            log.warn("Không đọc được cache pin-resolve ({} khoá), đọc Postgres", cacheKeys.size(), e);
            return null;
        }
    }

    private static String cacheKey(PinKey key) {
        return KEY_PREFIX + key.gatewayId() + ":" + key.pinType() + ":" + key.pinNumber();
    }

    public record PinKey(Long gatewayId, String pinType, Integer pinNumber) {
    }

    private Optional<ResolvedPin> loadFromDb(Long gatewayId, String pinType, Integer pinNumber) {
        Optional<GatewayPin> pin = gatewayPinRepository.findByGatewayIdAndTypeAndPinNumberAndDirection(
                gatewayId, pinType, pinNumber, DIRECTION_INPUT);
        if (pin.isEmpty()) {
            return Optional.empty();
        }
        String metricCode = pin.get().getMetricId() == null ? null
                : metricRepository.findById(pin.get().getMetricId()).map(Metric::getCode).orElse(null);
        if (metricCode == null) {
            return Optional.empty();
        }
        Datastream datastream = datastreamRepository
                .findBySourceTypeAndSourceId(SourceType.GATEWAY_PIN, pin.get().getId())
                .orElse(null);
        return Optional.of(new ResolvedPin(
                pin.get().getId(),
                metricCode,
                pin.get().getMetricId(),
                pin.get().isEnabled(),
                datastream == null ? null : datastream.getId(),
                datastream == null ? null : datastream.getName()));
    }

    private void writeCache(String key, ResolvedPin pin) {
        try {
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(pin), Duration.ofSeconds(ttlSeconds));
        } catch (Exception e) {
            log.warn("Không ghi được cache pin-resolve key={}", key, e);
        }
    }

    private ResolvedPin deserialize(String value) {
        try {
            return objectMapper.readValue(value, ResolvedPin.class);
        } catch (Exception e) {
            log.warn("Giá trị cache pin-resolve hỏng, bỏ qua: {}", value, e);
            return null;
        }
    }
}
