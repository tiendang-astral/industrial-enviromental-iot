package com.corp.iot.processing.telemetry;

import com.corp.iot.processing.repository.GatewayRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

/**
 * Ghi {@code gateway.last_seen_at} có tiết chế.
 *
 * Trước đây mỗi số đo là một lệnh UPDATE: 1000 gateway x 8 chân / 10s = ~800 UPDATE mỗi giây vào
 * Postgres chỉ để cập nhật một cái đồng hồ mà người dùng không phân biệt nổi chênh lệch 30 giây.
 * Cờ Redis SETNX gom chúng lại còn ~1 lệnh mỗi gateway mỗi 30 giây.
 *
 * RÀNG BUỘC: mọi tính năng đọc {@code last_seen_at} để suy ra "gateway mất kết nối" phải dùng
 * ngưỡng >= 3 lần khoảng tiết chế này (>= 90 giây), nếu không sẽ báo giả.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GatewayLastSeenService {

    private static final String KEY_PREFIX = "gw-seen:";

    private final StringRedisTemplate redisTemplate;
    private final GatewayRepository gatewayRepository;

    @Value("${app.redis.gateway-seen-throttle-seconds}")
    private long throttleSeconds;

    public void touch(Long gatewayId) {
        if (shouldWrite(gatewayId)) {
            gatewayRepository.touchLastSeenAt(gatewayId, Instant.now());
        }
    }

    // Redis hỏng -> ghi thẳng như hành vi cũ, thà tốn còn hơn để last_seen_at đứng im.
    private boolean shouldWrite(Long gatewayId) {
        try {
            return Boolean.TRUE.equals(redisTemplate.opsForValue()
                    .setIfAbsent(KEY_PREFIX + gatewayId, "1", Duration.ofSeconds(throttleSeconds)));
        } catch (Exception e) {
            log.warn("Không đặt được cờ gw-seen cho gatewayId={}, ghi thẳng", gatewayId, e);
            return true;
        }
    }
}
