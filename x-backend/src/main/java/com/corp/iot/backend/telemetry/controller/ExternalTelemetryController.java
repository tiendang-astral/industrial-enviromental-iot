package com.corp.iot.backend.telemetry.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.telemetry.dto.DatastreamTelemetryResponse;
import com.corp.iot.backend.telemetry.service.TelemetryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// Số đo mọi kênh của 1 nguồn trong MỘT lần gọi — trang tổng quan nguồn cần vẽ sparkline cho
// từng kênh, gọi lẻ từng kênh sẽ thành N request cho một màn hình.
@RestController
@RequestMapping("/api/v1/external-sources/{sourceId}/telemetry")
@RequiredArgsConstructor
public class ExternalTelemetryController {

    private static final int DEFAULT_RANGE_MINUTES = 720;
    private static final int MAX_RANGE_MINUTES = 10080; // 7 ngày — khớp retention bucket "raw" (DATABASE.md §4)

    private final TelemetryService telemetryService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER') and @nodeScope.canAccessSource(#sourceId)")
    public ApiResponse<List<DatastreamTelemetryResponse>> get(
            @PathVariable Long sourceId,
            @RequestParam(required = false) Integer rangeMinutes
    ) {
        int range = Math.clamp(rangeMinutes != null ? rangeMinutes : DEFAULT_RANGE_MINUTES, 1, MAX_RANGE_MINUTES);
        return ApiResponse.of(telemetryService.getExternalSourceTelemetry(sourceId, range));
    }
}
