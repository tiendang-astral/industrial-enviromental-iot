package com.corp.iot.backend.devicestats.service;

import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.tenant.TenantContext;
import com.corp.iot.backend.devicestats.dto.DeviceSummaryResponse;
import com.corp.iot.backend.gateway.entity.Gateway;
import com.corp.iot.backend.gateway.repository.GatewayRepository;
import com.corp.iot.backend.tenantnode.entity.TenantNode;
import com.corp.iot.backend.tenantnode.repository.TenantNodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

// Danh sách gateway trong subtree của 1 node (path ltree) kèm trạng thái online — dùng
// cho widget DEVICE_LIST/DEVICES_ONLINE (xem PLAN.md Phase 4). online = last_seen_at
// trong ngưỡng cấu hình, không có realtime event riêng cho online/offline nên FE phải
// polling endpoint này.
@Service
@RequiredArgsConstructor
public class DeviceStatsServiceImpl implements DeviceStatsService {

    private final TenantNodeRepository tenantNodeRepository;
    private final GatewayRepository gatewayRepository;

    @Value("${app.device.online-threshold-minutes}")
    private long onlineThresholdMinutes;

    @Override
    public List<DeviceSummaryResponse> listDevices(Long tenantNodeId) {
        TenantNode node = tenantNodeRepository.findById(tenantNodeId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NODE_NOT_FOUND", "Không tìm thấy node"));
        List<Long> subtreeNodeIds = tenantNodeRepository.findDescendantIdsIncludingSelf(TenantContext.getTenantId(), node.getPath());
        Instant threshold = Instant.now().minus(Duration.ofMinutes(onlineThresholdMinutes));

        return gatewayRepository.findByTenantNodeIdIn(subtreeNodeIds).stream()
                .map(gateway -> toSummary(gateway, threshold))
                .toList();
    }

    private DeviceSummaryResponse toSummary(Gateway gateway, Instant threshold) {
        boolean online = gateway.getLastSeenAt() != null && gateway.getLastSeenAt().isAfter(threshold);
        return new DeviceSummaryResponse(gateway.getId(), gateway.getName(), gateway.getMacAddress(), gateway.getLastSeenAt(), online);
    }
}
