package com.corp.iot.backend.devicestats.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.devicestats.dto.DeviceSummaryResponse;
import com.corp.iot.backend.devicestats.service.DeviceStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class DeviceStatsController {

    private final DeviceStatsService deviceStatsService;

    @GetMapping("/api/v1/tenant-nodes/{nodeId}/devices")
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER') and @nodeScope.canAccess(#nodeId)")
    public ApiResponse<List<DeviceSummaryResponse>> list(@PathVariable Long nodeId) {
        return ApiResponse.of(deviceStatsService.listDevices(nodeId));
    }
}
