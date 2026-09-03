package com.corp.iot.backend.platformdashboard.dto;

import java.util.List;

public record PlatformDashboardSummaryResponse(
        long totalTenantUsers,
        long totalTenants,
        long totalDevices,
        long totalDataSources,
        List<TenantStatsResponse> tenants
) {
}
