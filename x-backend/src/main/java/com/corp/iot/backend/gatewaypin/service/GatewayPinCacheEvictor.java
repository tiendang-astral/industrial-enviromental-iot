package com.corp.iot.backend.gatewaypin.service;

import com.corp.iot.backend.gatewaypin.entity.GatewayPin;
import com.corp.iot.backend.gatewaypin.repository.GatewayPinRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Xoá cache cấu hình chân của x-processing-service ngay khi pin đổi
 * (key {@code pin-resolve:{gatewayId}:{pinType}:{pinNumber}}, xem DATABASE.md §5).
 *
 * Chỉ cần gọi khi pin ĐÃ tồn tại bị đổi hoặc xoá — {@code PinResolverService} không cache trường
 * hợp "không tìm thấy", nên tạo pin mới không để lại giá trị cũ nào phải dọn.
 *
 * Field duy nhất trong cache mà người dùng đổi được là {@code enabled}: {@code metric_id} của
 * gateway_pin không có endpoint sửa và {@code datastream.metric_id} là updatable=false.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GatewayPinCacheEvictor {

    private final GatewayPinRepository gatewayPinRepository;
    private final StringRedisTemplate redisTemplate;

    public void evict(GatewayPin pin) {
        delete(List.of(key(pin)));
    }

    /** Xoá gateway (soft delete) — mọi pin của nó không còn được ghi nữa. */
    public void evictByGateway(Long gatewayId) {
        delete(gatewayPinRepository.findByGatewayId(gatewayId).stream().map(this::key).toList());
    }

    private String key(GatewayPin pin) {
        return "pin-resolve:%d:%s:%d".formatted(pin.getGatewayId(), pin.getType().name(), pin.getPinNumber());
    }

    private void delete(List<String> keys) {
        if (keys.isEmpty()) {
            return;
        }
        try {
            redisTemplate.delete(keys);
        } catch (Exception e) {
            // Redis hỏng chỉ làm thay đổi chậm hiệu lực tới hết TTL 60s, không sai kết quả.
            log.warn("Không xoá được cache pin-resolve: {}", keys, e);
        }
    }
}
