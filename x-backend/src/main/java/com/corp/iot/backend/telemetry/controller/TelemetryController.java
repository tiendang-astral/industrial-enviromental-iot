package com.corp.iot.backend.telemetry.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.telemetry.dto.PinTelemetryResponse;
import com.corp.iot.backend.telemetry.service.TelemetryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/gateways/{gatewayId}/telemetry")
@RequiredArgsConstructor
public class TelemetryController {

    private static final int DEFAULT_RANGE_MINUTES = 60;
    private static final int MAX_RANGE_MINUTES = 10080; // 7 ngày — khớp retention bucket "raw" (DATABASE.md §4)

    private final TelemetryService telemetryService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER') and @nodeScope.canAccessGateway(#gatewayId)")
    public ApiResponse<List<PinTelemetryResponse>> get(
            @PathVariable Long gatewayId,
            @RequestParam(required = false) Integer rangeMinutes
    ) {
        int range = Math.clamp(rangeMinutes != null ? rangeMinutes : DEFAULT_RANGE_MINUTES, 1, MAX_RANGE_MINUTES);
        return ApiResponse.of(telemetryService.getGatewayTelemetry(gatewayId, range));
    }
}
