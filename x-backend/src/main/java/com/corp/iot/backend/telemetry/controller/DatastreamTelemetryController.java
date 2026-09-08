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

// Số đo của ĐÚNG một kênh. Hai endpoint kia lấy theo lô (mọi chân của 1 gateway, mọi kênh của 1
// nguồn) nên hợp với trang chi tiết; widget biểu đồ trên dashboard thì ngược lại — nó chỉ cầm
// datastreamId và không tra ngược ra được nguồn cha.
@RestController
@RequestMapping("/api/v1/datastreams/{id}/telemetry")
@RequiredArgsConstructor
public class DatastreamTelemetryController {

    private static final int DEFAULT_RANGE_MINUTES = 1440;
    private static final int MAX_RANGE_MINUTES = 10080; // 7 ngày — khớp retention bucket "raw" (DATABASE.md §4)

    private final TelemetryService telemetryService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER') and @nodeScope.canAccessDatastream(#id)")
    public ApiResponse<DatastreamTelemetryResponse> get(
            @PathVariable Long id,
            @RequestParam(required = false) Integer rangeMinutes
    ) {
        int range = Math.clamp(rangeMinutes != null ? rangeMinutes : DEFAULT_RANGE_MINUTES, 1, MAX_RANGE_MINUTES);
        return ApiResponse.of(telemetryService.getDatastreamTelemetry(id, range));
    }
}
