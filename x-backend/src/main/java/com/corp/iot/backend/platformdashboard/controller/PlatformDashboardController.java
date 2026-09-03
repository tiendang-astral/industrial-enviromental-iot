package com.corp.iot.backend.platformdashboard.controller;

import com.corp.iot.backend.common.dto.ApiResponse;
import com.corp.iot.backend.platformdashboard.dto.PlatformDashboardSummaryResponse;
import com.corp.iot.backend.platformdashboard.dto.TrendPointResponse;
import com.corp.iot.backend.platformdashboard.dto.TrendRange;
import com.corp.iot.backend.platformdashboard.service.PlatformDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/platform/dashboard")
@PreAuthorize("hasAuthority('PLATFORM_ADMIN')")
@RequiredArgsConstructor
public class PlatformDashboardController {

    private final PlatformDashboardService platformDashboardService;

    @GetMapping("/summary")
    public ApiResponse<PlatformDashboardSummaryResponse> summary() {
        return ApiResponse.of(platformDashboardService.getSummary());
    }

    @GetMapping("/user-trend")
    public ApiResponse<List<TrendPointResponse>> userTrend(@RequestParam(defaultValue = "7d") String range) {
        return ApiResponse.of(platformDashboardService.getUserTrend(TrendRange.fromParam(range)));
    }

    @GetMapping("/tenant-trend")
    public ApiResponse<List<TrendPointResponse>> tenantTrend(@RequestParam(defaultValue = "7d") String range) {
        return ApiResponse.of(platformDashboardService.getTenantTrend(TrendRange.fromParam(range)));
    }
}
