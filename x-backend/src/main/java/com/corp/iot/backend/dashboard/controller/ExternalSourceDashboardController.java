package com.corp.iot.backend.dashboard.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.dashboard.dto.DashboardResponse;
import com.corp.iot.backend.dashboard.dto.UpdateDashboardRequest;
import com.corp.iot.backend.dashboard.service.DashboardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

// Board riêng theo nguồn (song song DashboardController theo node) — xem DATABASE.md § dashboard.
@RestController
@RequestMapping("/api/v1/external-sources/{sourceId}/dashboard")
@RequiredArgsConstructor
public class ExternalSourceDashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER') and @nodeScope.canAccessSource(#sourceId)")
    public ApiResponse<DashboardResponse> get(@PathVariable Long sourceId) {
        return ApiResponse.of(dashboardService.getOrCreateForSource(sourceId));
    }

    @PutMapping
    @PreAuthorize("hasAnyAuthority('TENANT_ADMIN','MANAGER','OPERATOR','VIEWER') and @nodeScope.canAccessSource(#sourceId)")
    public ApiResponse<DashboardResponse> save(@PathVariable Long sourceId, @Valid @RequestBody UpdateDashboardRequest request) {
        return ApiResponse.of(dashboardService.saveForSource(sourceId, request));
    }
}
