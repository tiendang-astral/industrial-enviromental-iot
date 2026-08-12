package com.corp.iot.ingestion.service;

import com.corp.iot.ingestion.entity.Gateway;
import com.corp.iot.ingestion.repository.GatewayRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

// Resolve mac_address -> (gatewayId, tenantId, tenantNodeId), cache Redis gw-resolve
// (xem DATABASE.md §5), fallback đọc Postgres read-only khi cache miss (quyết định
// PLAN.md Phase 3: Ingestion chỉ đọc Postgres, không gọi HTTP sang x-backend).
@Slf4j
@Service
@RequiredArgsConstructor
public class GatewayResolverService {

    private static final String CACHE_KEY_PREFIX = "gw-resolve:";

    private final StringRedisTemplate redisTemplate;
    private final GatewayRepository gatewayRepository;

    @Value("${app.redis.gw-resolve-ttl-minutes}")
    private long ttlMinutes;

    public Optional<ResolvedGateway> resolve(String macAddress) {
        String cacheKey = CACHE_KEY_PREFIX + macAddress;
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return toResult(ResolvedGateway.fromCacheValue(cached), macAddress);
        }

        Optional<Gateway> gateway = gatewayRepository.findByMacAddressAndDeletedAtIsNull(macAddress);
        if (gateway.isEmpty()) {
            log.warn("Gateway not found for mac_address={}, dropping message", macAddress);
            return Optional.empty();
        }

        ResolvedGateway resolved = new ResolvedGateway(
                gateway.get().getId(), gateway.get().getTenantId(), gateway.get().getTenantNodeId());
        redisTemplate.opsForValue().set(cacheKey, resolved.toCacheValue(), Duration.ofMinutes(ttlMinutes));
        return toResult(resolved, macAddress);
    }

    private Optional<ResolvedGateway> toResult(ResolvedGateway resolved, String macAddress) {
        if (resolved.tenantNodeId() == null) {
            log.warn("Gateway mac_address={} has no tenant_node_id (orphan), dropping message", macAddress);
            return Optional.empty();
        }
        return Optional.of(resolved);
    }
}
